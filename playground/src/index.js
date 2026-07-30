const path = require('path');
const fs = require('fs');
const express = require('express');
const { createBot } = require('trysoftwacloudapi');

const playgroundEnv = path.join(__dirname, '../.env');
const rootEnv = path.join(__dirname, '../../.env');
require('dotenv').config({
  path: fs.existsSync(playgroundEnv) ? playgroundEnv : rootEnv,
});

const PORT = Number(process.env.PORT) || 3000;
const WEBHOOK_PATH = (process.env.WEBHOOK_PATH || '/webhook/whatsapp')
  .trim()
  .replace(/^['"]|['"]$/g, '');

/** @type {Set<import('express').Response>} */
const sseClients = new Set();

/** @type {object | null} */
let lastCallEvent = null;
/** @type {object[]} */
const recentMessages = [];
const RECENT_LIMIT = 40;

/** @type {Map<string, object>} */
const pendingOffers = new Map();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}

function pushMessage(msg) {
  const entry = {
    from: msg.from,
    name: msg.name,
    id: msg.id,
    type: msg.type,
    data: msg.data,
    group_id: msg.group_id,
    timestamp: msg.timestamp,
    at: Date.now(),
  };
  recentMessages.unshift(entry);
  if (recentMessages.length > RECENT_LIMIT) recentMessages.length = RECENT_LIMIT;
  broadcast('message', entry);
  return entry;
}

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[playground]', ...args);
}

function sendError(res, err) {
  const status = err?.error?.code ? 400 : 400;
  res.status(status).json(err?.error ? err : (err?.message ? { error: err.message } : err));
}

function recipient(req, toDefault) {
  return req.body?.to || toDefault;
}

(async () => {
  try {
    const from = process.env.FROM_PHONE_NUMBER_ID;
    const token = process.env.ACCESS_TOKEN;
    const version = process.env.VERSION;
    const toDefault = process.env.TO;
    const webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

    if (!from || !token || !webhookVerifyToken) {
      throw new Error('Missing env variables: FROM_PHONE_NUMBER_ID, ACCESS_TOKEN, WEBHOOK_VERIFY_TOKEN');
    }

    const bot = createBot(from, token, { version });

    const { app } = await bot.startExpressServer({
      port: PORT,
      webhookPath: WEBHOOK_PATH,
      webhookVerifyToken,
      useMiddleware: (serverApp) => {
        serverApp.use(express.static(path.join(__dirname, '../public')));

        serverApp.get('/api/health', (_req, res) => {
          res.json({
            ok: true,
            phoneNumberId: from,
            defaultTo: toDefault || null,
            webhookPath: WEBHOOK_PATH,
            pendingOffers: [...pendingOffers.keys()],
            lastCallEvent,
            recentMessageCount: recentMessages.length,
          });
        });

        serverApp.get('/api/events', (req, res) => {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders?.();
          res.write(`event: hello\ndata: ${JSON.stringify({
            ok: true,
            defaultTo: toDefault || null,
            webhookPath: WEBHOOK_PATH,
          })}\n\n`);
          if (lastCallEvent) {
            res.write(`event: call\ndata: ${JSON.stringify(lastCallEvent)}\n\n`);
          }
          recentMessages.slice(0, 10).reverse().forEach((msg) => {
            res.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`);
          });
          sseClients.add(res);
          req.on('close', () => sseClients.delete(res));
        });

        serverApp.get('/api/inbox', (_req, res) => {
          res.json({ messages: recentMessages });
        });

        // ── Calling ──────────────────────────────────────────────
        serverApp.get('/api/call-settings', async (_req, res) => {
          try {
            res.json(await bot.getCallSettings());
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/call-settings/enable', async (_req, res) => {
          try {
            res.json(await bot.updateCallSettings({
              status: 'ENABLED',
              call_icon_visibility: 'DEFAULT',
              callback_permission_status: 'ENABLED',
            }));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.get('/api/call-permissions', async (req, res) => {
          try {
            const userWaId = String(req.query.userWaId || toDefault || '');
            if (!userWaId) {
              res.status(400).json({ error: 'userWaId required' });
              return;
            }
            res.json(await bot.getCallPermissions({ userWaId }));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/permission-request', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendCallPermissionRequest(
              user,
              req.body?.bodyText || 'We would like to call you on WhatsApp. Please allow the call.',
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/voice-call-button', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendVoiceCall(
              user,
              req.body?.bodyText || 'Tap to call us on WhatsApp',
              {
                displayText: req.body?.displayText || 'Call now',
                ttlMinutes: req.body?.ttlMinutes || 10080,
              },
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/calls/accept', async (req, res) => {
          try {
            const { callId, sdp, sdpType = 'answer' } = req.body || {};
            if (!callId || !sdp) {
              res.status(400).json({ error: 'callId and sdp required' });
              return;
            }
            const session = { sdp_type: sdpType, sdp };
            await bot.preAcceptCall(callId, session);
            const result = await bot.acceptCall(callId, session, {
              bizOpaqueCallbackData: req.body?.bizOpaqueCallbackData,
            });
            pendingOffers.delete(callId);
            res.json(result);
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/calls/reject', async (req, res) => {
          try {
            const { callId } = req.body || {};
            if (!callId) {
              res.status(400).json({ error: 'callId required' });
              return;
            }
            const result = await bot.rejectCall(callId);
            pendingOffers.delete(callId);
            res.json(result);
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/calls/terminate', async (req, res) => {
          try {
            const { callId } = req.body || {};
            if (!callId) {
              res.status(400).json({ error: 'callId required' });
              return;
            }
            const result = await bot.terminateCall(callId);
            pendingOffers.delete(callId);
            res.json(result);
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/calls/connect', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            const { sdp, sdpType = 'offer' } = req.body || {};
            if (!user || !sdp) {
              res.status(400).json({ error: 'to and sdp required' });
              return;
            }
            res.json(await bot.connectCall(user, {
              sdp_type: sdpType,
              sdp,
            }, {
              bizOpaqueCallbackData: req.body?.bizOpaqueCallbackData || 'playground',
            }));
          } catch (err) {
            sendError(res, err);
          }
        });

        // ── Messaging ────────────────────────────────────────────
        serverApp.post('/api/messages/text', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            const text = req.body?.text;
            if (!user || !text) {
              res.status(400).json({ error: 'to and text required' });
              return;
            }
            res.json(await bot.sendText(user, text, {
              preview_url: Boolean(req.body?.previewUrl),
              recipientType: req.body?.recipientType,
              context: req.body?.messageId
                ? { message_id: req.body.messageId }
                : undefined,
            }));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/template', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            const name = req.body?.name || 'hello_world';
            const languageCode = req.body?.languageCode || 'en_US';
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendTemplate(
              user,
              name,
              languageCode,
              req.body?.components,
              { recipientType: req.body?.recipientType },
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/image', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            const url = req.body?.url || 'https://picsum.photos/400/300';
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendImage(user, url, {
              caption: req.body?.caption || 'Playground image',
              recipientType: req.body?.recipientType,
            }));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/location', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendLocation(
              user,
              Number(req.body?.latitude ?? -17.8292),
              Number(req.body?.longitude ?? 31.0522),
              {
                name: req.body?.name || 'Harare',
                address: req.body?.address || 'Harare, Zimbabwe',
              },
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/buttons', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendReplyButtons(
              user,
              req.body?.bodyText || 'How can we help you?',
              req.body?.buttons || {
                support: 'Support',
                sales: 'Sales',
                pricing: 'Pricing',
              },
              {
                footerText: req.body?.footerText || 'Choose an option',
                header: { type: 'text', text: req.body?.headerText || 'Menu' },
              },
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/list', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendList(
              user,
              req.body?.buttonName || 'View options',
              req.body?.bodyText || 'Pick a topic',
              req.body?.sections || {
                Help: [
                  { id: 'faq', title: 'FAQ', description: 'Common questions' },
                  { id: 'agent', title: 'Talk to agent', description: 'Human support' },
                ],
              },
              {
                footerText: req.body?.footerText || 'Playground list',
                header: { type: 'text', text: req.body?.headerText || 'Options' },
              },
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/cta', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendCtaUrl(
              user,
              req.body?.bodyText || 'Check out our site',
              req.body?.displayText || 'Visit site',
              req.body?.url || 'https://example.com',
              { footerText: req.body?.footerText || 'Opens in browser' },
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/location-request', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            if (!user) {
              res.status(400).json({ error: 'to required' });
              return;
            }
            res.json(await bot.sendLocationRequest(
              user,
              req.body?.bodyText || 'Please share your location',
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/reaction', async (req, res) => {
          try {
            const user = recipient(req, toDefault);
            const messageId = req.body?.messageId;
            const emoji = req.body?.emoji || '👍';
            if (!user || !messageId) {
              res.status(400).json({ error: 'to and messageId required' });
              return;
            }
            res.json(await bot.sendReaction(user, messageId, emoji));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/typing', async (req, res) => {
          try {
            const messageId = req.body?.messageId;
            if (!messageId) {
              res.status(400).json({ error: 'messageId required (inbound wamid)' });
              return;
            }
            res.json(await bot.sendTypingIndicator(messageId));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/messages/read', async (req, res) => {
          try {
            const messageId = req.body?.messageId;
            if (!messageId) {
              res.status(400).json({ error: 'messageId required' });
              return;
            }
            res.json(await bot.markRead(messageId));
          } catch (err) {
            sendError(res, err);
          }
        });

        // ── Groups ───────────────────────────────────────────────
        serverApp.get('/api/groups', async (_req, res) => {
          try {
            res.json(await bot.listGroups({ limit: 20 }));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/groups', async (req, res) => {
          try {
            const subject = req.body?.subject;
            if (!subject) {
              res.status(400).json({ error: 'subject required' });
              return;
            }
            res.json(await bot.createGroup({
              subject,
              description: req.body?.description,
              joinApprovalMode: req.body?.joinApprovalMode || 'auto_approve',
            }));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.get('/api/groups/:groupId', async (req, res) => {
          try {
            res.json(await bot.getGroup(req.params.groupId, [
              'subject',
              'description',
              'participants',
              'join_approval_mode',
              'total_participant_count',
            ]));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.delete('/api/groups/:groupId', async (req, res) => {
          try {
            res.json(await bot.deleteGroup(req.params.groupId));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.get('/api/groups/:groupId/invite-link', async (req, res) => {
          try {
            res.json(await bot.getInviteLink(req.params.groupId));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/groups/:groupId/invite-link/reset', async (req, res) => {
          try {
            res.json(await bot.resetInviteLink(req.params.groupId));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/groups/:groupId/message', async (req, res) => {
          try {
            const text = req.body?.text || 'Hello group from playground';
            res.json(await bot.sendText(req.params.groupId, text, {
              recipientType: 'group',
            }));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/groups/:groupId/pin', async (req, res) => {
          try {
            const { messageId, expirationDays = 7 } = req.body || {};
            if (!messageId) {
              res.status(400).json({ error: 'messageId required' });
              return;
            }
            res.json(await bot.pinGroupMessage(
              req.params.groupId,
              messageId,
              Number(expirationDays),
            ));
          } catch (err) {
            sendError(res, err);
          }
        });

        serverApp.post('/api/groups/:groupId/unpin', async (req, res) => {
          try {
            const { messageId } = req.body || {};
            if (!messageId) {
              res.status(400).json({ error: 'messageId required' });
              return;
            }
            res.json(await bot.unpinGroupMessage(req.params.groupId, messageId));
          } catch (err) {
            sendError(res, err);
          }
        });
      },
    });

    bot.on('calls', (event) => {
      const call = event?.data?.calls?.[0];
      if (!call) {
        log('calls webhook without call object', event);
        return;
      }

      const payload = {
        callId: call.id,
        from: call.from,
        to: call.to,
        event: call.event,
        direction: call.direction,
        status: call.status,
        duration: call.duration,
        sdp: call.session?.sdp,
        sdpType: call.session?.sdp_type,
        raw: call,
        at: Date.now(),
      };

      lastCallEvent = payload;
      log('call event', call.event, call.id, call.direction || '');

      if (call.event === 'connect' && call.session?.sdp) {
        pendingOffers.set(call.id, call);
      }
      if (call.event === 'terminate') {
        pendingOffers.delete(call.id);
      }

      broadcast('call', payload);
    });

    bot.on('call_permission_reply', (msg) => {
      log('permission reply', msg.from, msg.data);
      broadcast('permission', {
        from: msg.from,
        data: msg.data,
        at: Date.now(),
      });
      pushMessage(msg);
    });

    bot.on('message', (msg) => {
      log('message', msg.type, msg.from, msg.group_id || '');
      pushMessage(msg);
    });

    [
      'group_lifecycle_update',
      'group_participants_update',
      'group_settings_update',
      'group_status_update',
    ].forEach((field) => {
      bot.on(field, (event) => {
        log(field, event?.data?.group_id || event?.data);
        broadcast('group', {
          field,
          data: event?.data,
          at: Date.now(),
        });
      });
    });

    // eslint-disable-next-line no-console
    console.log(`Playground UI: http://localhost:${PORT}/`);
    // eslint-disable-next-line no-console
    console.log(`Webhook path: ${WEBHOOK_PATH} (subscribe to messages + calls + group_* fields)`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
})();

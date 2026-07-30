import express, { Application } from 'express';
import { Server } from 'http';
import PubSub from 'pubsub-js';
import { FreeFormObject } from './utils/misc';
import { PubSubEvent, PubSubEvents } from './utils/pubSub';
import { CallWebhookPayload, GroupWebhookPayload, Message } from './createBot.types';

const GROUP_WEBHOOK_FIELDS = new Set([
  PubSubEvents.group_lifecycle_update,
  PubSubEvents.group_participants_update,
  PubSubEvents.group_settings_update,
  PubSubEvents.group_status_update,
]);

export interface ServerOptions {
  app?: Application;
  useMiddleware?: (app: Application) => void;
  port?: number;
  webhookPath?: string;
  webhookVerifyToken?: string;
}

export interface ExpressServer {
  server?: Server;
  app: Application;
}

export const startExpressServer = (
  options?: ServerOptions,
): Promise<ExpressServer> => new Promise((resolve) => {
  const app = options?.app || express();

  app.use(express.json());

  if (options?.useMiddleware) {
    options.useMiddleware(app);
  }

  const webhookPath = options?.webhookPath || '/webhook/whatsapp';

  function doFieldWebhook(req: any) {
    const change = req.body.entry[0].changes[0];
    const webhookField = change.field as PubSubEvent;
    const value = change.value || {};
    const fromPhoneNumberId = value.metadata?.phone_number_id
      || value.phone_number_id
      || req.body.entry[0].id;
    const fromPhoneNumber = value.metadata?.display_phone_number;

    const payload: GroupWebhookPayload | CallWebhookPayload = {
      wab_pid: fromPhoneNumberId,
      wab_number: fromPhoneNumber,
      field: webhookField,
      data: value,
    };

    [
      `bot-${fromPhoneNumberId}-${webhookField}`,
    ].forEach((e) => PubSub.publish(e, payload));
  }

  function doMessage(req: any) {
    const messages = req.body.entry[0].changes[0].value?.messages;
    if (!messages?.[0]) {
      return;
    }

    const {
      from,
      id,
      timestamp,
      type,
      group_id: groupId,
      ...rest
    } = messages[0];
    const fromPhoneNumberId = req.body.entry[0].changes[0].value.metadata.phone_number_id;
    const fromPhoneNumber = req.body.entry[0].changes[0].value.metadata.display_phone_number;

    let event: PubSubEvent | undefined;
    let data: FreeFormObject | undefined;

    switch (type) {
      case 'text':
        event = PubSubEvents.text;
        data = { text: rest.text?.body };
        break;

      case 'image':
      case 'document':
      case 'audio':
      case 'video':
      case 'sticker':
      case 'location':
      case 'order':
      case 'contacts':
      case 'reaction':
        event = PubSubEvents[type as PubSubEvent];
        data = rest[type];
        break;
      case 'interactive':
        event = rest.interactive.type;
        data = {
          ...(rest.interactive.list_reply
            || rest.interactive.button_reply
            || rest.interactive.nfm_reply
            || rest.interactive.call_permission_reply),
        };
        break;

      // Template quick-reply button (type: button) — normalize as button_reply
      case 'button':
        event = PubSubEvents.button_reply;
        data = {
          id: rest.button?.payload,
          title: rest.button?.text,
        };
        break;

      default:
        break;
    }

    if (rest.context) {
      data = {
        ...data,
        context: rest.context,
      };
    }
    const name = req.body.entry[0].changes[0].value.contacts?.[0]?.profile?.name ?? undefined;
    // eslint-disable-next-line
    const wab_pid = fromPhoneNumberId;
    // eslint-disable-next-line
    const wab_number = fromPhoneNumber;

    if (event && data) {
      const payload: Message = {
        wab_pid,
        wab_number,
        from,
        name,
        id,
        timestamp,
        type: event,
        data,
        ...(groupId ? { group_id: groupId } : {}),
      };

      [
        `bot-${fromPhoneNumberId}-message`,
        `bot-${fromPhoneNumberId}-${event}`,
      ].forEach((e) => PubSub.publish(e, payload));
    }
  }

  if (options?.webhookVerifyToken) {
    app.get(webhookPath, (req, res) => {
      if (!req.query) {
        res.sendStatus(403);
        return;
      }

      const mode = req.query['hub.mode'];
      const verifyToken = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (!mode || !verifyToken || !challenge) {
        res.sendStatus(403);
        return;
      }

      if (mode === 'subscribe' && verifyToken === options.webhookVerifyToken) {
        // eslint-disable-next-line no-console
        console.log('✔️ Webhook verified');
        res.setHeader('content-type', 'text/plain');
        res.send(challenge);
        return;
      }

      res.sendStatus(403);
    });
  }

  app.post(webhookPath, async (req, res) => {
    // Meta Messages
    if (req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      doMessage(req);
      res.sendStatus(200);
      return;
    }

    const field = req.body?.entry?.[0]?.changes?.[0]?.field;

    // Group metadata webhooks
    if (field && GROUP_WEBHOOK_FIELDS.has(field)) {
      doFieldWebhook(req);
      res.sendStatus(200);
      return;
    }

    // Calling webhooks
    if (field === PubSubEvents.calls) {
      doFieldWebhook(req);
      res.sendStatus(200);
      return;
    }

    // Cloud Server Messages
    if (req.body?.whatsapp_webhook_payload) {
      if (req.body.whatsapp_webhook_payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        req.body = req.body.whatsapp_webhook_payload;
        doMessage(req);
        res.sendStatus(200);
        return;
      }

      const wrappedField = req.body.whatsapp_webhook_payload?.entry?.[0]?.changes?.[0]?.field;
      if (
        wrappedField
        && (GROUP_WEBHOOK_FIELDS.has(wrappedField) || wrappedField === PubSubEvents.calls)
      ) {
        req.body = req.body.whatsapp_webhook_payload;
        doFieldWebhook(req);
        res.sendStatus(200);
        return;
      }

      res.sendStatus(200);
      return;
    }

    if (!req.body.object || !req.body.entry?.[0]?.changes?.[0]?.value) {
      res.sendStatus(400);
      return;
    }
    if (req.body?.entry?.[0]?.changes?.[0]?.value?.statuses) {
      res.sendStatus(202);
      return;
    }

    res.sendStatus(200);
  });

  if (options?.app) {
    resolve({ app });
    return;
  }

  const port = process.env.PORT || options?.port || 3000;
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Server running on port ${port}...`);
    resolve({ server, app });
  });
});

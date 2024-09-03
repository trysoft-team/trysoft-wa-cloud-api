import express, { Application } from 'express';
import { Server } from 'http';
import PubSub from 'pubsub-js';
import { FreeFormObject } from './utils/misc';
import { PubSubEvent, PubSubEvents } from './utils/pubSub';
import { Message } from './createBot.types';
import {Session} from "node:inspector";

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
    let contact
    let body_payload = req.body.whatsapp_webhook_payload;
    contact = req.body.contact;
    if (!body_payload.object || !body_payload.entry?.[0]?.changes?.[0]?.value) {
      res.sendStatus(400);
      return;
    }
    if (body_payload?.entry?.[0]?.changes?.[0]?.value?.statuses) {
      res.sendStatus(202);
      return;
    }

    const {
      from,
      id,
      timestamp,
      type,
      ...rest
    } = body_payload.entry[0].changes[0].value.messages[0];
    const fromPhoneNumberId = body_payload.entry[0].changes[0].value.metadata.phone_number_id;
    const fromPhoneNumber = body_payload.entry[0].changes[0].value.metadata.display_phone_number;

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
      case 'contacts':
        event = PubSubEvents[type as PubSubEvent];
        data = rest[type];
        break;

      case 'interactive':
        event = rest.interactive.type;
        data = {
          ...(rest.interactive.list_reply || rest.interactive.button_reply || rest.interactive.nfm_reply),
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

    const name = body_payload.entry[0].changes[0].value.contacts?.[0]?.profile?.name ?? undefined;
    // eslint-disable-next-line
    const wab_pid = fromPhoneNumberId;
    // eslint-disable-next-line
    const wab_number = fromPhoneNumber;

    let payload: Message
    if (event && data) {
       payload = {
        wab_pid,
        wab_number,
        from,
        name,
        id,
        timestamp,
        type: event,
        data,
      };

      // @ts-ignore
      Session['messaging_'+payload.from] = null;

      [
        `bot-${fromPhoneNumberId}-message`,
        `bot-${fromPhoneNumberId}-${event}`,
      ].forEach((e) => PubSub.publish(e, payload));

    }

    // @ts-ignore
    await checkSessionValue(payload, res);

    // @ts-ignore
    res.setHeader('content-type', 'application/json');
    // @ts-ignore
    const dataR =  Session['messaging_'+payload.from]
    // @ts-ignore
    const response = {
      "contact": {
        "status": "existing",
        "uid": contact.uid,
        "first_name": contact.first_name,
        "last_name": contact.last_name,
        "email": contact.email,
        "language_code": "en",
        "country": "Zimbabwe"
      },
      whatsapp_webhook_payload: undefined
    }
    // @ts-ignore
    response.whatsapp_webhook_payload = dataR.payload
    res.send(response);
  });

  function sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function checkSessionValue(payload:Message,res: any): Promise<void> {
    // Loop until Session[key] is no longer null
    // @ts-ignore
    while (Session['messaging_'+payload.from] === null || Session['messaging_'+payload.from] === undefined) {
      await sleep(300); // Wait for 1 second before checking again
    }
    // @ts-ignore
    resolve({})
  }

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

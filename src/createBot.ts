import isURL from 'validator/lib/isURL';
import PubSub from 'pubsub-js';
import { ICreateBot } from './createBot.types';
import {
  ContactMessage, InteractiveMessage, LocationMessage,
  MediaBase, MediaMessage, TemplateMessage,
  TextMessage, MarkRead,
} from './messages.types';
import { sendRequestHelper, getMediaDownload } from './sendRequestHelper';
import { ExpressServer, startExpressServer } from './startExpressServer';

interface PaylodBase {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
}

const payloadBase: PaylodBase = {
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
};

export const createBot: ICreateBot = (fromPhoneNumberId, accessToken, opts) => {
  let expressServer: ExpressServer;
  const sendRequest = sendRequestHelper(fromPhoneNumberId, accessToken, opts?.version);
  const sendMedia = getMediaDownload(fromPhoneNumberId, accessToken, opts?.version);

  const getMediaPayload = (urlOrObjectId: string, options?: MediaBase) => ({
    ...(isURL(urlOrObjectId) ? { link: urlOrObjectId } : { id: urlOrObjectId }),
    caption: options?.caption,
    filename: options?.filename,
  });

  return {
    startExpressServer: async (options) => {
      if (!expressServer) {
        expressServer = await startExpressServer(options);
      }

      return expressServer;
    },
    on: (event, cb) => {
      // eslint-disable-next-line
      const token = PubSub.subscribe(`bot-${fromPhoneNumberId}-${event}`, function(_, data) {
        // eslint-disable-next-line
        cb(data)
      });
      return token;
    },
    unsubscribe: (token) => PubSub.unsubscribe(token),
    markRead: (id: string) => sendRequest<MarkRead>({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: id,
    }),
    getMediaDownload: (id : string, save_path : string) => sendMedia(id, save_path),
    sendText: (to, text, options) => sendRequest<TextMessage>({
      ...payloadBase,
      to,
      type: 'text',
      text: {
        body: text,
        preview_url: options?.preview_url,
      },
    }),
    sendMessage(to, text, options) {
      return this.sendText(to, text, options);
    },
    sendImage: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...payloadBase,
      to,
      type: 'image',
      image: getMediaPayload(urlOrObjectId, options),
    }),
    sendDocument: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...payloadBase,
      to,
      type: 'document',
      document: getMediaPayload(urlOrObjectId, options),
    }),
    sendAudio: (to, urlOrObjectId) => sendRequest<MediaMessage>({
      ...payloadBase,
      to,
      type: 'audio',
      audio: getMediaPayload(urlOrObjectId),
    }),
    sendVideo: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...payloadBase,
      to,
      type: 'video',
      video: getMediaPayload(urlOrObjectId, options),
    }),
    sendSticker: (to, urlOrObjectId) => sendRequest<MediaMessage>({
      ...payloadBase,
      to,
      type: 'sticker',
      sticker: getMediaPayload(urlOrObjectId),
    }),
    sendLocation: (to, latitude, longitude, options) => sendRequest<LocationMessage>({
      ...payloadBase,
      to,
      type: 'location',
      location: {
        latitude,
        longitude,
        name: options?.name,
        address: options?.address,
      },
    }),
    sendTemplate: (to, name, languageCode, components) => sendRequest<TemplateMessage>({
      ...payloadBase,
      to,
      type: 'template',
      template: {
        name,
        language: {
          code: languageCode,
        },
        components,
      },
    }),
    sendContacts: (to, contacts) => sendRequest<ContactMessage>({
      ...payloadBase,
      to,
      type: 'contacts',
      contacts,
    }),
    sendReplyButtons: (to, bodyText, buttons, options) => sendRequest<InteractiveMessage>({
      ...payloadBase,
      to,
      type: 'interactive',
      interactive: {
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? {
            footer: { text: options?.footerText },
          }
          : {}
        ),
        header: options?.header,
        type: 'button',
        action: {
          buttons: Object.entries(buttons).map(([key, value]) => ({
            type: 'reply',
            reply: {
              title: value,
              id: key,
            },
          })),
        },
      },
    }),
    sendList: (to, buttonName, bodyText, sections, options) => sendRequest<InteractiveMessage>({
      ...payloadBase,
      to,
      type: 'interactive',
      interactive: {
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? {
            footer: { text: options?.footerText },
          }
          : {}
        ),
        header: options?.header,
        type: 'list',
        action: {
          button: buttonName,
          sections: Object.entries(sections).map(([key, value]) => ({
            title: key,
            rows: value,
          })),
        },
      },
    }),
  };
};

import isURL from 'validator/lib/isURL';
import PubSub from 'pubsub-js';
import { ICreateBot } from './createBot.types';
import {
  ContactMessage,
  InteractiveHeader,
  InteractiveMessage,
  LocationMessage,
  MarkRead,
  MediaBase,
  MediaMessage,
  PinMessage,
  ReactionMessage,
  TemplateMessage,
  TextMessage,
  TypingIndicatorMessage,
} from './messages.types';
import { createGroupsApi } from './groups';
import { getMediaDownload, sendRequestHelper } from './sendRequestHelper';
import { ExpressServer, startExpressServer } from './startExpressServer';

type RecipientType = 'individual' | 'group';

const getPayloadBase = (recipientType: RecipientType = 'individual') => ({
  messaging_product: 'whatsapp' as const,
  recipient_type: recipientType,
});

// @ts-ignore
export const createBot: ICreateBot = (fromPhoneNumberId, accessToken, opts) => {
  let expressServer: ExpressServer;

  const version = opts?.version ? opts.version : process.env.VERSION;
  // @ts-ignore
  const sendRequest = sendRequestHelper(fromPhoneNumberId, accessToken, version);
  const sendMedia = getMediaDownload(fromPhoneNumberId, accessToken, opts?.version);
  const groups = createGroupsApi(fromPhoneNumberId, accessToken, version || 'v25.0');

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
      return PubSub.subscribe(`bot-${fromPhoneNumberId}-${event}`, function (_, data) {
        // eslint-disable-next-line
        cb(data)
      });
    },
    unsubscribe: (token) => PubSub.unsubscribe(token),
    markRead: (id: string) => sendRequest<MarkRead>({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: id,
      typing_indicator: {
        type: 'text',
      },
    }),
    getMediaDownload: (id: string, save_path: string) => sendMedia(id, save_path),
    sendText: (to, text, options) => sendRequest<TextMessage>({
      ...getPayloadBase(options?.recipientType),
      to,
      type: 'text',
      context: options?.context,
      text: {
        body: text,
        preview_url: options?.preview_url,
      },
    }),
    sendMessage(to, text, options) {
      return this.sendText(to, text, options);
    },
    sendImage: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...getPayloadBase(options?.recipientType),
      to,
      type: 'image',
      context: options?.context,
      image: getMediaPayload(urlOrObjectId, options),
    }),
    sendDocument: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...getPayloadBase(options?.recipientType),
      to,
      type: 'document',
      context: options?.context,
      document: getMediaPayload(urlOrObjectId, options),
    }),
    sendAudio: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...getPayloadBase(options?.recipientType),
      to,
      type: 'audio',
      audio: getMediaPayload(urlOrObjectId),
    }),
    sendVideo: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...getPayloadBase(options?.recipientType),
      to,
      type: 'video',
      context: options?.context,
      video: getMediaPayload(urlOrObjectId, options),
    }),
    sendSticker: (to, urlOrObjectId, options) => sendRequest<MediaMessage>({
      ...getPayloadBase(options?.recipientType),
      to,
      type: 'sticker',
      sticker: getMediaPayload(urlOrObjectId),
    }),
    sendLocation: (to, latitude, longitude, options) => sendRequest<LocationMessage>({
      ...getPayloadBase(),
      to,
      type: 'location',
      context: options?.context,
      location: {
        latitude,
        longitude,
        name: options?.name,
        address: options?.address,
      },
    }),
    sendTemplate: (to, name, languageCode, components, options) => sendRequest<TemplateMessage>({
      ...getPayloadBase(options?.recipientType),
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
      ...getPayloadBase(),
      to,
      type: 'contacts',
      contacts,
    }),
    sendReplyButtons: (to, bodyText, buttons, options) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? {
            footer: { text: options?.footerText },
          }
          : {}),
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
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? {
            footer: { text: options?.footerText },
          }
          : {}),
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
    // ts-ignore
    sendFlow: (to: string, bodyText, buttonName: string, options: {
      footerText: string;
      header: InteractiveHeader;
      flow_token: string;
      flow_id: string;
      payload: object;
      context?: object;
    }) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? {
            footer: { text: options?.footerText },
          }
          : {}),
        header: options?.header,
        type: 'flow',
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_token: options.flow_token,
            flow_id: options.flow_id,
            flow_cta: buttonName,
            flow_action: 'navigate',
            flow_action_payload: options.payload,
          },
        },
      },
    }),
    // ts-ignore
    sendLocationRequest: (to: string, bodyText, options: { context?: object }) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        type: 'location_request_message',
        body: {
          text: bodyText,
        },
        action: {
          name: 'send_location',
        },
      },
    }),
    sendReaction: (to, messageId, emoji) => sendRequest<ReactionMessage>({
      ...getPayloadBase(),
      to,
      type: 'reaction',
      reaction: {
        message_id: messageId,
        emoji,
      },
    }),
    sendTypingIndicator: (messageId) => sendRequest<TypingIndicatorMessage>({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
      typing_indicator: {
        type: 'text',
      },
    }),
    sendCtaUrl: (to, bodyText, displayText, url, options) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        type: 'cta_url',
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? { footer: { text: options.footerText } }
          : {}),
        header: options?.header,
        action: {
          name: 'cta_url',
          parameters: {
            display_text: displayText,
            url,
          },
        },
      },
    }),
    sendVoiceCall: (to, bodyText, options) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        type: 'voice_call',
        body: {
          text: bodyText,
        },
        action: {
          name: 'voice_call',
          ...((options?.displayText || options?.ttlMinutes != null || options?.payload)
            ? {
              parameters: {
                ...(options?.displayText ? { display_text: options.displayText } : {}),
                ...(options?.ttlMinutes != null ? { ttl_minutes: options.ttlMinutes } : {}),
                ...(options?.payload ? { payload: options.payload } : {}),
              },
            }
            : {}),
        },
      },
    }),
    sendAddress: (to, bodyText, country, options) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        type: 'address_message',
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? { footer: { text: options.footerText } }
          : {}),
        header: options?.header,
        action: {
          name: 'address_message',
          parameters: {
            country,
            ...(options?.values ? { values: options.values } : {}),
            ...(options?.savedAddresses ? { saved_addresses: options.savedAddresses } : {}),
            ...(options?.validationErrors ? { validation_errors: options.validationErrors } : {}),
          },
        },
      },
    }),
    sendProduct: (to, catalogId, productRetailerId, options) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        type: 'product',
        ...(options?.bodyText
          ? { body: { text: options.bodyText } }
          : {}),
        ...(options?.footerText
          ? { footer: { text: options.footerText } }
          : {}),
        action: {
          catalog_id: catalogId,
          product_retailer_id: productRetailerId,
        },
      },
    }),
    sendProductList: (to, catalogId, headerText, bodyText, sections, options) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        type: 'product_list',
        header: {
          type: 'text',
          text: headerText,
        },
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? { footer: { text: options.footerText } }
          : {}),
        action: {
          catalog_id: catalogId,
          sections,
        },
      },
    }),
    sendCatalog: (to, bodyText, options) => sendRequest<InteractiveMessage>({
      ...getPayloadBase(),
      to,
      type: 'interactive',
      context: options?.context,
      interactive: {
        type: 'catalog_message',
        body: {
          text: bodyText,
        },
        ...(options?.footerText
          ? { footer: { text: options.footerText } }
          : {}),
        action: {
          name: 'catalog_message',
          ...(options?.thumbnailProductRetailerId
            ? {
              parameters: {
                thumbnail_product_retailer_id: options.thumbnailProductRetailerId,
              },
            }
            : {}),
        },
      },
    }),

    // Groups API — https://developers.facebook.com/documentation/business-messaging/whatsapp/groups
    createGroup: groups.createGroup,
    deleteGroup: groups.deleteGroup,
    getGroup: groups.getGroup,
    listGroups: groups.listGroups,
    getInviteLink: groups.getInviteLink,
    resetInviteLink: groups.resetInviteLink,
    getJoinRequests: groups.getJoinRequests,
    approveJoinRequests: groups.approveJoinRequests,
    rejectJoinRequests: groups.rejectJoinRequests,
    removeParticipants: groups.removeParticipants,
    updateGroupSettings: groups.updateGroupSettings,
    pinGroupMessage: (groupId, messageId, expirationDays = 7) => sendRequest<PinMessage>({
      ...getPayloadBase('group'),
      to: groupId,
      type: 'pin',
      pin: {
        type: 'pin',
        message_id: messageId,
        expiration_days: expirationDays,
      },
    }),
    unpinGroupMessage: (groupId, messageId) => sendRequest<PinMessage>({
      ...getPayloadBase('group'),
      to: groupId,
      type: 'pin',
      pin: {
        type: 'unpin',
        message_id: messageId,
      },
    }),
    sendGroupInviteTemplate: (to, templateName, languageCode, groupId, extraBodyParams) => sendRequest<TemplateMessage>({
      ...getPayloadBase(),
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
                components: [
          {
            type: 'body',
            parameters: [
              { type: 'group_id', group_id: groupId },
              ...((extraBodyParams || []) as any[]),
            ],
          },
        ],
      },
    }),
  };
};

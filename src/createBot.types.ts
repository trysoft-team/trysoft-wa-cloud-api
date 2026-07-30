import express, { Application } from 'express';
import { Server } from 'http';
import { Contact, InteractiveHeader, TemplateComponent } from './messages.types';
import { SendMessageResult } from './sendRequestHelper';
import { FreeFormObject } from './utils/misc';
import { PubSubEvent } from './utils/pubSub';
import { GroupsApi, JoinApprovalMode } from './groups.types';

export type RecipientType = 'individual' | 'group';

export interface Message {
  wab_pid: string;
  wab_number: string;
  from: string;
  name: string | undefined;
  id: string;
  timestamp: string;
  type: PubSubEvent;
  data: FreeFormObject; // TODO: properly define interfaces for each type
  group_id?: string;
}

export interface GroupWebhookPayload {
  wab_pid?: string;
  wab_number?: string;
  field: PubSubEvent;
  data: FreeFormObject;
}

export interface Bot extends GroupsApi {
  startExpressServer: (options?: {
    app?: express.Application;
    useMiddleware?: (app: express.Application) => void;
    port?: number;
    webhookPath?: string;
    webhookVerifyToken?: string;
  }) => Promise<{ server?: Server; app: Application; }>;
  on: (event: PubSubEvent, cb: (message: Message | GroupWebhookPayload) => void) => string;
  unsubscribe: (token: string) => string | boolean;
  markRead: (id: string) => Promise<SendMessageResult>
  getMediaDownload: (id : string, save_path : string) => Promise<object>
  sendText: (to: string, text: string, options?: {
    preview_url?: boolean;
    context?: object;
    recipientType?: RecipientType;
  }) => Promise<SendMessageResult>;
  sendMessage: (to: string, text: string, options?: {
    preview_url?: boolean;
    context?: object;
    recipientType?: RecipientType;
  }) => Promise<SendMessageResult>;
  sendImage: (to: string, urlOrObjectId: string, options?: {
    caption?: string;
    context?: object;
    recipientType?: RecipientType;
  }) => Promise<SendMessageResult>;
  sendDocument: (to: string, urlOrObjectId: string, options?: {
    caption?: string;
    filename?: string;
    context?: object;
    recipientType?: RecipientType;
  }) => Promise<SendMessageResult>;
  sendAudio: (to: string, urlOrObjectId: string, options?: {
    recipientType?: RecipientType;
  }) => Promise<SendMessageResult>;
  sendVideo: (to: string, urlOrObjectId: string, options?: {
    caption?: string;
    context?: object;
    recipientType?: RecipientType;
  }) => Promise<SendMessageResult>;
  sendSticker: (to: string, urlOrObjectId: string, options?: {
    recipientType?: RecipientType;
  }) => Promise<SendMessageResult>;
  sendLocation: (to: string, latitude: number, longitude: number, options?: {
    name?: string;
    address?: string;
    context?: object;
  }) => Promise<SendMessageResult>;
  sendTemplate: (
    to: string,
    name: string,
    languageCode: string,
    components?: TemplateComponent[],
    options?: {
      recipientType?: RecipientType;
    },
  ) => Promise<SendMessageResult>;
  sendContacts: (to: string, contacts: Contact[]) => Promise<SendMessageResult>;
  sendReplyButtons: (
    to: string,
    bodyText: string,
    buttons: {
      [id: string]: string | number;
    },
    options?: {
      footerText?: string;
      header?: InteractiveHeader;
      context?: object;
    },
  ) => Promise<SendMessageResult>;
  sendList: (
    to: string,
    buttonName: string,
    bodyText: string,
    sections: {
      [sectionTitle: string]: {
        id: string | number;
        title: string | number;
        description?: string;
      }[];
    },
    options?: {
      footerText?: string,
      header?: InteractiveHeader;
      context?: object;
    },
  ) => Promise<SendMessageResult>;

  sendFlow: (
      to: string,
      bodyText: string,
      buttonName: string,
      options?: {
        footerText?: string;
        header?: InteractiveHeader;
        flow_token: string;
        flow_id: string;
        screen: string;
        data?: object;
        context?: object;
      },
  ) => Promise<SendMessageResult>;

  sendLocationRequest: (
      to: string,
      bodyText: string,
      options?: {
        context?: object;
      },
  ) => Promise<SendMessageResult>;

  sendReaction: (
    to: string,
    messageId: string,
    emoji: string,
  ) => Promise<SendMessageResult>;

  sendTypingIndicator: (messageId: string) => Promise<SendMessageResult>;

  sendCtaUrl: (
    to: string,
    bodyText: string,
    displayText: string,
    url: string,
    options?: {
      footerText?: string;
      header?: InteractiveHeader;
      context?: object;
    },
  ) => Promise<SendMessageResult>;

  sendVoiceCall: (
    to: string,
    bodyText: string,
    options?: {
      displayText?: string;
      ttlMinutes?: number;
      payload?: string;
      context?: object;
    },
  ) => Promise<SendMessageResult>;

  sendAddress: (
    to: string,
    bodyText: string,
    country: string,
    options?: {
      values?: Record<string, string>;
      savedAddresses?: {
        id: string;
        value: Record<string, string>;
      }[];
      validationErrors?: Record<string, string>;
      footerText?: string;
      header?: InteractiveHeader;
      context?: object;
    },
  ) => Promise<SendMessageResult>;

  sendProduct: (
    to: string,
    catalogId: string,
    productRetailerId: string,
    options?: {
      bodyText?: string;
      footerText?: string;
      context?: object;
    },
  ) => Promise<SendMessageResult>;

  sendProductList: (
    to: string,
    catalogId: string,
    headerText: string,
    bodyText: string,
    sections: {
      title: string;
      product_items: {
        product_retailer_id: string;
      }[];
    }[],
    options?: {
      footerText?: string;
      context?: object;
    },
  ) => Promise<SendMessageResult>;

  sendCatalog: (
    to: string,
    bodyText: string,
    options?: {
      thumbnailProductRetailerId?: string;
      footerText?: string;
      context?: object;
    },
  ) => Promise<SendMessageResult>;

  pinGroupMessage: (
    groupId: string,
    messageId: string,
    expirationDays?: number,
  ) => Promise<SendMessageResult>;

  unpinGroupMessage: (
    groupId: string,
    messageId: string,
  ) => Promise<SendMessageResult>;

  sendGroupInviteTemplate: (
    to: string,
    templateName: string,
    languageCode: string,
    groupId: string,
    extraBodyParams?: {
      type: string;
      [key: string]: unknown;
    }[],
  ) => Promise<SendMessageResult>;
}

export type ICreateBot = (
  fromPhoneNumberId: string,
  accessToken: string,
  options?: {
    version?: string;
  },
) => Bot;

export type { JoinApprovalMode };

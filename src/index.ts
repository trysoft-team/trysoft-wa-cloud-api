import 'dotenv/config';

export { createBot } from './createBot';

export type { Bot, Message, GroupWebhookPayload, RecipientType } from './createBot.types';
export type {
  GroupsApi,
  JoinApprovalMode,
  GroupInfo,
  CreateGroupResult,
} from './groups.types';

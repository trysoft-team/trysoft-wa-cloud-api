import 'dotenv/config';

export { createBot } from './createBot';

export type {
  Bot,
  Message,
  GroupWebhookPayload,
  CallWebhookPayload,
  RecipientType,
} from './createBot.types';
export type {
  GroupsApi,
  JoinApprovalMode,
  GroupInfo,
  CreateGroupResult,
} from './groups.types';
export type {
  CallingApi,
  CallingSettings,
  CallSession,
  CallPermissionsResult,
  CallSettingsResult,
} from './calling.types';

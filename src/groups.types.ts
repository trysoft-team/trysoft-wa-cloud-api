export type JoinApprovalMode = 'auto_approve' | 'approval_required';

export interface CreateGroupResult {
  messaging_product?: 'whatsapp';
  id?: string;
  [key: string]: unknown;
}

export interface GroupInviteLinkResult {
  messaging_product?: 'whatsapp';
  invite_link?: string;
}

export interface GroupInfo {
  messaging_product?: 'whatsapp';
  id?: string;
  subject?: string;
  description?: string;
  join_approval_mode?: JoinApprovalMode;
  suspended?: boolean;
  creation_timestamp?: number;
  total_participant_count?: number;
  participants?: { wa_id: string }[];
  [key: string]: unknown;
}

export interface ActiveGroupsResult {
  data?: {
    groups?: {
      id: string;
      subject?: string;
      created_at?: string | number;
    }[];
  };
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    previous?: string;
    next?: string;
  };
  [key: string]: unknown;
}

export interface JoinRequest {
  join_request_id: string;
  wa_id: string;
  creation_timestamp: number;
}

export interface JoinRequestsResult {
  data?: JoinRequest[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
  };
  [key: string]: unknown;
}

export interface JoinRequestActionResult {
  messaging_product?: 'whatsapp';
  approved_join_requests?: string[];
  rejected_join_requests?: string[];
  failed_join_requests?: {
    join_request_id: string;
    errors?: unknown[];
  }[];
  errors?: unknown[];
  [key: string]: unknown;
}

export interface GroupsApi {
  createGroup: (options: {
    subject: string;
    description?: string;
    joinApprovalMode?: JoinApprovalMode;
  }) => Promise<CreateGroupResult>;
  deleteGroup: (groupId: string) => Promise<unknown>;
  getGroup: (groupId: string, fields?: string[]) => Promise<GroupInfo>;
  listGroups: (options?: {
    limit?: number;
    after?: string;
    before?: string;
  }) => Promise<ActiveGroupsResult>;
  getInviteLink: (groupId: string) => Promise<GroupInviteLinkResult>;
  resetInviteLink: (groupId: string) => Promise<GroupInviteLinkResult>;
  getJoinRequests: (groupId: string) => Promise<JoinRequestsResult>;
  approveJoinRequests: (
    groupId: string,
    joinRequestIds: string[],
  ) => Promise<JoinRequestActionResult>;
  rejectJoinRequests: (
    groupId: string,
    joinRequestIds: string[],
  ) => Promise<JoinRequestActionResult>;
  removeParticipants: (groupId: string, users: string[]) => Promise<unknown>;
  updateGroupSettings: (groupId: string, options: {
    subject?: string;
    description?: string;
  }) => Promise<unknown>;
}

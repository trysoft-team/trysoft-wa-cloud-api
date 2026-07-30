export type CallAction = 'connect' | 'pre_accept' | 'accept' | 'reject' | 'terminate';

export type SdpType = 'offer' | 'answer';

export interface CallSession {
  sdp_type: SdpType;
  sdp: string;
}

export interface CallActionResult {
  messaging_product?: 'whatsapp';
  success?: boolean;
  [key: string]: unknown;
}

export type CallingStatus = 'ENABLED' | 'DISABLED';
export type CallIconVisibility = 'DEFAULT' | 'DISABLE_ALL';
export type CallbackPermissionStatus = 'ENABLED' | 'DISABLED';

export interface CallHoursDay {
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  open_time: string;
  close_time: string;
}

export interface CallHolidaySchedule {
  date: string;
  start_time: string;
  end_time: string;
}

export interface CallHoursSettings {
  status: CallingStatus;
  timezone_id: string;
  weekly_operating_hours: CallHoursDay[];
  holiday_schedule?: CallHolidaySchedule[];
}

export interface CallingSettings {
  status?: CallingStatus;
  call_icon_visibility?: CallIconVisibility;
  call_icons?: {
    restrict_to_user_countries?: string[];
  };
  call_hours?: CallHoursSettings;
  callback_permission_status?: CallbackPermissionStatus;
  sip?: {
    status?: CallingStatus;
    servers?: {
      hostname: string;
      port?: number;
      request_uri_user_params?: Record<string, string>;
    }[];
  };
  audio?: {
    additional_codecs?: ('PCMA' | 'PCMU')[];
  };
  voicemail?: {
    status: CallingStatus;
    triggers?: ('REJECT' | 'TIMEOUT')[];
    audio?: {
      default?: {
        announcement_media_id: number | string;
        timeout_seconds?: number;
      };
    };
  };
  [key: string]: unknown;
}

export interface CallSettingsResult {
  calling?: CallingSettings;
  [key: string]: unknown;
}

export type CallPermissionStatus = 'no_permission' | 'temporary' | 'permanent';

export interface CallPermissionsResult {
  messaging_product?: 'whatsapp';
  permission?: {
    status?: CallPermissionStatus;
    expiration_time?: number;
  };
  actions?: {
    action_name?: 'send_call_permission_request' | 'start_call' | string;
    can_perform_action?: boolean;
    limits?: {
      time_period?: string;
      max_allowed?: number;
      current_usage?: number;
      limit_expiration_time?: number;
    }[];
  }[];
  [key: string]: unknown;
}

export interface CallingApi {
  getCallSettings: (options?: {
    includeSipCredentials?: boolean;
  }) => Promise<CallSettingsResult>;
  updateCallSettings: (calling: CallingSettings) => Promise<CallActionResult>;
  getCallPermissions: (options: {
    userWaId?: string;
    recipient?: string;
  }) => Promise<CallPermissionsResult>;
  preAcceptCall: (
    callId: string,
    session: CallSession,
  ) => Promise<CallActionResult>;
  acceptCall: (
    callId: string,
    session: CallSession,
    options?: {
      bizOpaqueCallbackData?: string;
    },
  ) => Promise<CallActionResult>;
  rejectCall: (callId: string) => Promise<CallActionResult>;
  terminateCall: (callId: string) => Promise<CallActionResult>;
  connectCall: (
    to: string,
    session: CallSession,
    options?: {
      recipient?: string;
      bizOpaqueCallbackData?: string;
    },
  ) => Promise<CallActionResult>;
}

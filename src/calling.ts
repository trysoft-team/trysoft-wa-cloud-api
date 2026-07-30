import axios, { AxiosError } from 'axios';
import { CallingApi, CallActionResult, CallSession } from './calling.types';

const graphRequest = async <T>(
  method: 'get' | 'post' | 'delete',
  url: string,
  accessToken: string,
  data?: unknown,
): Promise<T> => {
  try {
    const { data: rawResult } = await axios({
      method,
      url,
      data,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    return rawResult as T;
  } catch (err: unknown) {
    const responseData = (err as AxiosError)?.response?.data;
    if (responseData) {
      // eslint-disable-next-line no-console
      console.error(`Calling API ${method.toUpperCase()} ${url} failed:`, JSON.stringify(responseData));
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw responseData;
    }
    // eslint-disable-next-line no-console
    console.error(err);
    if (err instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw (err as Error).message;
    }
    throw err;
  }
};

const callAction = (
  base: string,
  fromPhoneNumberId: string,
  accessToken: string,
  body: Record<string, unknown>,
) => graphRequest<CallActionResult>(
  'post',
  `${base}/${fromPhoneNumberId}/calls`,
  accessToken,
  {
    messaging_product: 'whatsapp',
    ...body,
  },
);

export const createCallingApi = (
  fromPhoneNumberId: string,
  accessToken: string,
  version: string,
): CallingApi => {
  const base = `https://graph.facebook.com/${version}`;

  return {
    getCallSettings: (options) => {
      const query = options?.includeSipCredentials
        ? '?include_sip_credentials=true'
        : '';
      return graphRequest('get', `${base}/${fromPhoneNumberId}/settings${query}`, accessToken);
    },

    updateCallSettings: (calling) => graphRequest(
      'post',
      `${base}/${fromPhoneNumberId}/settings`,
      accessToken,
      { calling },
    ),

    getCallPermissions: (options) => {
      const params = new URLSearchParams();
      if (options.userWaId) params.set('user_wa_id', options.userWaId);
      if (options.recipient) params.set('recipient', options.recipient);
      const query = params.toString() ? `?${params.toString()}` : '';
      return graphRequest(
        'get',
        `${base}/${fromPhoneNumberId}/call_permissions${query}`,
        accessToken,
      );
    },

    preAcceptCall: (callId, session: CallSession) => callAction(
      base,
      fromPhoneNumberId,
      accessToken,
      {
        call_id: callId,
        action: 'pre_accept',
        session,
      },
    ),

    acceptCall: (callId, session, options) => callAction(
      base,
      fromPhoneNumberId,
      accessToken,
      {
        call_id: callId,
        action: 'accept',
        session,
        ...(options?.bizOpaqueCallbackData
          ? { biz_opaque_callback_data: options.bizOpaqueCallbackData }
          : {}),
      },
    ),

    rejectCall: (callId) => callAction(
      base,
      fromPhoneNumberId,
      accessToken,
      {
        call_id: callId,
        action: 'reject',
      },
    ),

    terminateCall: (callId) => callAction(
      base,
      fromPhoneNumberId,
      accessToken,
      {
        call_id: callId,
        action: 'terminate',
      },
    ),

    connectCall: (to, session, options) => callAction(
      base,
      fromPhoneNumberId,
      accessToken,
      {
        to,
        action: 'connect',
        session,
        ...(options?.recipient ? { recipient: options.recipient } : {}),
        ...(options?.bizOpaqueCallbackData
          ? { biz_opaque_callback_data: options.bizOpaqueCallbackData }
          : {}),
      },
    ),
  };
};

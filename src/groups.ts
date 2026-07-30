import axios, { AxiosError } from 'axios';
import { GroupsApi } from './groups.types';

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
      console.error(`Groups API ${method.toUpperCase()} ${url} failed:`, JSON.stringify(responseData));
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

export const createGroupsApi = (
  fromPhoneNumberId: string,
  accessToken: string,
  version: string,
): GroupsApi => {
  const base = `https://graph.facebook.com/${version}`;

  return {
    createGroup: (options) => graphRequest('post', `${base}/${fromPhoneNumberId}/groups`, accessToken, {
      messaging_product: 'whatsapp',
      subject: options.subject,
      ...(options.description ? { description: options.description } : {}),
      ...(options.joinApprovalMode
        ? { join_approval_mode: options.joinApprovalMode }
        : {}),
    }),

    deleteGroup: (groupId) => graphRequest('delete', `${base}/${groupId}`, accessToken),

    getGroup: (groupId, fields) => {
      const query = fields?.length ? `?fields=${encodeURIComponent(fields.join(','))}` : '';
      return graphRequest('get', `${base}/${groupId}${query}`, accessToken);
    },

    listGroups: (options) => {
      const params = new URLSearchParams();
      if (options?.limit != null) params.set('limit', String(options.limit));
      if (options?.after) params.set('after', options.after);
      if (options?.before) params.set('before', options.before);
      const query = params.toString() ? `?${params.toString()}` : '';
      return graphRequest('get', `${base}/${fromPhoneNumberId}/groups${query}`, accessToken);
    },

    getInviteLink: (groupId) => graphRequest('get', `${base}/${groupId}/invite_link`, accessToken),

    resetInviteLink: (groupId) => graphRequest('post', `${base}/${groupId}/invite_link`, accessToken, {
      messaging_product: 'whatsapp',
    }),

    getJoinRequests: (groupId) => graphRequest('get', `${base}/${groupId}/join_requests`, accessToken),

    approveJoinRequests: (groupId, joinRequestIds) => graphRequest(
      'post',
      `${base}/${groupId}/join_requests`,
      accessToken,
      {
        messaging_product: 'whatsapp',
        join_requests: joinRequestIds,
      },
    ),

    rejectJoinRequests: (groupId, joinRequestIds) => graphRequest(
      'delete',
      `${base}/${groupId}/join_requests`,
      accessToken,
      {
        messaging_product: 'whatsapp',
        join_requests: joinRequestIds,
      },
    ),

    removeParticipants: (groupId, users) => graphRequest(
      'delete',
      `${base}/${groupId}/participants`,
      accessToken,
      {
        messaging_product: 'whatsapp',
        participants: users.map((user) => ({ user })),
      },
    ),

    updateGroupSettings: (groupId, options) => graphRequest('post', `${base}/${groupId}`, accessToken, {
      messaging_product: 'whatsapp',
      ...(options.subject ? { subject: options.subject } : {}),
      ...(options.description ? { description: options.description } : {}),
    }),
  };
};

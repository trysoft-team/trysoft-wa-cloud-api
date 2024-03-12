import axios, { AxiosError } from 'axios';
import { writeFile } from 'fs/promises';

// https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
interface OfficialSendMessageResult {
  messaging_product?: 'whatsapp';
  contacts?: {
    input: string;
    wa_id: string;
  }[];
  messages?: {
    id: string;
  }[];
  success?: boolean
}

export interface SendMessageResult {
  messageId?: string;
  phoneNumber?: string;
  whatsappId?: string;
  success?: boolean
}
export const sendRequestHelper = (
  fromPhoneNumberId: string,
  accessToken: string,
  version: string ,
) => async <T>(data: T): Promise<SendMessageResult> => {
  try {
    // eslint-disable-next-line no-console
    console.log(data);

    const { data: rawResult } = await axios({
      method: 'post',
      url: `https://graph.facebook.com/${version}/${fromPhoneNumberId}/messages`,
      data,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const result = rawResult as OfficialSendMessageResult;

    return {
      messageId: result?.messages?.[0]?.id,
      phoneNumber: result?.contacts?.[0]?.input,
      whatsappId: result?.contacts?.[0]?.wa_id,
      success: result?.success,
    };
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.log(err);
    if ((err as any).response) {
      throw (err as AxiosError)?.response?.data;
    // } else if ((err as any).request) {
    //   throw (err as AxiosError)?.request;
    } else if (err instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw (err as Error).message;
    } else {
      throw err;
    }
  }
};

export const getMediaDownload = (fromPhoneNumberId: string, accessToken: string, version: string = 'v14.0') => async (media_id: string, save_path: string): Promise<Object> => {
  try {
    const { data: rawResult } = await axios({
      method: 'get',
      url: `https://graph.facebook.com/${version}/${media_id}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // eslint-disable-next-line @typescript-eslint/keyword-spacing
    if(rawResult?.url) {
      const binary = await axios({
        method: 'get',
        url: rawResult.url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'arraybuffer',
      });

      if (binary != null) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const filePath = save_path + makeid(15) + rawResult.mime_type.replace('image/', '.').replace('application/', '.');
        await writeFile(filePath, binary.data);
        // eslint-disable-next-line @typescript-eslint/dot-notation
        rawResult['path'] = filePath;
        // eslint-disable-next-line @typescript-eslint/dot-notation
        rawResult['file_name'] = filePath.replace(save_path, '');
      }
    }
    return rawResult;
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.log(err);
    if ((err as any).response) {
      throw (err as AxiosError)?.response?.data;
      // } else if ((err as any).request) {
      //   throw (err as AxiosError)?.request;
    } else if (err instanceof Error) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw (err as Error).message;
    } else {
      throw err;
    }
  }
};
function makeid(length:any) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

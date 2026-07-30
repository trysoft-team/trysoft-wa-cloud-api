export enum PubSubEvents {
  message = 'message',
  text = 'text',
  image = 'image',
  document = 'document',
  audio = 'audio',
  video = 'video',
  sticker = 'sticker',
  location = 'location',
  contacts = 'contacts',
  order = 'order',
  reaction = 'reaction',
  button_reply = 'button_reply',
  list_reply = 'list_reply',
  nfm_reply = 'nfm_reply',
  group_lifecycle_update = 'group_lifecycle_update',
  group_participants_update = 'group_participants_update',
  group_settings_update = 'group_settings_update',
  group_status_update = 'group_status_update',
  calls = 'calls',
  call_permission_reply = 'call_permission_reply',
}

export type PubSubEvent = keyof typeof PubSubEvents;

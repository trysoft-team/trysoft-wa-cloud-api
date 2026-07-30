# API Reference

## List

- [createBot(fromPhoneNumberId, accessToken, version)](#create_bot)
  - [sendText(to, text, [options])](#send_text)
  - [sendMessage(to, text, [options])](#send_message)
  - [sendImage(to, urlOrObjectId, [options])](#send_image)
  - [sendDocument(to, urlOrObjectId, [options])](#send_document)
  - [sendAudio(to, urlOrObjectId)](#send_audio)
  - [sendVideo(to, urlOrObjectId, [options])](#send_video)
  - [sendSticker(to, urlOrObjectId)](#send_sticker)
  - [sendLocation(to, latitude, longitude, [options])](#send_location)
  - [sendTemplate(to, name, languageCode, [components])](#send_template)
  - [sendContacts(to, contacts)](#send_contacts)
  - [sendReplyButtons(to, bodyText, buttons, [options])](#send_reply_buttons)
  - [sendList(to, buttonName, bodyText, sections, [options])](#send_list)
  - [sendFlow(to, bodyText, buttonName, [options])](#send_flow)
  - [sendLocationRequest(to, bodyText, [options])](#send_location_request)
  - [sendReaction(to, messageId, emoji)](#send_reaction)
  - [sendTypingIndicator(messageId)](#send_typing_indicator)
  - [sendCtaUrl(to, bodyText, displayText, url, [options])](#send_cta_url)
  - [sendVoiceCall(to, bodyText, [options])](#send_voice_call)
  - [sendAddress(to, bodyText, country, [options])](#send_address)
  - [sendProduct(to, catalogId, productRetailerId, [options])](#send_product)
  - [sendProductList(to, catalogId, headerText, bodyText, sections, [options])](#send_product_list)
  - [sendCatalog(to, bodyText, [options])](#send_catalog)
  - [Groups API](#groups_api)
  - [createGroup(options)](#create_group)
  - [listGroups([options])](#list_groups)
  - [getGroup(groupId, [fields])](#get_group)
  - [deleteGroup(groupId)](#delete_group)
  - [getInviteLink(groupId)](#get_invite_link)
  - [resetInviteLink(groupId)](#reset_invite_link)
  - [getJoinRequests(groupId)](#get_join_requests)
  - [approveJoinRequests(groupId, joinRequestIds)](#approve_join_requests)
  - [rejectJoinRequests(groupId, joinRequestIds)](#reject_join_requests)
  - [removeParticipants(groupId, users)](#remove_participants)
  - [updateGroupSettings(groupId, options)](#update_group_settings)
  - [pinGroupMessage(groupId, messageId, [expirationDays])](#pin_group_message)
  - [unpinGroupMessage(groupId, messageId)](#unpin_group_message)
  - [sendGroupInviteTemplate(to, templateName, languageCode, groupId, [extraBodyParams])](#send_group_invite_template)
  - [startExpressServer([options])](#start_express_server)
  - [on(event, cb: (message) => void)](#on_event)

## Details

<a name="create_bot"></a>

### createBot(fromPhoneNumberId, accessToken, version)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| fromPhoneNumberId | `String` | | Whatsapp ID of business phone number. |
| accessToken | `String` | | Temporary or Permanent access token. |

<a name="send_text"></a>

### sendText(to, text, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| text | `String` | | The text of the text message. |
| [options] | `Object` | | |
| [options.preview_url] | `Boolean` | | By default, WhatsApp recognizes URLs and makes them clickable, but you can also include a preview box with more information about the link. Set this field to true if you want to include a URL preview box. |

<a name="send_message"></a>

### sendMessage(to, text, [options])

Same as `sendText` above.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| text | `String` | | The text of the text message. |
| [options] | `Object` | | |
| [options.preview_url] | `Boolean` | | By default, WhatsApp recognizes URLs and makes them clickable, but you can also include a preview box with more information about the link. Set this field to true if you want to include a URL preview box. |

<a name="send_image"></a>

### sendImage(to, urlOrObjectId, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| urlOrObjectId | `String` | | Either one of the following: <br /> - **URL Link**: use only with HTTP/HTTPS URLs <br /> - **Media Object ID**. See [Get Media ID](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#get-media-id) for information on how to get the ID of your media object. |
| [options] | `Object` | | |
| [options.caption] | `String` | | Describes the image. |

<a name="send_document"></a>

### sendDocument(to, urlOrObjectId, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| urlOrObjectId | `String` | | Either one of the following: <br /> - **URL Link**: use only with HTTP/HTTPS URLs <br /> - **Media Object ID**. See [Get Media ID](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#get-media-id) for information on how to get the ID of your media object. |
| [options] | `Object` | | |
| [options.caption] | `String` | | Describes the document. |
| [options.filename] | `String` | | Describes the filename for the specific document. |

<a name="send_audio"></a>

### sendAudio(to, urlOrObjectId)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| urlOrObjectId | `String` | | Either one of the following: <br /> - **URL Link**: use only with HTTP/HTTPS URLs <br /> - **Media Object ID**. See [Get Media ID](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#get-media-id) for information on how to get the ID of your media object. |

<a name="send_video"></a>

### sendVideo(to, urlOrObjectId, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| urlOrObjectId | `String` | | Either one of the following: <br /> - **URL Link**: use only with HTTP/HTTPS URLs <br /> - **Media Object ID**. See [Get Media ID](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#get-media-id) for information on how to get the ID of your media object. |
| [options] | `Object` | | |
| [options.caption] | `String` | | Describes the video. |

<a name="send_sticker"></a>

### sendSticker(to, urlOrObjectId)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| urlOrObjectId | `String` | | Either one of the following: <br /> - **URL Link**: use only with HTTP/HTTPS URLs <br /> - **Media Object ID**. See [Get Media ID](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#get-media-id) for information on how to get the ID of your media object. |

<a name="send_location"></a>

### sendLocation(to, latitude, longitude, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| latitude | `Number` | | Latitude of the location. |
| longitude | `Number` | | Latitude of the location. |
| [options] | `Object` | | |
| [options.name] | `Object` | | Name of location. |
| [options.address] | `Object` | | Address of the location. Only displayed if name is present. |

<a name="send_template"></a>

### sendTemplate(to, name, languageCode, [components])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| name | `String` | | Name of the template. |
| languageCode | `String` | | The code of the language or locale to use. Accepts both language and language_locale formats (e.g., en and en_US). |
| [components] | `Array of Objects` | | See [Official Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#template-object). |

<a name="send_contacts"></a>

### sendContacts(to, contacts)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| [contacts] | `Array of Objects` | | See [Official Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#contacts-object). |

<a name="send_reply_buttons"></a>

### sendReplyButtons(to, bodyText, buttons, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| bodyText | `String` | | The content of the message. Emojis and markdown are supported. Maximum length: 1024 characters. |
| buttons | `Object` | | Key-value pair denoting the id and title of the button, i.e. <br /> - **Key**: Unique identifier for your button. This ID is returned in the webhook when the button is clicked by the user. Maximum length: 256 characters. <br /> - **Value**: Button title. It cannot be an empty string and must be unique within the message. Emojis are supported, markdown is not. Maximum length: 20 characters. |
| [options] | `Object` | | |
| [options.footerText] | `Object` | | The footer content. Emojis, markdown, and links are supported. Maximum length: 60 characters. |
| [contacts.header] | `Array of Objects` | | See [Official Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#header-object). |

<a name="send_list"></a>

### sendList(to, buttonName, bodyText, sections, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| buttonName | `String` | | Button content. It cannot be an empty string and must be unique within the message. Emojis are supported, markdown is not. Maximum length: 20 characters. |
| bodyText | `String` | | The content of the message. Emojis and markdown are supported. Maximum length: 1024 characters. |
| sections | `Object` | | Key-value pair denoting the title of the section and the rows, i.e. <br /> - **Key**: Title of the section. Maximum length: 24 characters. <br /> - **Value**: Contains a list of rows. You can have a total of 10 rows across your sections. Each row must have a title (Maximum length: 24 characters) and an ID (Maximum length: 200 characters). You can add a description (Maximum length: 72 characters), but it is optional. e.g. <br /><br />{<br />"id":"unique-row-identifier-here",<br />"title": "row-title-content-here",<br />"description": "row-description-content-here",<br />} |
| [options] | `Object` | | |
| [options.footerText] | `Object` | | The footer content. Emojis, markdown, and links are supported. Maximum length: 60 characters. |
| [contacts.header] | `Array of Objects` | | See [Official Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#header-object). |

<a name="send_flow"></a>

### sendFlow(to, bodyText, buttonName, [options])

Sends an interactive WhatsApp Flow message.

<a name="send_location_request"></a>

### sendLocationRequest(to, bodyText, [options])

Sends an interactive location request message.

<a name="send_reaction"></a>

### sendReaction(to, messageId, emoji)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| messageId | `String` | | WhatsApp message ID to react to. |
| emoji | `String` | | Emoji reaction (e.g. `👍`). Empty string removes the reaction. |

<a name="send_typing_indicator"></a>

### sendTypingIndicator(messageId)

Marks the inbound message as read and shows a typing indicator.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| messageId | `String` | | WhatsApp message ID of the inbound message. |

<a name="send_cta_url"></a>

### sendCtaUrl(to, bodyText, displayText, url, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| bodyText | `String` | | Body text. |
| displayText | `String` | | Button label (max 20 characters). |
| url | `String` | | Destination URL. |
| [options] | `Object` | | Optional `footerText`, `header`, `context`. |

<a name="send_voice_call"></a>

### sendVoiceCall(to, bodyText, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| bodyText | `String` | | Body text. |
| [options.displayText] | `String` | | Call button label (default `Call Now`). |
| [options.ttlMinutes] | `Number` | | CTA TTL in minutes (1–43200). |
| [options.payload] | `String` | | Tracking payload returned in calls webhooks. |

<a name="send_address"></a>

### sendAddress(to, bodyText, country, [options])

Address request messages (currently India / `IN` only per Meta).

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| bodyText | `String` | | Body text. |
| country | `String` | | ISO country code (e.g. `IN`). |
| [options.values] | `Object` | | Prefill address field values. |
| [options.savedAddresses] | `Array` | | Previously saved addresses. |
| [options.validationErrors] | `Object` | | Field validation errors for re-prompting. |

<a name="send_product"></a>

### sendProduct(to, catalogId, productRetailerId, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| catalogId | `String` | | Meta Commerce catalog ID. |
| productRetailerId | `String` | | Product SKU / retailer ID in the catalog. |
| [options.bodyText] | `String` | | Optional body text. |
| [options.footerText] | `String` | | Optional footer text. |

<a name="send_product_list"></a>

### sendProductList(to, catalogId, headerText, bodyText, sections, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| catalogId | `String` | | Meta Commerce catalog ID. |
| headerText | `String` | | Required text header. |
| bodyText | `String` | | Body text. |
| sections | `Array` | | Sections with `title` and `product_items: [{ product_retailer_id }]`. |
| [options.footerText] | `String` | | Optional footer text. |

<a name="send_catalog"></a>

### sendCatalog(to, bodyText, [options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| to | `String` | | WhatsApp ID or phone number for the person you want to send a message to. |
| bodyText | `String` | | Body text. |
| [options.thumbnailProductRetailerId] | `String` | | Product SKU used for the thumbnail header. |
| [options.footerText] | `String` | | Optional footer text. |

<a name="groups_api"></a>

### Groups API

Requires an Official Business Account (OBA). See [Meta Groups docs](https://developers.facebook.com/documentation/business-messaging/whatsapp/groups).

Group-supported outbound types: text, media, and templates via `options.recipientType: 'group'` on `sendText`, `sendImage`, `sendDocument`, `sendAudio`, `sendVideo`, `sendSticker`, and `sendTemplate`.

Inbound group chat messages include `group_id` on the `message` object. Group metadata events: `group_lifecycle_update`, `group_participants_update`, `group_settings_update`, `group_status_update`.

<a name="create_group"></a>

### createGroup(options)

| Param | Type | Description |
| --- | --- | --- |
| options.subject | `String` | Required. Max 128 characters. |
| [options.description] | `String` | Optional. Max 2048 characters. |
| [options.joinApprovalMode] | `String` | `auto_approve` (default) or `approval_required`. |

<a name="list_groups"></a>

### listGroups([options])

Lists active groups for the business phone number.

<a name="get_group"></a>

### getGroup(groupId, [fields])

| Param | Type | Description |
| --- | --- | --- |
| groupId | `String` | Group ID. |
| [fields] | `String[]` | e.g. `['subject','description','participants','join_approval_mode']`. |

<a name="delete_group"></a>

### deleteGroup(groupId)

Deletes the group and removes all participants.

<a name="get_invite_link"></a>

### getInviteLink(groupId)

Returns `{ invite_link }`.

<a name="reset_invite_link"></a>

### resetInviteLink(groupId)

Invalidates previous invite links and returns a new one.

<a name="get_join_requests"></a>

### getJoinRequests(groupId)

Lists open join requests when approval mode is enabled.

<a name="approve_join_requests"></a>

### approveJoinRequests(groupId, joinRequestIds)

<a name="reject_join_requests"></a>

### rejectJoinRequests(groupId, joinRequestIds)

<a name="remove_participants"></a>

### removeParticipants(groupId, users)

`users` is an array of phone numbers / WhatsApp IDs.

<a name="update_group_settings"></a>

### updateGroupSettings(groupId, options)

| Param | Type | Description |
| --- | --- | --- |
| [options.subject] | `String` | New subject. |
| [options.description] | `String` | New description. |

<a name="pin_group_message"></a>

### pinGroupMessage(groupId, messageId, [expirationDays])

Pins a message in the group (1–30 days; default 7). Max 3 pinned messages.

<a name="unpin_group_message"></a>

### unpinGroupMessage(groupId, messageId)

<a name="send_group_invite_template"></a>

### sendGroupInviteTemplate(to, templateName, languageCode, groupId, [extraBodyParams])

Sends a Template Library group invite link utility template. The `group_id` body parameter is injected automatically.

<a name="start_express_server"></a>

### startExpressServer([options])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | `Object` | | |
| [options.app] | `express.Application` | | Your existing express application. Not required. See [README](./README.md#2-handling-incoming-messages) for more info. |
| [options.useMiddleware] | `function` | | A function that accepts middleware for your server. See [README](./README.md#2-handling-incoming-messages) for more info. |
| [options.port] | `number` | | Port number for the express server, e.g. `3000`. |
| [options.webhookPath] | `string` | | Endpoint for handling all whatsapp-related requests. See [README](./README.md#2-handling-incoming-messages) for more info. |
| [options.webhookVerifyToken] | `string` | | Verification token to use in Facebook Developer app settings.See [README](./README.md#1-verifying-your-callback-url) for more info. |

<a name="on_event"></a>

### on(event, cb: (message) => void)

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| event | `string` | | `message` \| `text` \| `image` \| `document` \| `audio` \| `video` \| `sticker` \| `location` \| `contacts` \| `order` \| `reaction` \| `button_reply` \| `list_reply` \| `nfm_reply` \| `group_lifecycle_update` \| `group_participants_update` \| `group_settings_update` \| `group_status_update` |
| message | `object` | | See below. |

`message` object:

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| from | `string` | | Whatsapp ID/phone number of Sender. |
| id | `string` | | ID of created message. |
| timestamp | `string` | | Unix epoch of created message. |
| type | `string` | | See `event` values above (chat events). |
| data | `object` | | Varies depending on the event. e.g for text, it will be `{ text: string; }` |
| [group_id] | `string` | | Present when the inbound message was sent in a group. |

## Resources

- [Official WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)

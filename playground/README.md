# Cloud API playground

Interactive UI for **messaging**, **groups**, and **WhatsApp calling** against your live Cloud API number.

## Setup

From the repo root:

```sh
npm i
npm run build
cp -n .env.template .env   # or copy into playground/.env
cd playground
npm i
npm start
```

Open [http://localhost:3000](http://localhost:3000) (or your `PORT`).

`playground/.env` is preferred when present. Important keys:

- `FROM_PHONE_NUMBER_ID`, `ACCESS_TOKEN`, `VERSION`, `TO`
- `WEBHOOK_VERIFY_TOKEN`, `WEBHOOK_PATH` (e.g. `/banking/webhook/test`)
- `PORT`

Expose the webhook (ngrok, etc.) and subscribe Meta to:

- `messages`
- `calls`
- `group_lifecycle_update`, `group_participants_update`, `group_settings_update`, `group_status_update`

## Tabs

| Tab | Features |
| --- | --- |
| **Calls** | Answer / reject / hang up inbound WebRTC calls; business-initiated `connectCall`; permission request; call button CTA; enable/refresh call settings |
| **Messages** | Text, `hello_world` template, reply buttons, list, CTA URL, location request, image, location, reaction, typing indicator, mark read |
| **Groups** | Create / list / get / delete; invite link + reset; send text to group; pin / unpin |
| **Inbox** | Live inbound webhook feed — click a row to fill reaction / reply / group fields |

## Notes

- Answer stays disabled after a call is accepted/rejected (no double-accept).
- Calling needs mic permission in the browser and calling enabled on the number.
- Groups require Meta Groups eligibility (OBA); otherwise you get error `131215`.
- Typing indicator / mark-read need an **inbound** `wamid` from Inbox.

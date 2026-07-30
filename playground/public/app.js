/* WhatsApp Cloud API playground — Calls + Messages + Groups + Inbox */

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const els = {
  connPill: document.getElementById('connPill'),
  pcPill: document.getElementById('pcPill'),
  callPill: document.getElementById('callPill'),
  inboxPill: document.getElementById('inboxPill'),
  healthMeta: document.getElementById('healthMeta'),
  inCallId: document.getElementById('inCallId'),
  inFrom: document.getElementById('inFrom'),
  inEvent: document.getElementById('inEvent'),
  toInput: document.getElementById('toInput'),
  msgTo: document.getElementById('msgTo'),
  msgText: document.getElementById('msgText'),
  msgPreview: document.getElementById('msgPreview'),
  imgUrl: document.getElementById('imgUrl'),
  reactMsgId: document.getElementById('reactMsgId'),
  reactEmoji: document.getElementById('reactEmoji'),
  groupSubject: document.getElementById('groupSubject'),
  groupDesc: document.getElementById('groupDesc'),
  groupApproval: document.getElementById('groupApproval'),
  groupId: document.getElementById('groupId'),
  groupMsg: document.getElementById('groupMsg'),
  pinMsgId: document.getElementById('pinMsgId'),
  groupsOut: document.getElementById('groupsOut'),
  inboxList: document.getElementById('inboxList'),
  remoteAudio: document.getElementById('remoteAudio'),
  settingsOut: document.getElementById('settingsOut'),
  log: document.getElementById('log'),
  btnAnswer: document.getElementById('btnAnswer'),
  btnReject: document.getElementById('btnReject'),
  btnHangup: document.getElementById('btnHangup'),
  btnPermission: document.getElementById('btnPermission'),
  btnCheckPerm: document.getElementById('btnCheckPerm'),
  btnConnect: document.getElementById('btnConnect'),
  btnVoiceCta: document.getElementById('btnVoiceCta'),
  btnEnableCalling: document.getElementById('btnEnableCalling'),
  btnRefreshSettings: document.getElementById('btnRefreshSettings'),
};

/** @type {RTCPeerConnection | null} */
let pc = null;
/** @type {MediaStream | null} */
let localStream = null;
/** @type {object | null} */
let activeInbound = null;
/** @type {string | null} */
let activeCallId = null;
/** @type {'idle' | 'ringing' | 'connecting' | 'in-call'} */
let callState = 'idle';
let pendingAnswerWaiter = null;
const handledCallIds = new Set();
let answerInFlight = false;
/** @type {object[]} */
const inbox = [];
let selectedInboxId = null;

function log(...parts) {
  const line = `[${new Date().toLocaleTimeString()}] ${parts.map((p) => (
    typeof p === 'string' ? p : JSON.stringify(p, null, 2)
  )).join(' ')}`;
  els.log.textContent = `${line}\n${els.log.textContent}`.slice(0, 16000);
  // eslint-disable-next-line no-console
  console.log(...parts);
}

function setCallState(state, label) {
  callState = state;
  els.callPill.textContent = label || state;
  els.callPill.className = `pill ${state === 'in-call' ? 'ok' : state === 'ringing' ? 'warn' : 'muted'}`;
  els.btnHangup.disabled = !(activeCallId && (state === 'in-call' || state === 'connecting'));
}

function setPcState(label, kind = 'muted') {
  els.pcPill.textContent = label;
  els.pcPill.className = `pill ${kind}`;
}

function syncToFields(value) {
  if (!value) return;
  if (!els.toInput.value) els.toInput.value = value;
  if (!els.msgTo.value) els.msgTo.value = value;
}

function currentTo(fallbackEl) {
  return (fallbackEl?.value || els.toInput.value || els.msgTo.value || '').trim();
}

function canAnswer(payload) {
  if (!payload?.callId || !payload?.sdp) return false;
  if (payload.event !== 'connect' || payload.sdpType !== 'offer') return false;
  if (handledCallIds.has(payload.callId)) return false;
  if (answerInFlight) return false;
  return callState !== 'in-call' && callState !== 'connecting';
}

function updateInboundUi(payload) {
  const isInboundOffer = payload?.event === 'connect' && payload?.sdp && payload?.sdpType === 'offer';
  if (isInboundOffer) activeInbound = payload;
  els.inCallId.textContent = payload?.callId || els.inCallId.textContent || '—';
  els.inFrom.textContent = payload?.from || els.inFrom.textContent || '—';
  els.inEvent.textContent = payload?.event
    ? `${payload.event}${payload.sdpType ? ` (${payload.sdpType})` : ''}${payload.direction ? ` · ${payload.direction}` : ''}`
    : '—';

  const actionable = canAnswer(payload);
  els.btnAnswer.disabled = !actionable;
  els.btnReject.disabled = !actionable;
  if (isInboundOffer && actionable) setCallState('ringing', 'Incoming call');
  if (payload?.event === 'terminate') {
    setCallState('idle', 'Call ended');
    teardownMedia();
    els.btnAnswer.disabled = true;
    els.btnReject.disabled = true;
  }
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || data?.error || res.statusText);
    err.payload = data;
    throw err;
  }
  return data;
}

async function ensureLocalAudio() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
  return localStream;
}

function createPeerConnection() {
  if (pc) {
    pc.close();
    pc = null;
  }
  pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  setPcState('Peer created', 'ok');

  pc.ontrack = (ev) => {
    log('remote track', ev.track.kind);
    els.remoteAudio.srcObject = ev.streams[0] || new MediaStream([ev.track]);
  };

  pc.onconnectionstatechange = () => {
    log('pc connectionState', pc.connectionState);
    setPcState(`PC ${pc.connectionState}`, pc.connectionState === 'connected' ? 'ok' : 'warn');
    if (pc.connectionState === 'connected') setCallState('in-call', 'In call');
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && callState === 'in-call') {
      setCallState('idle', 'Media disconnected');
    }
  };

  pc.oniceconnectionstatechange = () => log('ice', pc.iceConnectionState);
  return pc;
}

function waitForIceGathering(peer) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve(peer.localDescription);
  return new Promise((resolve) => {
    const check = () => {
      if (peer.iceGatheringState === 'complete') {
        peer.removeEventListener('icegatheringstatechange', check);
        resolve(peer.localDescription);
      }
    };
    peer.addEventListener('icegatheringstatechange', check);
    setTimeout(() => resolve(peer.localDescription), 2500);
  });
}

function teardownMedia() {
  if (pc) {
    pc.close();
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }
  els.remoteAudio.srcObject = null;
  setPcState('Peer idle', 'muted');
  activeCallId = null;
}

async function answerInbound() {
  if (!activeInbound?.sdp || !activeInbound?.callId) {
    log('no inbound offer to answer');
    return;
  }
  const callId = activeInbound.callId;
  if (answerInFlight) {
    log('answer already in progress', callId);
    return;
  }
  if (handledCallIds.has(callId)) {
    log('call already answered', callId);
    return;
  }
  if (callState === 'in-call') {
    log('already in a call — hang up first');
    return;
  }

  answerInFlight = true;
  els.btnAnswer.disabled = true;
  els.btnReject.disabled = true;
  activeCallId = callId;
  setCallState('connecting', 'Answering…');

  try {
    await ensureLocalAudio();
    const peer = createPeerConnection();
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    await peer.setRemoteDescription({ type: 'offer', sdp: activeInbound.sdp });
    const answer = await peer.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await peer.setLocalDescription(answer);
    const local = await waitForIceGathering(peer);
    log('sending accept', callId);
    handledCallIds.add(callId);
    await api('/api/calls/accept', {
      method: 'POST',
      body: JSON.stringify({ callId, sdp: local.sdp, sdpType: 'answer' }),
    });
    setCallState('in-call', 'In call');
    log('accepted', callId);
  } catch (err) {
    log('answer failed', err.payload || err.message || err);
    setCallState('idle', 'Answer failed');
    teardownMedia();
    const metaAlreadyAccepted = /progress|already/i.test(String(err.payload?.error?.message || ''));
    if (!metaAlreadyAccepted) {
      handledCallIds.delete(callId);
      els.btnAnswer.disabled = false;
      els.btnReject.disabled = false;
    }
  } finally {
    answerInFlight = false;
  }
}

async function rejectInbound() {
  const callId = activeInbound?.callId || activeCallId;
  if (!callId) return;
  if (handledCallIds.has(callId)) {
    log('call already answered or rejected', callId);
    return;
  }
  handledCallIds.add(callId);
  els.btnAnswer.disabled = true;
  els.btnReject.disabled = true;
  try {
    await api('/api/calls/reject', { method: 'POST', body: JSON.stringify({ callId }) });
    log('rejected', callId);
  } catch (err) {
    log('reject failed', err.payload || err.message || err);
  }
  setCallState('idle', 'Rejected');
  teardownMedia();
}

async function hangup() {
  const callId = activeCallId || activeInbound?.callId;
  if (!callId) return;
  handledCallIds.add(callId);
  els.btnAnswer.disabled = true;
  els.btnReject.disabled = true;
  try {
    await api('/api/calls/terminate', { method: 'POST', body: JSON.stringify({ callId }) });
    log('terminated', callId);
  } catch (err) {
    log('terminate failed', err.payload || err.message || err);
  }
  setCallState('idle', 'Hung up');
  teardownMedia();
}

function waitForRemoteAnswer(timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingAnswerWaiter = null;
      reject(new Error('Timed out waiting for SDP answer webhook'));
    }, timeoutMs);
    pendingAnswerWaiter = {
      resolve: (sdp) => {
        clearTimeout(timer);
        pendingAnswerWaiter = null;
        resolve(sdp);
      },
    };
  });
}

async function connectOutbound() {
  const to = currentTo(els.toInput);
  if (!to) {
    log('enter destination number');
    return;
  }
  setCallState('connecting', 'Calling…');
  try {
    await ensureLocalAudio();
    const peer = createPeerConnection();
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
    const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
    await peer.setLocalDescription(offer);
    const local = await waitForIceGathering(peer);
    const answerPromise = waitForRemoteAnswer();
    const result = await api('/api/calls/connect', {
      method: 'POST',
      body: JSON.stringify({ to, sdp: local.sdp, sdpType: 'offer' }),
    });
    log('connect requested', result);
    const remoteSdp = await answerPromise;
    await peer.setRemoteDescription({ type: 'answer', sdp: remoteSdp });
    setCallState('in-call', 'In call');
    log('remote answer applied');
  } catch (err) {
    log('connect failed', err.payload || err.message || err);
    setCallState('idle', 'Call failed');
    teardownMedia();
  }
}

function onCallEvent(payload) {
  log('SSE call', payload.event, payload.callId, payload.direction || '');
  updateInboundUi(payload);
  if (payload.event === 'connect' && payload.sdp && payload.sdpType === 'answer' && pendingAnswerWaiter) {
    activeCallId = payload.callId;
    pendingAnswerWaiter.resolve(payload.sdp);
  }
  if (payload.event === 'connect' && payload.callId) activeCallId = payload.callId;
  if (payload.event === 'terminate') pendingAnswerWaiter = null;
}

function previewMessage(msg) {
  if (!msg?.data) return JSON.stringify(msg);
  if (msg.data.text) return msg.data.text;
  if (msg.data.title) return `${msg.data.id || ''} ${msg.data.title}`.trim();
  if (msg.data.response) return `permission ${msg.data.response}`;
  return JSON.stringify(msg.data);
}

function renderInbox() {
  els.inboxPill.textContent = `Inbox ${inbox.length}`;
  els.inboxPill.className = `pill ${inbox.length ? 'ok' : 'muted'}`;
  if (!inbox.length) {
    els.inboxList.innerHTML = '<p class="inbox-empty">No inbound messages yet. Send something to this number.</p>';
    return;
  }
  els.inboxList.innerHTML = inbox.map((msg) => `
    <button type="button" class="inbox-item${selectedInboxId === msg.id ? ' active' : ''}" data-id="${msg.id}">
      <div class="inbox-top">
        <span>${msg.name || msg.from}${msg.group_id ? ' · group' : ''}</span>
        <span class="inbox-type">${msg.type}</span>
      </div>
      <div class="inbox-body">${escapeHtml(previewMessage(msg))}</div>
    </button>
  `).join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function selectInboxMessage(id) {
  const msg = inbox.find((m) => m.id === id);
  if (!msg) return;
  selectedInboxId = id;
  els.reactMsgId.value = msg.id;
  els.pinMsgId.value = msg.id;
  if (msg.from) {
    els.msgTo.value = msg.from;
    els.toInput.value = msg.from;
  }
  if (msg.group_id) els.groupId.value = msg.group_id;
  renderInbox();
  log('selected inbox message', msg.id, msg.type);
}

function onInboundMessage(msg) {
  inbox.unshift(msg);
  if (inbox.length > 50) inbox.length = 50;
  renderInbox();
  log('SSE message', msg.type, msg.from, previewMessage(msg));
}

function connectSse() {
  const es = new EventSource('/api/events');
  es.addEventListener('hello', (ev) => {
    const data = JSON.parse(ev.data);
    els.connPill.textContent = 'SSE connected';
    els.connPill.className = 'pill ok';
    syncToFields(data.defaultTo);
    log('SSE hello', data);
  });
  es.addEventListener('call', (ev) => onCallEvent(JSON.parse(ev.data)));
  es.addEventListener('permission', (ev) => log('permission', JSON.parse(ev.data)));
  es.addEventListener('message', (ev) => onInboundMessage(JSON.parse(ev.data)));
  es.addEventListener('group', (ev) => {
    const payload = JSON.parse(ev.data);
    log('SSE group', payload.field, payload.data);
    if (payload.data?.group_id && !els.groupId.value) {
      els.groupId.value = payload.data.group_id;
    }
    els.groupsOut.textContent = JSON.stringify(payload, null, 2);
  });
  es.onerror = () => {
    els.connPill.textContent = 'SSE reconnecting…';
    els.connPill.className = 'pill warn';
  };
}

async function refreshHealth() {
  try {
    const health = await api('/api/health');
    els.healthMeta.textContent = `Phone ${health.phoneNumberId} · TO ${health.defaultTo || 'n/a'} · webhook ${health.webhookPath}`;
    syncToFields(health.defaultTo);
  } catch (err) {
    els.healthMeta.textContent = 'Health check failed';
    log('health failed', err.message);
  }
}

async function refreshSettings() {
  try {
    els.settingsOut.textContent = JSON.stringify(await api('/api/call-settings'), null, 2);
  } catch (err) {
    els.settingsOut.textContent = JSON.stringify(err.payload || { error: err.message }, null, 2);
  }
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        const active = panel.dataset.panel === name;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });
    });
  });
}

// ── Calls ────────────────────────────────────────────────────────
els.btnAnswer.addEventListener('click', answerInbound);
els.btnReject.addEventListener('click', rejectInbound);
els.btnHangup.addEventListener('click', hangup);
els.btnConnect.addEventListener('click', connectOutbound);

els.btnPermission.addEventListener('click', async () => {
  try {
    log('permission request sent', await api('/api/permission-request', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.toInput) || undefined }),
    }));
  } catch (err) {
    log('permission request failed', err.payload || err.message);
  }
});

els.btnCheckPerm.addEventListener('click', async () => {
  try {
    const userWaId = currentTo(els.toInput);
    const qs = userWaId ? `?userWaId=${encodeURIComponent(userWaId)}` : '';
    log('permissions', await api(`/api/call-permissions${qs}`));
  } catch (err) {
    log('permissions failed', err.payload || err.message);
  }
});

els.btnVoiceCta.addEventListener('click', async () => {
  try {
    log('voice call button sent', await api('/api/voice-call-button', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.toInput) || undefined }),
    }));
  } catch (err) {
    log('voice call button failed', err.payload || err.message);
  }
});

els.btnEnableCalling.addEventListener('click', async () => {
  try {
    log('calling enabled', await api('/api/call-settings/enable', { method: 'POST', body: '{}' }));
    await refreshSettings();
  } catch (err) {
    log('enable calling failed', err.payload || err.message);
  }
});
els.btnRefreshSettings.addEventListener('click', refreshSettings);

// ── Messages ─────────────────────────────────────────────────────
document.getElementById('btnSendText').addEventListener('click', async () => {
  try {
    const to = currentTo(els.msgTo);
    const text = els.msgText.value.trim() || 'Hello from playground';
    log('text sent', await api('/api/messages/text', {
      method: 'POST',
      body: JSON.stringify({
        to,
        text,
        previewUrl: els.msgPreview.checked,
        messageId: els.reactMsgId.value.trim() || undefined,
      }),
    }));
  } catch (err) {
    log('text failed', err.payload || err.message);
  }
});

document.getElementById('btnSendTemplate').addEventListener('click', async () => {
  try {
    log('template sent', await api('/api/messages/template', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.msgTo), name: 'hello_world', languageCode: 'en_US' }),
    }));
  } catch (err) {
    log('template failed', err.payload || err.message);
  }
});

document.getElementById('btnButtons').addEventListener('click', async () => {
  try {
    log('buttons sent', await api('/api/messages/buttons', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.msgTo) }),
    }));
  } catch (err) {
    log('buttons failed', err.payload || err.message);
  }
});

document.getElementById('btnList').addEventListener('click', async () => {
  try {
    log('list sent', await api('/api/messages/list', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.msgTo) }),
    }));
  } catch (err) {
    log('list failed', err.payload || err.message);
  }
});

document.getElementById('btnCta').addEventListener('click', async () => {
  try {
    log('cta sent', await api('/api/messages/cta', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.msgTo) }),
    }));
  } catch (err) {
    log('cta failed', err.payload || err.message);
  }
});

document.getElementById('btnLocReq').addEventListener('click', async () => {
  try {
    log('location request sent', await api('/api/messages/location-request', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.msgTo) }),
    }));
  } catch (err) {
    log('location request failed', err.payload || err.message);
  }
});

document.getElementById('btnImage').addEventListener('click', async () => {
  try {
    log('image sent', await api('/api/messages/image', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.msgTo), url: els.imgUrl.value.trim() }),
    }));
  } catch (err) {
    log('image failed', err.payload || err.message);
  }
});

document.getElementById('btnLocation').addEventListener('click', async () => {
  try {
    log('location sent', await api('/api/messages/location', {
      method: 'POST',
      body: JSON.stringify({ to: currentTo(els.msgTo) }),
    }));
  } catch (err) {
    log('location failed', err.payload || err.message);
  }
});

document.getElementById('btnReact').addEventListener('click', async () => {
  try {
    log('reaction sent', await api('/api/messages/reaction', {
      method: 'POST',
      body: JSON.stringify({
        to: currentTo(els.msgTo),
        messageId: els.reactMsgId.value.trim(),
        emoji: els.reactEmoji.value.trim() || '👍',
      }),
    }));
  } catch (err) {
    log('reaction failed', err.payload || err.message);
  }
});

document.getElementById('btnTyping').addEventListener('click', async () => {
  try {
    log('typing sent', await api('/api/messages/typing', {
      method: 'POST',
      body: JSON.stringify({ messageId: els.reactMsgId.value.trim() }),
    }));
  } catch (err) {
    log('typing failed', err.payload || err.message);
  }
});

document.getElementById('btnRead').addEventListener('click', async () => {
  try {
    log('mark read', await api('/api/messages/read', {
      method: 'POST',
      body: JSON.stringify({ messageId: els.reactMsgId.value.trim() }),
    }));
  } catch (err) {
    log('mark read failed', err.payload || err.message);
  }
});

// ── Groups ───────────────────────────────────────────────────────
document.getElementById('btnCreateGroup').addEventListener('click', async () => {
  try {
    const result = await api('/api/groups', {
      method: 'POST',
      body: JSON.stringify({
        subject: els.groupSubject.value.trim(),
        description: els.groupDesc.value.trim(),
        joinApprovalMode: els.groupApproval.value,
      }),
    });
    els.groupsOut.textContent = JSON.stringify(result, null, 2);
    if (result?.id) els.groupId.value = result.id;
    log('group create', result);
  } catch (err) {
    els.groupsOut.textContent = JSON.stringify(err.payload || { error: err.message }, null, 2);
    log('group create failed', err.payload || err.message);
  }
});

document.getElementById('btnListGroups').addEventListener('click', async () => {
  try {
    const result = await api('/api/groups');
    els.groupsOut.textContent = JSON.stringify(result, null, 2);
    log('groups listed');
  } catch (err) {
    els.groupsOut.textContent = JSON.stringify(err.payload || { error: err.message }, null, 2);
    log('list groups failed', err.payload || err.message);
  }
});

async function withGroup(fn) {
  const groupId = els.groupId.value.trim();
  if (!groupId) {
    log('enter a group ID');
    return;
  }
  try {
    const result = await fn(groupId);
    els.groupsOut.textContent = JSON.stringify(result, null, 2);
    log('group ok', result);
  } catch (err) {
    els.groupsOut.textContent = JSON.stringify(err.payload || { error: err.message }, null, 2);
    log('group failed', err.payload || err.message);
  }
}

document.getElementById('btnGetGroup').addEventListener('click', () => withGroup((id) => api(`/api/groups/${encodeURIComponent(id)}`)));
document.getElementById('btnInviteLink').addEventListener('click', () => withGroup((id) => api(`/api/groups/${encodeURIComponent(id)}/invite-link`)));
document.getElementById('btnResetInvite').addEventListener('click', () => withGroup((id) => api(`/api/groups/${encodeURIComponent(id)}/invite-link/reset`, { method: 'POST', body: '{}' })));
document.getElementById('btnGroupText').addEventListener('click', () => withGroup((id) => api(`/api/groups/${encodeURIComponent(id)}/message`, {
  method: 'POST',
  body: JSON.stringify({ text: els.groupMsg.value.trim() || 'Hello group' }),
})));
document.getElementById('btnDeleteGroup').addEventListener('click', () => withGroup((id) => api(`/api/groups/${encodeURIComponent(id)}`, { method: 'DELETE' })));
document.getElementById('btnPin').addEventListener('click', () => withGroup((id) => api(`/api/groups/${encodeURIComponent(id)}/pin`, {
  method: 'POST',
  body: JSON.stringify({ messageId: els.pinMsgId.value.trim() }),
})));
document.getElementById('btnUnpin').addEventListener('click', () => withGroup((id) => api(`/api/groups/${encodeURIComponent(id)}/unpin`, {
  method: 'POST',
  body: JSON.stringify({ messageId: els.pinMsgId.value.trim() }),
})));

// ── Inbox / log ──────────────────────────────────────────────────
els.inboxList.addEventListener('click', (ev) => {
  const item = ev.target.closest('[data-id]');
  if (item) selectInboxMessage(item.dataset.id);
});

document.getElementById('btnClearInbox').addEventListener('click', () => {
  inbox.length = 0;
  selectedInboxId = null;
  renderInbox();
});

document.getElementById('btnClearLog').addEventListener('click', () => {
  els.log.textContent = '';
});

setupTabs();
connectSse();
refreshHealth();
refreshSettings();
renderInbox();

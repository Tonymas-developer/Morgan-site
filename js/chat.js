/* ═══════════════════════════════════════════════
   chat.js — Shared user-side chat widget
   Requires: supabaseClient on window (from nav-auth.js)
   Works on: any page with the chat bubble HTML injected
═══════════════════════════════════════════════ */
(function(){
  var db, currentUser, chatOpen=false, chatChannel=null, unreadCount=0;

  /* Inject chat HTML into body */
  function injectChatHTML(){
    var html = '<button class="chat-bubble-btn" id="chat-bubble" onclick="window.chatWidget.toggle()" style="display:none" aria-label="Open support chat">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<span class="chat-bubble-badge" id="chat-unread-badge" style="display:none">0</span>' +
    '</button>' +
    '<div id="chat-widget-panel" class="chat-widget-panel" style="display:none">' +
      '<div class="chat-widget-header">' +
        '<div class="chat-widget-title">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f6e7c2" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
          'Support Chat' +
        '</div>' +
        '<button class="chat-widget-close" onclick="window.chatWidget.toggle()">&times;</button>' +
      '</div>' +
      '<div class="chat-status-bar" id="chat-status-bar">Connecting…</div>' +
      '<div class="chat-messages" id="chat-messages-box"></div>' +
      '<div class="chat-input-row">' +
        '<input type="text" id="chat-msg-input" class="chat-msg-input" placeholder="Type a message…" onkeydown="if(event.key===\'Enter\')window.chatWidget.send()">' +
        '<button class="chat-send-btn" onclick="window.chatWidget.send()">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>';

    var style = '<style>' +
    '.chat-bubble-btn{position:fixed;bottom:28px;right:28px;width:54px;height:54px;background:#a9683a;border-radius:50%;display:none;align-items:center;justify-content:center;cursor:pointer;z-index:1001;border:none;box-shadow:0 4px 18px rgba(169,104,58,.45);transition:transform .2s}' +
    '.chat-bubble-btn:hover{transform:scale(1.08)}' +
    '.chat-bubble-badge{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;background:#b0321e;border-radius:9px;font-size:10px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;padding:0 4px;font-family:Poppins,sans-serif}' +
    '.chat-widget-panel{position:fixed;bottom:94px;right:28px;width:340px;height:460px;z-index:1000;background:#f5f3ee;border:2px solid rgba(68,67,52,.2);box-shadow:0 8px 36px rgba(0,0,0,.2);display:none;flex-direction:column;animation:chatIn .2s ease}' +
    '@keyframes chatIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}' +
    '.chat-widget-header{background:#444334;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}' +
    '.chat-widget-title{font-family:bebas,sans-serif;font-size:20px;color:#f6e7c2;letter-spacing:.04em;display:flex;align-items:center;gap:8px}' +
    '.chat-widget-close{background:none;border:none;color:#f6e7c2;font-size:22px;cursor:pointer;opacity:.65;line-height:1;transition:opacity .2s}' +
    '.chat-widget-close:hover{opacity:1}' +
    '.chat-status-bar{background:rgba(169,104,58,.1);border-bottom:1px solid rgba(68,67,52,.1);padding:6px 14px;font-family:Poppins,sans-serif;font-size:11px;color:#a9683a;font-weight:600;flex-shrink:0}' +
    '.chat-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}' +
    '.chat-bubble-msg{max-width:82%;padding:9px 13px;font-family:Poppins,sans-serif;font-size:13px;line-height:1.45}' +
    '.chat-bubble-msg.user{align-self:flex-end;background:#a9683a;color:#fff}' +
    '.chat-bubble-msg.admin{align-self:flex-start;background:#fff;color:#444334;border:1px solid rgba(68,67,52,.12)}' +
    '.chat-bubble-msg.admin .chat-sender{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a9683a;margin-bottom:3px}' +
    '.chat-bubble-msg .chat-time{font-size:10px;opacity:.55;margin-top:3px;text-align:right}' +
    '.chat-input-row{display:flex;gap:0;border-top:1px solid rgba(68,67,52,.12);flex-shrink:0}' +
    '.chat-msg-input{flex:1;padding:11px 14px;border:none;outline:none;font-family:Poppins,sans-serif;font-size:13px;color:#444334;background:#fff}' +
    '.chat-send-btn{padding:11px 16px;background:#444334;border:none;color:#f6e7c2;cursor:pointer;transition:background .2s;flex-shrink:0}' +
    '.chat-send-btn:hover{background:#a9683a}' +
    '.chat-empty-state{text-align:center;padding:32px 16px;color:#bbb;font-family:Poppins,sans-serif;font-size:13px}' +
    '@media(max-width:480px){.chat-widget-panel{right:0;bottom:80px;width:100vw;border-left:none;border-right:none}}' +
    '</style>';

    document.head.insertAdjacentHTML('beforeend', style);
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function escHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function fmtTime(ts){
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  }

  function updateBadge(){
    var badge = document.getElementById('chat-unread-badge');
    if (!badge) return;
    if (unreadCount > 0){
      badge.style.display='flex';
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
      badge.style.display='none';
    }
  }

  function appendMsg(msg, role, ts, scroll){
    var box = document.getElementById('chat-messages-box');
    if (!box) return;
    /* Remove empty state */
    var empty = box.querySelector('.chat-empty-state');
    if (empty) empty.remove();

    var div = document.createElement('div');
    div.className = 'chat-bubble-msg ' + role;
    div.innerHTML = (role==='admin' ? '<div class="chat-sender">Support</div>' : '') +
      escHtml(msg) +
      '<div class="chat-time">' + fmtTime(ts) + '</div>';
    box.appendChild(div);
    if (scroll !== false) box.scrollTop = box.scrollHeight;
  }

  async function loadHistory(){
    if (!db || !currentUser) return;
    var res = await db.from('chat_messages')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', {ascending:true})
      .limit(80);

    var box = document.getElementById('chat-messages-box');
    if (!box) return;
    box.innerHTML = '';

    var msgs = res.data || [];
    if (!msgs.length){
      box.innerHTML = '<div class="chat-empty-state">👋 Hi! Send us a message and our team will reply shortly.</div>';
    } else {
      msgs.forEach(function(m){ appendMsg(m.message, m.sender_role, m.created_at, false); });
      box.scrollTop = box.scrollHeight;
    }
  }

  function subscribeRealtime(){
    if (!db || !currentUser) return;
    chatChannel = db.channel('user-chat-' + currentUser.id)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: 'user_id=eq.' + currentUser.id
      }, function(payload){
        var m = payload.new;
        if (m.sender_role === 'admin'){
          appendMsg(m.message, 'admin', m.created_at);
          if (!chatOpen){
            unreadCount++;
            updateBadge();
            /* Flash the bubble */
            var btn = document.getElementById('chat-bubble');
            if (btn){ btn.style.transform='scale(1.2)'; setTimeout(function(){ btn.style.transform=''; },400); }
          }
        }
      })
      .subscribe(function(status){
        var bar = document.getElementById('chat-status-bar');
        if (bar) bar.textContent = status==='SUBSCRIBED' ? '🟢 Online — we\'ll reply shortly' : 'Connecting…';
      });
  }

  /* Public API */
  window.chatWidget = {
    toggle: function(){
      chatOpen = !chatOpen;
      var panel = document.getElementById('chat-widget-panel');
      if (!panel) return;
      panel.style.display = chatOpen ? 'flex' : 'none';
      if (chatOpen){
        unreadCount = 0;
        updateBadge();
        loadHistory();
        var input = document.getElementById('chat-msg-input');
        if (input) setTimeout(function(){ input.focus(); }, 100);
      }
    },
    send: async function(){
      var input = document.getElementById('chat-msg-input');
      if (!input) return;
      var msg = input.value.trim();
      if (!msg || !currentUser) return;
      input.value = '';
      appendMsg(msg, 'user', new Date().toISOString());
      await db.from('chat_messages').insert({ user_id: currentUser.id, sender_role: 'user', message: msg });
    }
  };

  /* Init */
  async function init(){
    injectChatHTML();
    /* Wait for supabase client */
    var tries = 0;
    var wait = setInterval(async function(){
      tries++;
      if (window.supabaseClient){
        clearInterval(wait);
        db = window.supabaseClient;
        try {
          var s = await db.auth.getSession();
          if (s.data && s.data.session && s.data.session.user){
            /* Don't show chat for admin users */
            var profRes = await db.from('profiles').select('is_admin').eq('id', s.data.session.user.id).single();
            if (profRes.data && profRes.data.is_admin) return;
            currentUser = s.data.session.user;
            var btn = document.getElementById('chat-bubble');
            if (btn) btn.style.display='flex';
            subscribeRealtime();
          }
        } catch(e){}
      }
      if (tries > 30) clearInterval(wait);
    }, 200);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
   engine.js — GHOST//NET operator console.
   Drives the split screen: left hacker panel, right fake browser
   wrapping a real iframe target. Targets report a solve via
   window.postMessage({type:'ghostnet:solved', level:N}).
   ============================================================ */

const STORE = 'ghostnet_progress_v2';
const RANKS = [
  {min:0,name:'SCRIPT KIDDIE'},{min:1,name:'INITIATE'},{min:3,name:'OPERATIVE'},
  {min:5,name:'INFILTRATOR'},{min:7,name:'PHANTOM'},{min:10,name:'GHOST'}
];

/* Each level points at a REAL target page in /targets.
   routes maps a typed URL path -> the file the iframe loads.
   The first route is the "home" the level opens on. */
const LEVELS = [
  { id:1, code:'NODE-01', host:'edge', title:'First Contact', concept:'VIEW SOURCE',
    badge:{name:'Source Seeker',color:'#00f0ff',glyph:'</>'},
    routes:[['/maint/login','level1.html']],
    brief:`<span class="from">ORACLE //</span> Welcome to the grid, recruit. OMNICORP left a maintenance
      login exposed. Their devs hid the passphrase right in the page they shipped to your browser.
      Rule one: <b>nothing your browser receives is secret.</b> Pop open DevTools and go find it.`,
    devtip:`Right-click the page → <b>Inspect</b>, or hit <span class="kbd">F12</span>. Try the
      <b>Elements</b> tab and the <b>Sources</b> tab. Even faster for raw HTML: <span class="kbd">Ctrl/Cmd+U</span> (View Source) in a normal tab.`,
    hints:[
      `Devs leave notes in <b>HTML comments</b> (<code>&lt;!-- ... --&gt;</code>) and plain JS variables.`,
      `In <b>Sources</b>, open the page's script. Scan for a line like <code>password = '...'</code>.`,
      `Whatever sits between the quotes is the passphrase. Type it into the form and authenticate.`
    ],
    intel:{tag:'INTEL DROP',title:'Client-Side ≠ Secret',
      body:`Everything a browser renders — HTML, CSS, JS, comments — is downloaded to the user first.
      DevTools and "View Source" just read what's already there. Secrets (passwords, API keys, logic)
      must live on the <b>server</b>. Pros grep delivered source for <code>password</code>, <code>apiKey</code>,
      <code>token</code>, <code>secret</code>. You just did recon.`}},

  { id:2, code:'NODE-02', host:'portal', title:'Hidden in Plain Sight', concept:'FORM TAMPERING',
    badge:{name:'Form Bender',color:'#39ff14',glyph:'▤'},
    routes:[['/account','level2.html']],
    brief:`<span class="from">ORACLE //</span> Stop trusting forms. This portal greys out "Admin" and ships a
      <b>hidden field</b> tagging you as a guest. That field lives in <i>your</i> browser. Edit the live DOM
      and walk in.`,
    devtip:`Open <b>Elements</b>, find the form. Double-click an attribute value to edit it live. You can
      delete a <code>disabled</code> attribute or change a hidden input's <code>value</code> right there.`,
    hints:[
      `Look for <code>&lt;input type="hidden" name="access_level"&gt;</code> in the Elements tree.`,
      `Double-click its <code>value</code> and change <code>guest</code> → <code>admin</code>.`,
      `Then submit the form. The page reads the live value you edited.`
    ],
    intel:{tag:'INTEL DROP',title:'Never Trust the Client to Police Itself',
      body:`Hidden inputs, <code>disabled</code> buttons, <code>readonly</code> fields and dropdown limits are
      <b>UI conveniences, not security</b>. The user controls every byte sent back. Servers must re-verify
      every value — re-check that this user may actually be "admin." Trusting <code>access_level=admin</code>
      from the client is how privilege-escalation bugs are born.`}},

  { id:3, code:'NODE-03', host:'vault', title:"Don't Trust the Script", concept:'CLIENT-SIDE VALIDATION',
    badge:{name:'Logic Breaker',color:'#ff2bd6',glyph:'ƒ'},
    routes:[['/unlock','level3.html']],
    brief:`<span class="from">ORACLE //</span> OMNICORP now checks your key with JavaScript before any server
      sees it. They think that's security. It runs on <b>your</b> CPU and the correct key is assembled right
      in front of you. Read the machine, beat the machine.`,
    devtip:`In <b>Console</b> you can run the page's own functions and read its variables. You can also set a
      <b>breakpoint</b> in Sources and step through. Or just call <code>check()</code> logic yourself.`,
    hints:[
      `The key isn't plain text — it's built with <code>String.fromCharCode(...)</code>.`,
      `In the Console, paste the same <code>String.fromCharCode(72,73,...)</code> call to decode it.`,
      `Or type <code>__key</code> / inspect the validator in Sources. Enter the decoded key.`
    ],
    intel:{tag:'INTEL DROP',title:'Validation Belongs on the Server',
      body:`Client checks improve UX and stop honest mistakes, but an attacker reads the logic, skips it, or
      calls the success path directly. <b>Obfuscation is not encryption</b> — char codes, base64, reversed
      strings buy seconds. Any check that decides access must run where the user can't edit it: the server.`}},

  { id:4, code:'NODE-04', host:'news', title:'The Cookie Jar', concept:'CLIENT STORAGE TAMPERING',
    badge:{name:'State Shifter',color:'#ffb000',glyph:'⛁'},
    routes:[['/portal','level4.html']],
    brief:`<span class="from">ORACLE //</span> Sites remember you with tags they leave in your browser —
      cookies and local storage. This news portal decides if you're staff by reading <code>role</code>.
      Guess where that lives? Rewrite your own badge.`,
    devtip:`Open the <b>Application</b> tab (Chrome) / <b>Storage</b> (Firefox). Find <b>Local Storage</b>,
      pick this site, and edit the <code>role</code> value. You can also run
      <code>localStorage.role='admin'</code> in the Console.`,
    hints:[
      `The portal stores <code>omnicorp_role</code> in Local Storage with value <code>guest</code>.`,
      `Change it to <code>staff</code> via the Application tab or <code>localStorage.omnicorp_role='staff'</code>.`,
      `Then click <b>Reload portal</b> on the page (or refresh the frame).`
    ],
    intel:{tag:'INTEL DROP',title:'Cookies & Local Storage Are User-Editable',
      body:`Cookies, <code>localStorage</code> and <code>sessionStorage</code> live on the client and can be
      rewritten freely. Storing <code>role=user</code> and trusting it is the hidden-field bug, persisted.
      Real systems issue <b>signed, server-verified session tokens</b> so tampering is detectable.`}},

  { id:5, code:'NODE-05', host:'www', title:'Roads Not Linked', concept:'INFORMATION DISCLOSURE',
    badge:{name:'Path Finder',color:'#00f0ff',glyph:'⌖'},
    routes:[['/','level5.html'],['/robots.txt','robots.txt'],['/sys-admin-7y2','level5_admin.html']],
    brief:`<span class="from">ORACLE //</span> They hide admin panels by simply not linking them — "security
      through obscurity." But sites politely list the doors they don't want crawled in a public file:
      <code>robots.txt</code>. A literal map to the hidden rooms. Read it, then walk in.`,
    devtip:`Use the fake browser's <b>address bar</b> up top. Edit the path and press Enter to navigate —
      just like a real browser.`,
    hints:[
      `Almost every site serves <code>/robots.txt</code>. Navigate the address bar there.`,
      `<code>Disallow:</code> lines say where crawlers shouldn't go — i.e. exactly where YOU should.`,
      `Type the disallowed admin path into the address bar and hit Enter.`
    ],
    intel:{tag:'INTEL DROP',title:'Obscurity Is Not Security',
      body:`<code>robots.txt</code>, sitemaps, JS source and predictable URLs (<code>/admin</code>,
      <code>/backup.zip</code>, <code>/.git/</code>) all leak structure. Hiding a page without protecting it
      means anyone who reads the map walks in. Real protection is <b>auth on every sensitive endpoint</b>.`}},

  { id:6, code:'NODE-06', host:'config', title:'Cipher of Fools', concept:'ENCODING ≠ ENCRYPTION',
    badge:{name:'Cryptographer',color:'#39ff14',glyph:'⟐'},
    routes:[['/db','level6.html']],
    brief:`<span class="from">ORACLE //</span> We grabbed an OMNICORP config. The DB password is "protected"…
      by Base64. That's a costume, not a lock. Strip it off.`,
    devtip:`The <b>Console</b> is a calculator. <code>atob("...")</code> decodes Base64;
      <code>btoa("...")</code> encodes it. Paste the captured string and decode.`,
    hints:[
      `Base64 is reversible by anyone — often ends in <code>=</code>.`,
      `Run <code>atob("&lt;captured&gt;")</code> in the Console.`,
      `If the result is still gibberish, it's double-wrapped — decode it again.`
    ],
    intel:{tag:'INTEL DROP',title:'Know Your Encodings',
      body:`Base64, hex, URL-encoding and ROT13 are <b>encodings</b>: reversible, keyless. Encryption needs a
      secret key; encoding needs nothing. Credentials "secured" with Base64 are a classic audit finding.`}},

  { id:7, code:'NODE-07', host:'crm', title:'The Injection', concept:'SQL INJECTION',
    badge:{name:'Injector',color:'#ff2bd6',glyph:'⌥'},
    routes:[['/login','level7.html']],
    brief:`<span class="from">ORACLE //</span> The real art. This login glues your typing straight into a
      database query. The right punctuation rewrites the question itself — turning "is this password correct?"
      into "is anything true?" The technique that breached banks and governments. Learn it so you can shut it.`,
    devtip:`No DevTools needed here — just the login form. Watch the <b>live query</b> the page shows as you
      type; make its <code>WHERE</code> clause always true.`,
    hints:[
      `The server builds <code>... WHERE name='<i>YOU</i>' AND pass='<i>YOU</i>'</code>. Your input lands in the quotes.`,
      `A single quote <code>'</code> ends their string. Then add logic: <code>OR '1'='1</code> — always true.`,
      `Username: <code>' OR '1'='1</code> &nbsp;and append <code>--</code> to comment out the rest. Any password.`
    ],
    intel:{tag:'INTEL DROP',title:'Parameterized Queries Kill Injection',
      body:`Injection = <b>user input treated as code</b>. The fix isn't banning apostrophes — it's
      <b>prepared statements / parameterized queries</b>: the DB is told "here's the query, here are values,"
      so input can't change structure. Same idea defends command & NoSQL injection.`}},

  { id:8, code:'NODE-08', host:'app', title:'Forged Papers', concept:'TOKEN TAMPERING',
    badge:{name:'Escalator',color:'#ffb000',glyph:'⬆'},
    routes:[['/session','level8.html']],
    brief:`<span class="from">ORACLE //</span> OMNICORP upgraded: you now get a "session token" that <i>is</i>
      your identity card — a chunk of Base64. They forgot to <b>sign</b> it. Decode your card, promote yourself
      to admin, re-encode, hand it back. Forgery 101.`,
    devtip:`Find the token in <b>Application → Local Storage</b> under the key <code>omnicorp_token</code>.
      Decode with <code>atob()</code> in the Console, edit the JSON, re-encode with <code>btoa()</code>, and
      write it back: <code>localStorage.omnicorp_token = btoa(JSON.stringify(obj))</code>. (Reloading the page
      restores the default token, so apply your edit with <b>Verify session</b> — no reload needed.)`,
    hints:[
      `The token <code>omnicorp_token</code> is Base64 of JSON like <code>{"user":"recruit","role":"user"}</code>.`,
      `Decode it, change <code>"role":"user"</code> → <code>"role":"admin"</code>.`,
      `Re-encode (<code>btoa</code>), write it back to <code>omnicorp_token</code> in Local Storage, then click <b>Verify session</b> (don't reload — that resets it).`
    ],
    intel:{tag:'INTEL DROP',title:'Sign Your Tokens (JWT & Friends)',
      body:`Real tokens (JWT) carry a <b>cryptographic signature</b>. Edit the payload and the signature breaks,
      so the server rejects it. OMNICORP's token had a readable payload but <b>no signature check</b> — anyone
      could self-promote. Verify signatures server-side; never accept <code>alg:none</code>.`}},

  { id:9, code:'NODE-09', host:'support', title:'Cross the Line', concept:'CROSS-SITE SCRIPTING (XSS)',
    badge:{name:'Phantom Script',color:'#00f0ff',glyph:'§'},
    routes:[['/wall','level9.html']],
    brief:`<span class="from">ORACLE //</span> Last technique before the big job. This support wall takes your
      message and drops it into the page as <b>raw HTML</b> instead of plain text.
      <b>Objective:</b> get a <code>&lt;script&gt;</code> tag to land in the wall. It doesn't matter what the
      script does — a harmless <code>&lt;script&gt;alert('xss')&lt;/script&gt;</code> is enough. If the site
      accepts and runs your tag at all, that <i>is</i> the vulnerability. Prove it.`,
    devtip:`Solved right in the message box on the page — no DevTools needed. Type a script tag into the field
      and post it. You're not writing a useful program; you're proving the page will run <b>any</b> code you give
      it. The content is irrelevant — that it executes is the whole point.`,
    hints:[
      `The goal is just to inject a <code>&lt;script&gt;&lt;/script&gt;</code> tag into the support wall. You don't need it to <i>do</i> anything — getting it accepted is the win.`,
      `Literally paste <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> into the message box and click Post.`,
      `An image with a broken source also works: <code>&lt;img src=x onerror=alert(1)&gt;</code>. The moment any executable tag posts, the node breaks.`
    ],
    intel:{tag:'INTEL DROP',title:'Encode Output, Sanitize Input',
      body:`XSS happens when input is rendered as <b>HTML/JS</b> instead of text. Defenders <b>escape output</b>
      (<code>&lt;</code> → <code>&amp;lt;</code>), sanitize rich input with a vetted library, and set a
      <b>Content-Security-Policy</b>. Stored XSS — saved and served to others — is the nastiest, exactly what
      you just did to the admin.`}},

  { id:10, code:'NODE-10', host:'core', title:'The Mainframe', concept:'CHAINING THE KILL',
    badge:{name:'GHOST',color:'#ff2bd6',glyph:'☠'},
    routes:[['/','level10.html'],['/core/_mtc_8841','level10_gate.html']],
    brief:`<span class="from">ORACLE //</span> This is it. OMNICORP's core — every defense at once. No single
      trick opens it; you'll <b>chain</b> what you learned. Recon the source for a hidden endpoint, decode the
      leaked token, then inject through the final gate. Do this and you're a <b>Ghost</b>. Go dark.`,
    devtip:`Everything you've used: <b>Sources</b> (find the hidden endpoint comment), <b>Console</b>
      (<code>atob</code> the leaked token), the <b>address bar</b> (navigate to the endpoint), and SQLi at the gate.`,
    hints:[
      `Step 1 — recon: Inspect the core page's source for a commented-out maintenance endpoint path.`,
      `Step 2 — decode: the source leaks a Base64 <code>bootstrap_token</code>; <code>atob()</code> it to read the maint username.`,
      `Step 3 — inject: at the gate, put the leaked username in the <b>Maint username</b> field and a SQL tautology in the <b>Auth string</b> — e.g. username <code>root_kx</code>, auth <code>' OR '1'='1' --</code>. (Putting it all in the username, <code>root_kx' OR '1'='1' --</code>, works too.)`
    ],
    intel:{tag:'FINAL INTEL',title:'Attackers Chain, Defenders Layer',
      body:`Real breaches are rarely one flaw — they're a <b>chain</b>: recon → disclosure → weak crypto →
      injection → escalation, each gap enabling the next. That's why defense is <b>layered</b> (defense in
      depth): if one control fails, the next should stop the chain. You now think in chains — which is exactly
      what lets you break them for the people who hire you to.`}}
];

/* ---------- state ---------- */
function load(){ try{return JSON.parse(localStorage.getItem(STORE))||{done:[],codename:''}}catch(e){return{done:[],codename:''}} }
function save(s){ localStorage.setItem(STORE, JSON.stringify(s)); }
let state = load();
let current = 1;

const isDone = id => state.done.includes(id);
const unlocked = id => id===1 || isDone(id-1);
const rankFor = n => { let r=RANKS[0].name; for(const x of RANKS) if(n>=x.min) r=x.name; return r; };
const L = id => LEVELS.find(x=>x.id===id);

function markSolved(id){ if(!isDone(id)){ state.done.push(id); state.done.sort((a,b)=>a-b); save(state);} }

/* ---------- badge shield ---------- */
function shield(color,glyph,key){
  return `<svg viewBox="0 0 60 68" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="s${key}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#02080b"/></linearGradient></defs>
    <path d="M30 2 L56 12 V34 C56 50 44 60 30 66 C16 60 4 50 4 34 V12 Z" fill="url(#s${key})" stroke="${color}" stroke-width="2"/>
    <text x="30" y="40" font-size="22" text-anchor="middle" fill="${color}" font-family="monospace" font-weight="bold">${glyph}</text></svg>`;
}

/* ---------- dom refs ---------- */
const $ = s => document.querySelector(s);
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2600); }

/* ---------- fake browser ---------- */
let navStack=[];
function urlFor(lvl, path){ return `https://${lvl.host}.omnicorp.net${path}`; }
function resolve(lvl, path){
  path = (path||'').trim();
  // accept either a full url or a bare path
  const m = path.match(/^https?:\/\/[^/]+(\/.*)?$/i); if(m) path = m[1]||'/';
  if(!path.startsWith('/')) path = '/'+path;
  path = path.replace(/\/+$/,'') || '/';
  const hit = lvl.routes.find(r=> r[0].replace(/\/+$/,'')===path || r[0]===path );
  return hit ? hit[1] : null;
}
function navigate(path, pushHistory=true){
  const lvl=L(current);
  const file=resolve(lvl, path);
  const frame=$('#frame'), addr=$('#addr');
  if(file){
    if(pushHistory) navStack.push(path);
    addr.value = urlFor(lvl, lvl.routes.find(r=>r[1]===file)[0]);
    frame.src = `targets/${file}`;
  } else {
    addr.value = urlFor(lvl, path.startsWith('/')?path:'/'+path);
    frame.src = `targets/404.html`;
  }
}
function openLevel(id){
  if(!unlocked(id)){ toast('Locked — breach NODE-0'+(id-1)+' first'); return; }
  current=id; navStack=[]; closeOverlay();
  const lvl=L(id);
  navigate(lvl.routes[0][0], true);
  renderPanel();
}

/* ---------- panel render ---------- */
let hintsShown=0, intelShown=false;
function renderHeader(){
  const n=state.done.length;
  $('#rk').textContent=rankFor(n);
  $('#cn').textContent=state.codename||'recruit';
  $('#prog').textContent=n+'/'+LEVELS.length;
  $('#progbar').style.width=(n/LEVELS.length*100)+'%';
}
function renderPanel(){
  hintsShown=0; intelShown=false;
  const lvl=L(current); const done=isDone(current);
  renderHeader();
  $('#pbody').innerHTML=`
    <div class="nodehead">
      <span class="pill mag">${lvl.code}</span>
      <span class="pill">CONCEPT · ${lvl.concept}</span>
      ${done?'<span class="pill green">✓ breached</span>':''}
    </div>
    <div class="ttl glitch" data-t="${lvl.title}">${lvl.title}</div>
    <div class="brief">${lvl.brief}</div>

    <div class="devtip"><div class="k">⌘</div><div><b style="color:var(--cyan)">DEVTOOLS BRIEF —</b> ${lvl.devtip}</div></div>

    <div class="sec">
      <div class="row"><h4>⚑ INTEL & HINTS</h4><span class="spacer"></span>
        <button class="btn ghost sm" id="hintBtn">request hint</button>
        <button class="btn mag sm" id="intelBtn">intel dossier</button></div>
      <div class="mut" style="font-size:12px;margin-top:6px">Pull hints one at a time. The dossier explains the concept once you breach the node (or whenever you need it).</div>
      <div id="hintArea"></div>
      <div id="intelArea"></div>
    </div>

    <div class="sec">
      <div class="row">
        <button class="btn ghost sm" id="prevBtn" ${current===1?'disabled':''}>← prev</button>
        <button class="btn ghost sm" id="reloadBtn">⟳ reload target</button>
        <span class="spacer"></span>
        <button class="btn ${done?'':'ghost'} sm" id="nextBtn" ${current<LEVELS.length && unlocked(current+1)?'':'disabled'}>next →</button>
      </div>
    </div>`;

  $('#prevBtn').onclick=()=>{ if(current>1) openLevel(current-1); };
  $('#nextBtn').onclick=()=>{ if(current<LEVELS.length && unlocked(current+1)) openLevel(current+1); };
  $('#reloadBtn').onclick=()=>{ $('#frame').src = $('#frame').src; };
  $('#hintBtn').onclick=()=>{
    if(hintsShown>=lvl.hints.length){ toast('No more hints — you have everything you need'); return; }
    const h=document.createElement('div'); h.className='hint';
    h.innerHTML='<b>HINT '+(hintsShown+1)+'/'+lvl.hints.length+' »</b> '+lvl.hints[hintsShown];
    $('#hintArea').appendChild(h); hintsShown++;
  };
  $('#intelBtn').onclick=()=>revealIntel(false);
  if(done) revealIntel(false);
}
function revealIntel(auto){
  const lvl=L(current); if(intelShown) return; intelShown=true;
  $('#intelArea').innerHTML=`
    <div class="intel"><span class="tag">${lvl.intel.tag}</span><h5>${lvl.intel.title}</h5>
      <div>${lvl.intel.body}</div>
      <div class="row" style="margin-top:12px">
        <span class="shield" style="width:auto">${shield(lvl.badge.color,lvl.badge.glyph,lvl.id)}</span>
        <div><div class="ok" style="font-size:11px">SHIELD EARNED</div><b style="color:#fff">${lvl.badge.name}</b></div>
      </div></div>`;
  if(auto) $('#intelArea').scrollIntoView({behavior:'smooth',block:'center'});
}

/* ---------- overlay (grid + badges) ---------- */
function openOverlay(){ renderOverlay(); $('#overlay').classList.add('show'); }
function closeOverlay(){ $('#overlay').classList.remove('show'); }
function renderOverlay(){
  const n=state.done.length;
  const cards=LEVELS.map(l=>{
    const d=isDone(l.id), o=unlocked(l.id), act=l.id===current;
    const st=d?'<span class="ok">✓ breached</span>':o?'<span class="warn">◉ available</span>':'<span class="mut">locked</span>';
    return `<div class="lvl ${d?'done':''} ${o?'':'locked'} ${act?'active':''}" data-id="${l.id}">
      ${o?'':'<span class="lk">🔒</span>'}<div><div class="nc">${l.code}</div><div class="nt">${l.title}</div></div>
      <div class="ns">${st}</div></div>`;
  }).join('');
  const badges=LEVELS.map(l=>{const g=isDone(l.id);
    return `<div class="shield ${g?'':'empty'}">${shield(g?l.badge.color:'#557',l.badge.glyph,'o'+l.id)}<div class="bn">${g?l.badge.name:'— locked —'}</div></div>`;}).join('');
  $('#overlay').innerHTML=`<div class="osheet">
    <div class="row"><div class="logo">GHOST<span class="s">//</span>NET</div><span class="spacer"></span>
      <button class="btn ghost sm" id="closeOv">✕ close</button></div>
    <div class="row" style="margin-top:14px">
      <div class="mut" style="font-size:12px">rank <span class="rk">${rankFor(n)}</span> · ${n}/${LEVELS.length} nodes breached · codename
        <input class="cn" id="cnEdit" value="${state.codename||''}" placeholder="recruit" maxlength="18" style="width:130px">
        <button class="btn ghost sm" id="cnSave">set</button></div></div>
    <div class="grid">${cards}</div>
    <div class="sec"><h4>▣ SHIELD WALL</h4><div class="badges">${badges}</div></div>
    <div class="sec mut" style="font-size:12px;line-height:1.7">
      <b class="warn">⚠ ETHICS —</b> These skills are for <b>defending</b> systems and testing ones you own or
      have written permission to test. Unauthorized hacking is illegal. Be a Ghost, not a crook.
      <div style="margin-top:10px"><button class="btn ghost sm" id="resetBtn">⟲ reset all progress</button></div>
    </div></div>`;
  $('#closeOv').onclick=closeOverlay;
  $('#cnSave').onclick=()=>{ state.codename=$('#cnEdit').value.trim(); save(state); renderHeader(); toast('Codename set'); };
  $('#resetBtn').onclick=()=>{ if(confirm('Wipe all progress and badges?')){ state={done:[],codename:state.codename}; save(state); renderOverlay(); renderPanel(); toast('Grid reset'); } };
  $('#overlay').querySelectorAll('.lvl').forEach(c=>c.onclick=()=>openLevel(+c.dataset.id));
}

/* ---------- celebrate ---------- */
function celebrate(id){
  const lvl=L(id), n=state.done.length, final=(id===10);
  const box=$('#mbox');
  if(final){
    box.innerHTML=`<div class="glitch" data-t="// YOU ARE A GHOST //" style="font-size:24px;color:#fff;letter-spacing:2px">// YOU ARE A GHOST //</div>
      <div class="badges" style="justify-content:center;margin:18px 0">${LEVELS.map(l=>`<div class="shield">${shield(l.badge.color,l.badge.glyph,'f'+l.id)}<div class="bn">${l.badge.name}</div></div>`).join('')}</div>
      <div class="brief" style="text-align:left;margin:10px 0"><span class="from">ORACLE //</span> The mainframe is ours.
        You came in a script kiddie; you leave a <b style="color:var(--mag)">Ghost</b> — ten techniques deep, all ten shields earned.
        Now use them right: break what's yours, fix what isn't, never stop reading the source. Welcome to the Collective.</div>
      <button class="btn mag" id="mClose">return to the grid</button>`;
  } else {
    box.innerHTML=`<div style="font-size:12px;letter-spacing:3px;color:var(--green)">NODE BREACHED</div>
      <div class="shield" style="width:auto;margin:14px auto">${shield(lvl.badge.color,lvl.badge.glyph,'c'+id)}</div>
      <div style="color:#fff;font-size:18px">${lvl.badge.name}</div>
      <div class="mut" style="font-size:12px;margin:8px 0">mastered: <b style="color:var(--cyan)">${lvl.concept}</b> · rank <b class="ok">${rankFor(n)}</b> · ${n}/${LEVELS.length}</div>
      <div class="row" style="justify-content:center;margin-top:8px">
        <button class="btn ghost" id="mClose">grid</button>
        ${id<LEVELS.length?'<button class="btn" id="mNext">next node →</button>':''}</div>`;
  }
  $('#modal').classList.add('show');
  $('#mClose').onclick=()=>{ $('#modal').classList.remove('show'); if(final) openOverlay(); };
  const nx=$('#mNext'); if(nx) nx.onclick=()=>{ $('#modal').classList.remove('show'); openLevel(id+1); };
}

/* ---------- solve handling ---------- */
function handleSolved(id){
  if(!id || id!==current) { /* allow solving the active node only */ if(id!==current) return; }
  const first=!isDone(id);
  markSolved(id);
  renderHeader();
  if(first){ revealIntel(true); celebrate(id); }
  else toast('Node already breached');
}
window.addEventListener('message', e=>{
  const d=e.data||{};
  if(d.type==='ghostnet:solved') handleSolved(+d.level);
});
/* storage fallback (in case postMessage is blocked) */
setInterval(()=>{
  const k='ghostnet_solved_'+current;
  if(localStorage.getItem(k)==='1'){ localStorage.removeItem(k); handleSolved(current); }
}, 800);

/* ---------- address bar wiring ---------- */
function wireChrome(){
  $('#addr').addEventListener('keydown', e=>{ if(e.key==='Enter') navigate(e.target.value, true); });
  $('#goBtn').onclick=()=>navigate($('#addr').value, true);
  $('#backBtn').onclick=()=>{ if(navStack.length>1){ navStack.pop(); navigate(navStack[navStack.length-1], false); } };
  $('#reBtn').onclick=()=>{ $('#frame').src=$('#frame').src; };
}

/* ---------- boot ---------- */
function boot(){
  wireChrome();
  const logo=$('#logoBtn'); if(logo){ logo.style.cursor='pointer'; logo.onclick=openOverlay; }
  const gb=$('#gridBtn'); if(gb) gb.onclick=openOverlay;
  // resume at the furthest unlocked node
  let start=1; for(let i=1;i<=LEVELS.length;i++){ if(unlocked(i)) start=i; }
  openLevel(state.done.length? Math.min(start,LEVELS.length) : 1);
  if(!state.codename){ setTimeout(openOverlay, 400); }
}
document.addEventListener('DOMContentLoaded', boot);

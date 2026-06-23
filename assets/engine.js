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
    brief:`<span class="from">ORACLE //</span> Welcome to the grid, {cn}. OMNICORP left a maintenance
      login exposed. Their devs hid the passphrase right in the page they shipped to your browser.
      Rule one: <b>nothing your browser receives is secret.</b> Pop open DevTools and go find it.`,
    devtip:`Right-click the page → <b>Inspect</b>, or hit <span class="kbd">F12</span>. Use the
      <b>Elements</b> tab to read the live DOM. Fastest of all: <span class="kbd">Option/Ctrl+Cmd+F</span> for
      DevTools' global search, which scans every script for a keyword. (Heads up: plain View Source —
      <span class="kbd">Cmd+U</span> — won't help here; the target runs in a frame, so it only shows the outer shell.)`,
    hints:[
      `Devs sometimes accidentally leave sensitive information hardcoded as variables and forget to move them server side.`,
      `Right click somewhere in the page and select <b>Inspect</b>. Look for something that could be a password.`,
      `Press <span class="kbd">Option + Command + F</span> to open the Search bar. Type in <code>MAINT_PASSPHRASE</code> and hit enter. The password is in between the <code>' '</code>.`
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
      `The page decides whether you're admin from a value it ships to your browser and trusts right back. Find where your access tier actually lives.`,
      `Right-click → <b>Inspect</b> and scan the form in the Elements tree for a hidden field — <code>&lt;input type="hidden" name="access_level"&gt;</code>. Its value is <code>guest</code>, and the "submission payload" line on the page echoes it live.`,
      `Double-click that hidden input's <code>value</code> in the Elements tree, change <code>guest</code> to <code>admin</code>, then click <b>Enter Dashboard</b>. The page submits whatever you set.`
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
      `The check runs entirely on your machine, and the correct key is assembled right there in the page's script — so you can just read it off.`,
      `Open <b>Inspect</b> and use the global search (<span class="kbd">Option/Ctrl+Cmd+F</span>) for <code>__key</code>. You'll see it's built with <code>String.fromCharCode(...)</code> instead of stored as plain text.`,
      `In the <b>Console</b>, any of these reveals the key — pick whichever clicks for you, hit Enter, then type the result into the form:<br>• just type <code>__key</code> and Enter — the variable already holds the decoded string<br>• <code>console.log(__key)</code> — same thing, printed explicitly<br>• re-run the decode yourself: <code>String.fromCharCode(71,104,48,115,116,75,101,121)</code><br>• or wrap that: <code>console.log(String.fromCharCode(71,104,48,115,116,75,101,121))</code><br>All four hand you the same access key.`
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
      `This portal reads your "badge" from a value parked in your own browser — which means you can quietly rewrite it.`,
      `Open <b>Inspect</b> → <b>Application</b> tab (Chrome) / <b>Storage</b> (Firefox) → <b>Local Storage</b>, and pick this site. You'll find <code>omnicorp_role</code> set to <code>guest</code>.`,
      `Change that value to <code>staff</code> — double-click it in the Application tab, or run <code>localStorage.omnicorp_role='staff'</code> in the Console — then click <b>Reload portal</b>.`
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
      `The admin panel isn't linked from anywhere — but the site politely publishes a list of paths it doesn't want crawlers visiting. Go read that list.`,
      `Type <code>/robots.txt</code> into the fake browser's address bar and press Enter. The <code>Disallow:</code> lines mark where crawlers shouldn't go — i.e. exactly where you should.`,
      `One of those lines is <code>/sys-admin-7y2/</code>. Type that path into the address bar, hit Enter, and walk straight into the unlisted console.`
    ],
    intel:{tag:'INTEL DROP',title:'Obscurity Is Not Security',
      body:`<code>robots.txt</code>, sitemaps, JS source and predictable URLs (<code>/admin</code>,
      <code>/backup.zip</code>, <code>/.git/</code>) all leak structure. Hiding a page without protecting it
      means anyone who reads the map walks in. Real protection is <b>auth on every sensitive endpoint</b>.`}},

  { id:6, code:'NODE-06', host:'config', title:'Cipher of Fools', concept:'ENCODING ≠ ENCRYPTION',
    badge:{name:'Cryptographer',color:'#39ff14',glyph:'⟐'},
    routes:[['/db','level6.html'],['/.env.backup','level6_env.html']],
    brief:`<span class="from">ORACLE //</span> OMNICORP's database console won't show you the password — but their
      migration tooling keeps dumping environment <b>backup files</b> into the web root and forgetting to delete them.
      Find the leak, then strip the "encryption" off the credential inside. It's only Base64 — a costume, not a lock.`,
    devtip:`Navigate with the fake browser's <b>address bar</b> (like NODE-05) to reach the stray file. Then the
      <b>Console</b> is your calculator: <code>atob("...")</code> decodes Base64, <code>btoa("...")</code> encodes it.`,
    hints:[
      `The <code>/db</code> page deliberately doesn't display the password — but read the deploy note on it. It points at the real mistake: a backup file left sitting in the web root.`,
      `The note names <code>/.env.backup</code>. Type that into the address bar and hit Enter to read the leaked environment file. Inside, <code>DB_PASS</code> is Base64 (note the trailing <code>==</code>) — encoding, not encryption. New to Base64? <a href="https://en.wikipedia.org/wiki/Base64" target="_blank" rel="noopener">en.wikipedia.org/wiki/Base64</a>.`,
      `Copy that <code>DB_PASS</code> value and run <code>atob("...")</code> on it in the Console. The first decode hands you <i>more</i> Base64, not a word — it's wrapped twice, so run <code>atob()</code> on that result again. Paste the readable string it returns into the <code>db_pass</code> field on <code>/db</code>.`
    ],
    intel:{tag:'INTEL DROP',title:'Know Your Encodings',
      body:`Base64, hex, URL-encoding and ROT13 are <b>encodings</b>: reversible, keyless. Encryption needs a
      secret key; encoding needs nothing. Credentials "secured" with Base64 are a classic audit finding.`}},

  { id:7, code:'NODE-07', host:'crm', title:'The Injection', concept:'SQL INJECTION',
    badge:{name:'Injector',color:'#ff2bd6',glyph:'⌥'},
    routes:[['/login','level7.html']],
    wiretap:{note:`ORACLE is sniffing the query the CRM builds from your input. Make its <code>WHERE</code> clause always true.`,
      seed:"SELECT * FROM users\nWHERE name='' AND pass=''"},
    brief:`<span class="from">ORACLE //</span> The real art. This login glues your typing straight into a
      database query. The right punctuation rewrites the question itself — turning "is this password correct?"
      into "is anything true?" The technique that breached banks and governments. Learn it so you can shut it.`,
    devtip:`No DevTools needed here — just the login form. We've tapped the wire: watch the
      <b>ORACLE WIRETAP</b> below echo the query as you type, and make its <code>WHERE</code> clause always true.`,
    hints:[
      `The login pastes your username straight into a database query — watch the <b>ORACLE WIRETAP</b> in this panel redraw as you type. Your job is to make its condition always true.`,
      `Your text lands inside <code>name='...'</code>. Close that quote, bolt on an always-true clause, and comment out the rest. Background: <a href="https://owasp.org/www-community/attacks/SQL_Injection" target="_blank" rel="noopener">owasp.org — SQL Injection</a>.`,
      `In <b>Username</b> type <code>' OR '1'='1</code> followed by <code>--</code> (so it reads <code>' OR '1'='1' --</code>). Put anything in <b>Password</b> and sign in.`
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
      `Your session token <i>is</i> your ID card — and nobody signed it, so you can rewrite it. First find it in your browser's storage.`,
      `In <b>Inspect</b> → <b>Application</b> → <b>Local Storage</b>, the key <code>omnicorp_token</code> holds Base64. Decode it in the Console with <code>atob(localStorage.omnicorp_token)</code> to read the JSON inside. This is a toy version of a JWT — real ones are signed: <a href="https://jwt.io" target="_blank" rel="noopener">jwt.io</a>.`,
      `Flip <code>"role":"user"</code> to <code>"role":"admin"</code>, re-encode, write it back, then click <b>Verify session</b> (don't reload — that resets it). One Console line does it all: <code>localStorage.omnicorp_token = btoa(JSON.stringify({...JSON.parse(atob(localStorage.omnicorp_token)), role:'admin'}))</code>`
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
      `The wall drops your message into the page as raw HTML instead of plain text. Post something the browser will <i>execute</i>, not just display.`,
      `Any tag that runs code proves the flaw — a <code>&lt;script&gt;</code> tag or an event handler like <code>onerror</code>. More on this: <a href="https://owasp.org/www-community/attacks/xss/" target="_blank" rel="noopener">owasp.org — Cross Site Scripting</a>.`,
      `Paste <code>&lt;img src=x onerror=alert(1)&gt;</code> (or <code>&lt;script&gt;alert(1)&lt;/script&gt;</code>) into the message box and click <b>Post</b>. The instant an executable tag lands on the wall, the node breaks.`
    ],
    intel:{tag:'INTEL DROP',title:'Encode Output, Sanitize Input',
      body:`XSS happens when input is rendered as <b>HTML/JS</b> instead of text. Defenders <b>escape output</b>
      (<code>&lt;</code> → <code>&amp;lt;</code>), sanitize rich input with a vetted library, and set a
      <b>Content-Security-Policy</b>. Stored XSS — saved and served to others — is the nastiest, exactly what
      you just did to the admin.`}},

  { id:10, code:'NODE-10', host:'core', title:'The Mainframe', concept:'CHAINING THE KILL',
    badge:{name:'GHOST',color:'#ff2bd6',glyph:'☠'},
    routes:[['/','level10.html'],
      ['/core/status','level10_doc.html'],
      ['/core/telemetry','level10_doc.html'],
      ['/core/changelog','level10_doc.html'],
      ['/core/kb-dev','level10_kbdev.html'],
      ['/core/_mtc_8841','level10_gate.html']],
    brief:`<span class="from">ORACLE //</span> This is it. OMNICORP's core. No single trick opens it — <b>chain</b>
      what you've learned. Their knowledge base ships its <i>entire</i> document index to your browser and only hides
      the restricted rows in the UI. Read their own dev notes, flip the hidden entry's flag in memory, <b>decode</b>
      the leaked operator token, then <b>inject</b> at the gate it reveals. Do this and you're a <b>Ghost</b>. Go dark.`,
    devtip:`No injection needed for recon — the page already trusts the client. The "core knowledge base" filters
      results in your browser, so what it hides is right there with you. Read the public docs (the <b>KB developer
      notes</b> explain the index), rewrite the live array in the <b>Console</b> (state tampering, like NODE-04/08),
      <code>atob</code> the leaked token, navigate the <b>address bar</b> to the gate it exposes, then SQLi it.`,
    hints:[
      `The knowledge-base search filters its <i>own</i> results on the client — and it even reports how many entries it's hiding. Search <code>core</code>, then dig through the public docs it does show you.`,
      `One of those public docs is the KB <b>developer notes</b>. It explains the in-memory document index (<code>__index</code>) and gives the one-liner that flips a record from <code>restricted</code> to <code>public</code>. (Separately: the core landing page's source leaks a Base64 <code>bootstrap_token</code> — <code>atob()</code> it in the Console for the operator's name.)`,
      `On the dev-notes page, run its example in the Console — first switch the console's context dropdown from <code>top</code> to the core page's frame, listed as <code>#document</code>:<br><code>__index.find(d =&gt; d.path === '/core/_mtc_8841').tag = 'public';</code><br>Re-run the search and the maintenance gate appears. Navigate the address bar to <code>/core/_mtc_8841</code>, then at the gate enter username <code>root_kx</code> (from the decoded token) and auth <code>' OR '1'='1' --</code> to breach the core. (All in one field — <code>root_kx' OR '1'='1' --</code> — works too.)<br><br><i>Didn't spot the token in the source?</i> The search box reflects raw HTML, so you can also lift it straight out: paste <code>&lt;img src=x onerror="alert(bootstrap_token)"&gt;</code> and Search — it pops the token in an alert. <code>atob()</code> that for <code>root_kx</code>.`
    ],
    intel:{tag:'FINAL INTEL',title:'Attackers Chain, Defenders Layer',
      body:`Real breaches are rarely one flaw — they're a <b>chain</b>: recon → disclosure → weak crypto →
      injection → escalation, each gap enabling the next. That's why defense is <b>layered</b> (defense in
      depth): if one control fails, the next should stop the chain. You now think in chains — which is exactly
      what lets you break them for the people who hire you to.`}}
];

/* ---------- state ---------- */
function load(){ try{var s=JSON.parse(localStorage.getItem(STORE))||{done:[],codename:''}; if(isInjection(s.codename)) s.codename=''; return s;}catch(e){return{done:[],codename:''}} }
function save(s){ localStorage.setItem(STORE, JSON.stringify(s)); }
let state = load();
let current = 1;

const isDone = id => state.done.includes(id);
const unlocked = id => id===1 || isDone(id-1);
const rankFor = n => { let r=RANKS[0].name; for(const x of RANKS) if(n>=x.min) r=x.name; return r; };
const L = id => LEVELS.find(x=>x.id===id);

/* codename helpers — replace {cn} with the operator's codename, default 'recruit' */
const cn = () => state.codename || 'recruit';
// HTML-escape so a codename can never break out of an attribute or execute,
// even where {cn} is injected into innerHTML (briefs, prize page).
const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const personalize = s => (s||'').replace(/\{cn\}/g, esc(cn()));

/* ---------- easter egg: try your own tricks on OUR codename field ---------- */
function isInjection(s){
  s=(s||'').toLowerCase();
  return /<\s*(script|img|svg|iframe|body|a\b)/.test(s)   // XSS tags
      || /on\w+\s*=/.test(s)                              // event handlers: onerror=, onload=
      || /javascript:/.test(s)                            // js: uri
      || /'\s*or\s*'?\s*\d/.test(s)                       // SQLi  ' OR '1
      || /'\s*or\s*1\s*=\s*1/.test(s)                     // SQLi  ' OR 1=1
      || /\bunion\s+select\b/.test(s)                     // SQLi  UNION SELECT
      || /'\s*(--|#)/.test(s);                            // SQL comment
}
const PRIZE_ART =
`        .-~~~~~~~~~-.
      .-'           '-.
    .'                 '.
   /                     \\
  |    .---.     .---.    |
  |   | O.O |   | O.O |   |
  |    '---'     '---'    |
  |                       |
  |                       |
   \\                     /
    \\  /\\  /\\  /\\  /\\  /
     \\/  \\/  \\/  \\/  \\/`;
function showPrize(){
  let el=document.getElementById('prize');
  if(!el){ el=document.createElement('div'); el.id='prize'; el.className='prize'; document.body.appendChild(el); }
  el.innerHTML=`<div class="prizebox">
    <button class="mx" id="prizeX" title="close" aria-label="close">✕</button>
    <pre class="art"></pre>
    <div class="ptitle">// INPUT NOT SANITIZED //</div>
    <div class="pmsg">Well, well. You turned <b>GHOST//NET's own</b> codename field into an injection point —
      the exact move from the nodes you just breached. We <i>told</i> you: <b>never trust the client.</b> Not even ours.<br><br>
      So here's your <b>real</b> prize, ${personalize('{cn}')} — the keys to the kingdom. Every lock in this app is just
      <b>state sitting in your own browser.</b> Pop open the console (F12) and run:
      <pre class="code">state.done = [1,2,3,4,5,6,7,8,9];  // mark nodes 1-9 breached
save(state);                        // persist it across reloads
openLevel(10);                      // warp straight to the core</pre>
      Or use the operator API we left unlocked just for you — <code>ghost.help()</code>, <code>ghost.goto(10)</code>,
      <code>ghost.unlockAll()</code>.<br><br>
      <span style="color:var(--green)">SECRET RANK UNLOCKED — ROOT</span></div>
    <div class="row" style="justify-content:center;gap:10px">
      <button class="btn mag" id="prizeWarp">drop the skeleton key — unlock the grid →</button>
      <button class="btn ghost" id="prizeClose">close the back door</button>
    </div>
  </div>`;
  el.querySelector('.art').textContent = PRIZE_ART;  // textContent: we practice safe rendering
  el.classList.add('show');
  const close=()=>el.classList.remove('show');
  document.getElementById('prizeClose').onclick=close;
  document.getElementById('prizeX').onclick=close;
  document.getElementById('prizeWarp').onclick=()=>{ close(); ghost.unlockAll(); };
}

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
// Normalize any input (full URL or bare path) down to a clean leading-slash path.
function normPath(path){
  path = (path||'').trim();
  const m = path.match(/^https?:\/\/[^/]+(\/.*)?$/i); if(m) path = m[1]||'/';
  if(!path.startsWith('/')) path = '/'+path;
  return path.replace(/\/+$/,'') || '/';
}
function resolve(lvl, path){
  path = normPath(path);
  const hit = lvl.routes.find(r=> r[0].replace(/\/+$/,'')===path || r[0]===path );
  return hit ? hit[1] : null;
}
function navigate(path, pushHistory=true){
  const lvl=L(current);
  const norm=normPath(path);
  const file=resolve(lvl, norm);
  const frame=$('#frame'), addr=$('#addr');
  // record every visit (valid pages AND 404s) so Back always has somewhere to go
  if(pushHistory) navStack.push(norm);
  if(file){
    addr.value = urlFor(lvl, lvl.routes.find(r=>r[1]===file)[0]);
    frame.src = `targets/${file}`;
  } else {
    addr.value = urlFor(lvl, norm);
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
  // show the node you're ON (matches the NODE-0X label), not the breached count
  $('#prog').textContent=current+'/'+LEVELS.length;
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
    <div class="brief">${personalize(lvl.brief)}</div>

    <div class="devtip"><div class="k">⌘</div><div><b style="color:var(--cyan)">DEVTOOLS BRIEF —</b> ${personalize(lvl.devtip)}</div></div>
    ${lvl.wiretap?`<div class="wiretap"><div class="k">⊟</div><div><b style="color:var(--mag)">ORACLE WIRETAP —</b> ${lvl.wiretap.note}<pre class="code" id="wiretapBody">${lvl.wiretap.seed}</pre></div></div>`:''}

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
    h.innerHTML='<b>HINT '+(hintsShown+1)+'/'+lvl.hints.length+' »</b> '+personalize(lvl.hints[hintsShown]);
    $('#hintArea').appendChild(h); hintsShown++;
  };
  $('#intelBtn').onclick=()=>revealIntel(false);
  if(done) revealIntel(false);
}
function revealIntel(auto){
  const lvl=L(current); if(intelShown) return; intelShown=true;
  $('#intelArea').innerHTML=`
    <div class="intel"><span class="tag">${lvl.intel.tag}</span><h5>${lvl.intel.title}</h5>
      <div>${personalize(lvl.intel.body)}</div>
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
        <input class="cn" id="cnEdit" value="${esc(state.codename||'')}" placeholder="recruit" maxlength="40" style="width:130px">
        <button class="btn ghost sm" id="cnSave">set</button></div></div>
    <div class="grid">${cards}</div>
    <div class="sec"><h4>▣ SHIELD WALL</h4><div class="badges">${badges}</div></div>
    <div class="sec mut" style="font-size:12px;line-height:1.7">
      <b class="warn">⚠ ETHICS —</b> These skills are for <b>defending</b> systems and testing ones you own or
      have written permission to test. Unauthorized hacking is illegal. Be a Ghost, not a crook.
      <div style="margin-top:10px"><button class="btn ghost sm" id="resetBtn">⟲ reset all progress</button></div>
    </div></div>`;
  $('#closeOv').onclick=closeOverlay;
  const setCodename=()=>{
    const v=$('#cnEdit').value.trim();
    if(isInjection(v)){                            // easter egg — don't save a payload as a name
      try{ alert("You've been hacked by " + cn()); }catch(e){}
      showPrize(); return;
    }
    state.codename=v; save(state); renderHeader(); toast('Codename set');
  };
  $('#cnSave').onclick=setCodename;
  $('#cnEdit').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); setCodename(); } });
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
      <button class="btn mag" id="mGrid">return to the grid</button>
      <button class="mx" id="mX" title="close" aria-label="close">✕</button>`;
  } else {
    box.innerHTML=`<div style="font-size:12px;letter-spacing:3px;color:var(--green)">NODE BREACHED</div>
      <div class="shield" style="width:auto;margin:14px auto">${shield(lvl.badge.color,lvl.badge.glyph,'c'+id)}</div>
      <div style="color:#fff;font-size:18px">${lvl.badge.name}</div>
      <div class="mut" style="font-size:12px;margin:8px 0">mastered: <b style="color:var(--cyan)">${lvl.concept}</b> · rank <b class="ok">${rankFor(n)}</b> · ${n}/${LEVELS.length}</div>
      <div class="row" style="justify-content:center;margin-top:8px">
        <button class="btn ghost" id="mGrid">grid</button>
        ${id<LEVELS.length?'<button class="btn" id="mNext">next node →</button>':''}</div>
      <button class="mx" id="mX" title="close" aria-label="close">✕</button>`;
  }
  $('#modal').classList.add('show');
  $('#mGrid').onclick=()=>{ $('#modal').classList.remove('show'); openOverlay(); };
  $('#mX').onclick=()=>{ $('#modal').classList.remove('show'); };
  const nx=$('#mNext'); if(nx) nx.onclick=()=>{ $('#modal').classList.remove('show'); openLevel(id+1); };
}

/* ---------- solve handling ---------- */
function handleSolved(id){
  if(!id || id!==current) { /* allow solving the active node only */ if(id!==current) return; }
  const first=!isDone(id);
  markSolved(id);
  renderHeader();
  if(first){ revealIntel(true); setTimeout(()=>celebrate(id), 5000); }
  else toast('Node already breached');
}
window.addEventListener('message', e=>{
  const d=e.data||{};
  if(d.type==='ghostnet:solved') handleSolved(+d.level);
  if(d.type==='ghostnet:query'){ const el=$('#wiretapBody'); if(el) el.textContent=d.text; }
});
/* storage fallback (in case postMessage is blocked) */
setInterval(()=>{
  const k='ghostnet_solved_'+current;
  if(localStorage.getItem(k)==='1'){ localStorage.removeItem(k); handleSolved(current); }
}, 800);

/* ---------- easter egg: operator console API (real level-ups) ----------
   Everything that gates a node is just client-side state. Reward the curious
   with the keys: a tiny global API to read and rewrite that state. */
const ghost = {
  help(){
    console.log('%c GHOST//NET // operator console ','background:#02120a;color:#39ff14;font-weight:bold;padding:2px 6px;border:1px solid #39ff14');
    console.log('%cYou found the back door. Every lock here is client-side state — so here are the keys:','color:#9fb');
    console.table({
      'ghost.state()'    : 'show your progress, rank and current node',
      'ghost.goto(n)'    : 'warp to node n (unlocks the path to it)',
      'ghost.unlockAll()': 'master key — unlock every node',
      'ghost.reset()'    : 'wipe all progress'
    });
    console.log('%cUnder the hood it is literally: %cstate.done=[1,2,3,4,5,6,7,8,9]; save(state); openLevel(10)','color:#9fb','color:#39ff14');
    return 'Pick a command above, operator.';
  },
  state(){ return { node: current, breached: [...state.done], rank: rankFor(state.done.length), codename: cn() }; },
  goto(n){
    n = Math.max(1, Math.min(LEVELS.length, parseInt(n,10)||1));
    for(let i=1;i<n;i++){ if(!state.done.includes(i)) state.done.push(i); }
    state.done.sort((a,b)=>a-b); save(state);
    openLevel(n);
    return 'Warped to NODE-' + String(n).padStart(2,'0');
  },
  unlockAll(){
    state.done = LEVELS.slice(0,-1).map(l=>l.id);   // every prior node done → all nodes reachable
    save(state); renderHeader(); openOverlay(); toast('MASTER KEY — all nodes unlocked');
    return 'All nodes unlocked.';
  },
  reset(){ state={done:[],codename:state.codename}; save(state); renderOverlay(); openLevel(1); toast('Progress wiped'); return 'Reset complete.'; }
};
window.ghost = ghost;

/* easter egg: the Konami code anywhere drops DEV MODE (master key) */
function wireKonami(){
  const SEQ='arrowup arrowup arrowdown arrowdown arrowleft arrowright arrowleft arrowright b a'.split(' ');
  let buf=[];
  window.addEventListener('keydown', e=>{
    buf.push(e.key.toLowerCase()); buf=buf.slice(-SEQ.length);
    if(buf.join(' ')===SEQ.join(' ')){ buf=[]; toast('↑↑↓↓←→←→BA — DEV MODE'); ghost.unlockAll(); }
  });
}

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
  wireKonami();
  // NOTE: no console banner here on purpose — NODE-01 sends players into the
  // console, and announcing the ghost API there would spoil the whole game.
  // The API stays available; it's revealed only by EARNING it (the codename
  // injection prize) or the Konami code. Discovery is the reward.
  const logo=$('#logoBtn'); if(logo){ logo.style.cursor='pointer'; logo.onclick=openOverlay; }
  const gb=$('#gridBtn'); if(gb) gb.onclick=openOverlay;
  // resume at the furthest unlocked node
  let start=1; for(let i=1;i<=LEVELS.length;i++){ if(unlocked(i)) start=i; }
  openLevel(state.done.length? Math.min(start,LEVELS.length) : 1);
  if(!state.codename){ setTimeout(openOverlay, 400); }
}
document.addEventListener('DOMContentLoaded', boot);

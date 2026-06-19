<div align="center">

# GHOST//NET

### A hands-on web-security trainer where you break into a fake corporation using your *real* browser DevTools.

Inspired by [HackThisSite](https://www.hackthissite.org/). Ten progressive challenges, a cyberpunk-resistance storyline, and a badge for every exploit you learn.

`vanilla HTML/CSS/JS` · `zero dependencies` · `runs locally` · `for defenders`

</div>

---

## What is this?

GHOST//NET is a single-page training grid with a **split-screen layout**:

- **Left — the operator console.** A retro hacker panel that delivers the storyline (your handler, *ORACLE*, briefing you mission by mission), tiered hints, and an "intel dossier" that teaches the real-world concept once you crack each node. Earn a themed shield badge per technique and climb the ranks from **Script Kiddie** to **Ghost**.
- **Right — a believable corporate website.** Each challenge loads a real, standalone *OMNICORP* page inside a fake browser (address bar and all). Because the target is genuine HTML/JS, you solve it with **actual Chrome DevTools** — View Source, the Elements inspector, the Console, the Application/Storage panel, and the address bar — not faked buttons.

Nothing here touches the internet or any real system. Every "exploit" runs entirely in your browser against a deliberately vulnerable practice page.

## The ten nodes

| # | Node | Concept | You solve it with |
|---|------|---------|-------------------|
| 1 | First Contact | Client-side ≠ secret | View Source / Sources |
| 2 | Hidden in Plain Sight | Form tampering | Elements (edit a hidden field) |
| 3 | Don't Trust the Script | Client-side validation bypass | Console / Sources |
| 4 | The Cookie Jar | Client-storage tampering | Application → Local Storage |
| 5 | Roads Not Linked | Information disclosure | `robots.txt` + the address bar |
| 6 | Cipher of Fools | Encoding ≠ encryption | Console `atob()` |
| 7 | The Injection | SQL injection | The login form |
| 8 | Forged Papers | Token tampering / priv-esc | Console + Local Storage |
| 9 | Cross the Line | Stored XSS | The page's own input box |
| 10 | The Mainframe | Chaining the kill | Everything above, combined |

Each node hands you the security lesson as an unlockable dossier and rewards a shield badge. Difficulty ramps from "read the page source" to a multi-stage chained breach.

## Getting started

No build step, no install — it's static files.

**Recommended (run the local server):** this makes cookies, local storage, `robots.txt`, and the framed pages behave exactly like a live site.

```bash
# macOS: just double-click start.command, or:
python3 -m http.server 8049
# then open http://localhost:8049/index.html
```

You can also open `index.html` directly over `file://`, though a couple of the storage-based levels are more reliable over the local server.

## How it works

- **Split-screen shell** (`index.html` + `engine.js`) renders the operator console and a fake-browser `<iframe>` that loads each target.
- **Targets are independent pages** in `targets/`, styled by a separate corporate stylesheet so they look nothing like the hacker console — reinforcing the "real outside website" feel.
- When you solve a challenge, the target page signals the shell via `postMessage` (`{ type: 'ghostnet:solved', level: N }`), which reveals the dossier, awards the badge, and unlocks the next node.
- **Progress persists** in `localStorage` (completed nodes, badges, codename).

## Project structure

```
ghostnet/
├── index.html          # split-screen shell + fake browser chrome
├── start.command       # one-click local server (macOS)
├── assets/
│   ├── panel.css       # operator-console theme (dark / neon CRT)
│   ├── site.css        # OMNICORP corporate-site theme (clean / light)
│   ├── engine.js       # levels, routing, progress, badges, hints
│   └── target.js       # shared "node breached" signal
└── targets/            # one real page per level (+ robots.txt, hidden admin, 404)
```

## ⚠️ Ethics & scope

These techniques are taught so you can **defend** systems and test ones you **own or have explicit written permission to test**. Accessing systems without authorization is illegal in most of the world. Every target in this project is a local simulation. Be a Ghost, not a crook.

## Contributing

Each level is self-contained: a metadata entry in `engine.js` (story, hints, dossier, badge, routes) plus a real page in `targets/` that posts the solve signal. New challenge ideas — CSRF, IDOR, path traversal, a "defender mode" where you patch the bug after exploiting it — are welcome.

## License

MIT — free to use, learn from, and remix. Attribution appreciated.

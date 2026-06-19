/* ============================================================
   target.js — tiny shared helper loaded by every target page.
   Centralizes the "I've been breached" signal back to the shell.
   ============================================================ */
window.GhostNet = {
  level: null,
  init(level){ this.level = level; },
  // Call when the player solves the challenge on this target.
  solve(level){
    level = level || this.level;
    const msg = { type: 'ghostnet:solved', level: level };
    try { if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*'); } catch(e){}
    try { if (window.opener) window.opener.postMessage(msg, '*'); } catch(e){}
    // also drop a flag in storage as a fallback the shell can poll
    try { localStorage.setItem('ghostnet_solved_'+level, '1'); } catch(e){}
  },
  // Convenience: render a standard breach banner inside an element.
  stamp(el, line){
    if(!el) return;
    el.innerHTML = '<div class="breached"><div class="big">ACCESS GRANTED</div>'+
      '<div style="margin-top:6px">'+(line||'Node breached. Return to GHOST//NET.')+'</div></div>';
  }
};

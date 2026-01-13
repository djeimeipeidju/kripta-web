// ===================================================
// KRIPTA — BRIDGE v2 (READ ONLY)
// ===================================================

(function(){

  if (!window.KRIPTA_FOCUS_PUBLIC) return;

  window.KRIPTA = {
    get focus() { return KRIPTA_FOCUS_PUBLIC.focus; },
    get state() { return KRIPTA_FOCUS_PUBLIC.state; },
    get sessionStart() { return KRIPTA_FOCUS_PUBLIC.sessionStart; }
  };

})();

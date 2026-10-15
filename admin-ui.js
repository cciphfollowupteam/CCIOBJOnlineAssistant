// Staff sign-in form + sign-out for the admin page (runs after the main app script).
(function () {
  const g0 = window.gate;
  window.gate = function (t, m, retry) {
    if (t !== "Staff sign-in") return g0(t, m, retry);
    show("gate");
    const c = document.querySelector("#gate .gcard");
    c.innerHTML = '<div style="display:flex;justify-content:center">' + logo(110, 1) + '</div><h2 style="margin:12px 0 4px">Staff sign-in</h2><p>Registered CCI Olu-Obasanjo admins only.</p>' +
      '<form id="lf"><input id="le" type="email" placeholder="Email" autocomplete="username" required><input id="lp" type="password" placeholder="Password" autocomplete="current-password" required style="margin-top:8px">' +
      '<p id="lerr" class="note" style="color:#d93a3a;min-height:1.2em"></p><button class="btn" style="width:100%">Sign in</button></form>';
    document.getElementById("lf").onsubmit = async (e) => {
      e.preventDefault(); const err = document.getElementById("lerr"); err.textContent = "";
      try {
        const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: document.getElementById("le").value, password: document.getElementById("lp").value }) });
        const j = await r.json(); if (!r.ok) { err.textContent = j.error || "Sign-in failed"; return; } location.reload();
      } catch (x) { err.textContent = "Network error. Please try again."; }
    };
  };
  const w = document.querySelector(".who");
  if (w) { const b = document.createElement("button"); b.className = "btn alt"; b.textContent = "Sign out"; b.onclick = async () => { await fetch("/api/admin/logout", { method: "POST" }); location.reload(); }; w.appendChild(b); }
})();

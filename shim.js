// Gives the page the same small "database / user / AI" surface it used inside Claude, but backed by this project's /api routes.
(function () {
  window.CCI_API = true;
  const jf = async (url, body) => {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body || {}) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(j.error || ("http " + r.status)); e.status = r.status; throw e; }
    return j;
  };
  const rpc = (op, path, data) => jf("/api/db", { op, path, data });
  const docRef = (p) => ({
    get: async () => { try { const r = await rpc("get", p); return { exists: !!r.exists, data: () => r.data }; } catch (e) { if (e.status === 404) return { exists: false, data: () => null }; throw e; } },
    set: (d) => rpc("set", p, d), update: (d) => rpc("update", p, d), delete: () => rpc("delete", p)
  });
  const collRef = (p) => {
    const q = { _ord: null, _lim: 0,
      async get() {
        const r = await rpc("list", p); let docs = r.docs.map(x => ({ id: x.id, data: () => x.data }));
        if (q._ord) { const [f, dir] = q._ord; docs.sort((a, b) => { const A = a.data()[f] || "", B = b.data()[f] || ""; return (A < B ? -1 : A > B ? 1 : 0) * (dir === "desc" ? -1 : 1); }); }
        if (q._lim) docs = docs.slice(0, q._lim); return { docs };
      },
      orderBy(f, d) { q._ord = [f, d]; return q; }, limit(n) { q._lim = n; return q; }, add: (d) => rpc("add", p, d),
      onSnapshot(cb, err) {
        let prev = null, stop = false;
        const tick = async () => {
          if (stop) return;
          try {
            const r = await rpc("list", p), cur = {}; r.docs.forEach(x => cur[x.id] = JSON.stringify(x.data));
            const docs = r.docs.map(x => ({ id: x.id, data: () => x.data }));
            if (prev === null) cb({ docs, docChanges: () => [] });
            else {
              const ch = [];
              r.docs.forEach(x => { if (!(x.id in prev)) ch.push({ type: "added", doc: { id: x.id, data: () => x.data } }); else if (prev[x.id] !== cur[x.id]) ch.push({ type: "modified", doc: { id: x.id, data: () => x.data } }); });
              Object.keys(prev).forEach(id => { if (!(id in cur)) ch.push({ type: "removed", doc: { id, data: () => null } }); });
              cb({ docs, docChanges: () => ch });
            }
            prev = cur;
          } catch (e) { if (err) err(e); }
        };
        tick(); const t = setInterval(tick, 6000); return () => { stop = true; clearInterval(t); };
      } };
    return q;
  };
  const db = { doc: docRef, collection: collRef };
  window.claude = { use: async (n) => {
    if (n === "db") return db;
    if (n === "user") {
      if (!window.CCI_ADMIN_MODE) return null;
      try { const r = await fetch("/api/admin/me", { credentials: "same-origin" }); if (!r.ok) return null; const me = await r.json(); return { me: async () => me, canEdit: async () => true }; } catch (e) { return null; }
    }
    if (n === "sample") {
      if (window.CCI_ADMIN_MODE) return { json: async (prompt) => (await jf("/api/admin/sample", { prompt })).value };
      try { const r = await fetch("/api/answer?ping=1").then(x => x.json()); return r.ai ? {} : null; } catch (e) { return null; }
    }
    return null;
  } };
})();

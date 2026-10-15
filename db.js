// Minimal document store used by both pages. POST {op, path, data}
// ops: get | set | update | delete | list | add
// Public visitors may: read config/kb + config/main, and write ONLY their own chats/<sid>.
// Signed-in admins may do everything. private/worker is served from the bundled file + admin-added text.
const kv = require("../lib/kv"), email = require("../lib/email"), { getAdmin } = require("../lib/auth");
const { json, body, ip, baseUrl } = require("../lib/util");
const SEED = require("../private/worker.json");
const PATH = /^[A-Za-z0-9_\-./@+:]{1,200}$/, SID = /^chats\/s[a-z0-9]{5,24}$/;
const colOf = (p) => p.split("/").slice(0, -1).join("/"), idOf = (p) => p.split("/").pop();
const publicOk = (op, path) => (op === "get" && (path === "config/kb" || path === "config/main")) || (["set", "update", "delete"].includes(op) && SID.test(path));

async function adminEmails() {
  const ids = await kv.smembers("col:admins"); const out = [];
  for (const id of ids) { const d = await kv.get("doc:admins/" + id); if (d && d.alerts) out.push(id); }
  return out;
}
async function notify(prev, cur, req) {
  const urg = (cur.tags || []).includes("urgent") && !((prev && prev.tags) || []).includes("urgent");
  const flagged = cur.flag && !(prev && prev.flag);
  if (!urg && !flagged) return;
  const to = [...new Set([...(process.env.FOLLOWUP_EMAIL || "").split(",").map(x => x.trim()).filter(Boolean), ...(await adminEmails())])];
  const last = (cur.msgs || []).slice(-8).map(m => (m.r === "me" ? (cur.name || "Visitor") : "Assistant") + ": " + m.t).join("\n");
  await email.send({ to, subject: (urg ? "URGENT: " : "Follow-up needed: ") + (cur.name || "A visitor") + (cur.phone ? " (" + cur.phone + ")" : ""),
    text: `${urg ? "URGENT pastoral need" : "A visitor asked for the follow-up team"}\n\nName: ${cur.name || "not given"}\nContact: ${cur.phone || "not given"}\nTags: ${(cur.tags || []).join(", ") || "-"}\n\nLast messages:\n${last}\n\nOpen the inbox: ${baseUrl(req)}/admin` });
}
module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "method" });
  const b = await body(req); const { op, path, data } = b || {};
  if (!op || !PATH.test(String(path || "")) || path.includes("..")) return json(res, 400, { error: "bad_request" });
  const admin = getAdmin(req);
  if (!admin && !publicOk(op, path)) return json(res, admin ? 403 : 401, { error: "auth" });
  if (!admin && (await kv.limited("rl:db:" + ip(req), 80, 60))) return json(res, 429, { error: "rate_limited" });
  if (data && JSON.stringify(data).length > 250000) return json(res, 413, { error: "too_large" });
  try {
    if (op === "list") {
      const ids = await kv.smembers("col:" + path); const docs = [];
      for (const id of ids) { const d = await kv.get("doc:" + path + "/" + id); if (d) docs.push({ id, data: d }); }
      return json(res, 200, { docs });
    }
    if (op === "add") {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      await kv.set("doc:" + path + "/" + id, data || {}); await kv.sadd("col:" + path, id);
      if (path === "audit") { const all = await kv.smembers("col:audit"); if (all.length > 300) { all.sort(); for (const old of all.slice(0, all.length - 300)) { await kv.del("doc:audit/" + old); await kv.srem("col:audit", old); } } }
      return json(res, 200, { id });
    }
    if (path === "private/worker") {
      const st = (await kv.get("doc:private/worker")) || {};
      if (op === "get") return json(res, 200, { exists: true, data: { chunks: SEED.chunks, extra: st.extra || "", updated: st.updated || SEED.updated } });
      if (op === "set" || op === "update") { await kv.set("doc:private/worker", { extra: String((data && data.extra) || ""), updated: new Date().toISOString() }); return json(res, 200, { ok: true }); }
    }
    const key = "doc:" + path, prev = await kv.get(key);
    if (op === "get") return prev ? json(res, 200, { exists: true, data: prev }) : json(res, 404, { exists: false });
    if (op === "delete") { await kv.del(key); await kv.srem("col:" + colOf(path), idOf(path)); return json(res, 200, { ok: true }); }
    if (op === "set" || op === "update") {
      let doc = op === "set" ? { ...(data || {}) } : { ...(prev || {}), ...(data || {}) };
      if (op === "update" && !prev && !admin) doc = { ...(data || {}), done: false };
      if (!admin && SID.test(path)) { doc.done = prev ? !!prev.done : false; doc.sid = idOf(path); }
      await kv.set(key, doc); await kv.sadd("col:" + colOf(path), idOf(path));
      if (SID.test(path)) { try { await notify(prev, doc, req); } catch (e) { /* never fail the visitor on an email problem */ } }
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { error: "bad_op" });
  } catch (e) { return json(res, 500, { error: "server" }); }
};

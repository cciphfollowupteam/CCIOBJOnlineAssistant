// POST /api/answer  {q, pitch, name, hist:[[role,text]...]}  ->  {ok, text, src, chips}
// GET  /api/answer?ping=1 -> {ai:true|false}  (tells the page whether smart answers are available)
const rag = require("../lib/rag"), kv = require("../lib/kv"), { json, body, ip } = require("../lib/util");
let cache = { at: 0, v: null };
async function extras() {
  if (Date.now() - cache.at < 60000 && cache.v) return cache.v;
  const [k, m] = await Promise.all([kv.get("doc:config/kb"), kv.get("doc:config/main")]);
  cache = { at: Date.now(), v: { teamTexts: String((k && k.text) || "").split(/\n\s*\n/).map(x => x.trim()).filter(Boolean), sched: String((m && m.sched) || "").trim() } };
  return cache.v;
}
module.exports = async (req, res) => {
  if (req.method === "GET") return json(res, 200, { ai: !!process.env.ANTHROPIC_API_KEY });
  if (req.method !== "POST") return json(res, 405, { ok: false });
  if (!process.env.ANTHROPIC_API_KEY) return json(res, 200, { ok: false, reason: "no_key" });
  try {
    if (await kv.limited("rl:ans:" + ip(req), 30, 60)) return json(res, 429, { ok: false, reason: "rate_limited" });
    const b = await body(req);
    const q = String(b.q || "").slice(0, 500).trim(); if (!q) return json(res, 400, { ok: false });
    const hist = Array.isArray(b.hist) ? b.hist.slice(-6).map(x => [x[0] === "me" ? "me" : "bot", String(x[1] || "").slice(0, 300)]) : [];
    const ex = await extras();
    const r = await rag.answer({ q, pitch: !!b.pitch, name: String(b.name || "").slice(0, 40), hist, ...ex });
    return json(res, 200, r);
  } catch (e) { return json(res, 200, { ok: false, reason: "error" }); }
};

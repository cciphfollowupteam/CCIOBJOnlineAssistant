// Tiny key-value layer: Upstash Redis REST in production, in-memory fallback for local testing only
// (the in-memory fallback is NOT persistent on Vercel: add the Upstash Redis integration).
const url = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const mem = new Map(), sets = new Map(), hits = new Map();
const persistent = () => !!(url() && token());
async function cmd(args) {
  const r = await fetch(url(), { method: "POST", headers: { Authorization: "Bearer " + token(), "content-type": "application/json" }, body: JSON.stringify(args) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
}
exports.persistent = persistent;
exports.get = async (k) => { if (!persistent()) return mem.has(k) ? JSON.parse(mem.get(k)) : null; const v = await cmd(["GET", k]); return v == null ? null : JSON.parse(v); };
exports.set = async (k, v) => { if (!persistent()) { mem.set(k, JSON.stringify(v)); return; } await cmd(["SET", k, JSON.stringify(v)]); };
exports.del = async (k) => { if (!persistent()) { mem.delete(k); return; } await cmd(["DEL", k]); };
exports.sadd = async (k, m) => { if (!persistent()) { (sets.get(k) || sets.set(k, new Set()).get(k)).add(m); return; } await cmd(["SADD", k, m]); };
exports.srem = async (k, m) => { if (!persistent()) { if (sets.get(k)) sets.get(k).delete(m); return; } await cmd(["SREM", k, m]); };
exports.smembers = async (k) => { if (!persistent()) return [...(sets.get(k) || [])]; return (await cmd(["SMEMBERS", k])) || []; };
// true when the caller is OVER the limit
exports.limited = async (key, limit, ttlSec) => {
  if (!persistent()) { const now = Date.now(); const a = (hits.get(key) || []).filter(t => now - t < ttlSec * 1000); a.push(now); hits.set(key, a); return a.length > limit; }
  const n = await cmd(["INCR", key]); if (n === 1) await cmd(["EXPIRE", key, ttlSec]); return n > limit;
};

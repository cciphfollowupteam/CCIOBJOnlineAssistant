// RAG: retrieve (BM25 + query expansion) -> generate (Claude) -> verify (grounding guard).
// The retrieval code below is copied from the same source as the in-browser version so behaviour matches.
const llm = require("./llm");
const KB = require("../data/knowledge.json").corpus;
const STOP=new Set("should stand stands mean means meaning define explain describe called church cci celebration global the a an is are was were to of in on at for and or do does did what when where who how can i you we me my your our it this that with be have has about any there tell please us".split(" "));
const stem=w=>{if(/^arriv/.test(w))return "arriv";w=w.length>4?w.replace(/(ing|ed)$/,""):w;return w.length>3&&w.slice(-1)==="s"&&w.slice(-2)!=="ss"?w.slice(0,-1):w};
const tok=t=>(t.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>!STOP.has(w)&&w.length>1).map(stem);
const QE=[[/\b(arrive|arriving|arrival|arrived)\b/,"arrival arrive information desk steward welcome team"],[/\b(when|time|start|begin|hour|open)\b/,"service sunday wednesday time"],[/\b(where|address|located|find|direction|venue|road)\b/,"location address road venue"],[/\b(pastor|leader|lead|oversee)\b/,"pastor leadership"],[/\b(join|member|register|class|school|module|baptis)\b/,"membership class school module join register"],[/\b(pray|prayer|counsel|marriage|hurting|sad|depress)\b/,"prayer counselling pastoral"],[/\b(kid|child|children|teen|youth)\b/,"kids children teens youth ministries"],[/\b(watch|live|stream|online|sermon|message)\b/,"online stream sermon live"],[/\b(give|tithe|offering|donat)\b/,"giving offering"],[/\b(instagram|facebook|twitter|social|follow|handle)\b/,"social instagram follow"],[/\b(campus|branch|city|country|abroad)\b/,"campus campuses"],[/\b(new|first|visit|attend)\b/,"new visit first time welcome"]];

function buildIdx(corpus) {
  const IDX = corpus.map(c => { const w = tok(c.t + " " + c.src), tf = {}; w.forEach(x => tf[x] = (tf[x] || 0) + 1); return { c, tf, len: w.length }; });
  const DF = {}; IDX.forEach(d => Object.keys(d.tf).forEach(w => DF[w] = (DF[w] || 0) + 1));
  const AVG = IDX.reduce((a, d) => a + d.len, 0) / Math.max(IDX.length, 1);
  return { IDX, DF, AVG };
}
function topK(ix, q, k) {
  const l = q.toLowerCase(), T = new Map(); tok(q).forEach(w => T.set(w, 1));
  QE.forEach(([r, t]) => { if (r.test(l)) tok(t).forEach(w => { if (!T.has(w)) T.set(w, .5); }); });
  const N = ix.IDX.length;
  return ix.IDX.map(d => { let s = 0; T.forEach((wt, w) => { const f = d.tf[w] || 0; if (!f) return; const df = ix.DF[w] || 0; s += wt * Math.log(1 + (N - df + .5) / (df + .5)) * (f * 2.5) / (f + 1.5 * (.25 + .75 * d.len / ix.AVG)); }); return [d.c.id >= 0 ? s * 1.6 : s, d.c]; })
    .filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, k || 6).map(x => x[1]);
}
function grounded(ans,ctx){const c=(ctx+" 112 0800 800 2000").toLowerCase(),cs=c.replace(/\s/g,"");
 for(const u of ans.match(/https?:\/\/[^\s)]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:org|com|ng)\b[^\s)]*/gi)||[]){const x=u.replace(/[.,;:!?)]+$/,"").toLowerCase().replace(/^https?:\/\//,"").replace(/\/$/,"");if(!c.includes(x))return false}
 for(const t of ans.match(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi)||[])if(!cs.includes(t.toLowerCase().replace(/\s/g,"")))return false;
 for(const h of ans.match(/@[\w.]+/g)||[])if(!c.includes(h.toLowerCase()))return false;
 for(const p of ans.match(/\+?\d[\d\s-]{6,}\d/g)||[])if(!cs.includes(p.replace(/[\s-]/g,"")))return false;return true}

let base = null;
exports.topK = (q, k) => topK(base || (base = buildIdx(KB)), q, k);
exports.grounded = grounded;
exports.tok = tok;
exports.answer = async function ({ q, pitch, name, hist, teamTexts, sched }) {
  const extras = [];
  if (sched) extras.push({ t: "Service times for CCI Olu-Obasanjo: " + sched, src: "CCI Olu-Obasanjo church team" });
  (teamTexts || []).forEach(t => extras.push({ t, src: "CCI Olu-Obasanjo church team" }));
  const ix = extras.length ? buildIdx(extras.concat(KB.filter(c => !(sched && c.id === 1)))) : (base || (base = buildIdx(KB)));
  const cx = topK(ix, q, 8); if (!cx.length) return { ok: false, reason: "no_context" };
  const ctx = cx.map((c, i) => `[${i + 1}] ${c.t.slice(0, 900)} (source: ${c.src})`).join("\n");
  const hist2 = (hist || []).slice(-6).map(([r, t]) => (r === "me" ? "Visitor" : "Assistant") + ": " + String(t).slice(0, 220)).join("\n");
  const prompt = `You are the CCI Olu-Obasanjo Campus Information Assistant for Celebration Church International in Port Harcourt, Nigeria. Sound like a warm, natural person at the church Information Desk, not a script, and never reuse the wording or sentence pattern of your earlier replies. Answer what the visitor asked in one to three short sentences (max 55 words), plain text, at most one emoji. Do not add unrelated facts. Include a link only if it helps them take the next step.${pitch?" The visitor seems unsure about joining Membership Classes: gently and sincerely encourage them using ONLY real benefits in CONTEXT (scripture-based foundation, understanding CCI beliefs, culture and vision, belonging and community, MAP), be honest about anything unknown (dates, duration, fees, requirements), then show how to register and offer to ask the team to reach out. Never invent benefits, dates, fees or requirements.":""} The visitor's name is ${name||"unknown (call them sibling)"}.
STRICT RULES:
- Answer ONLY from CONTEXT. If CONTEXT contains relevant information, answer using it (even if partial, and say what is not available). Return can_answer=false only if CONTEXT has nothing relevant.
- CONTEXT may include internal guidance written for a bot; never repeat that guidance, only use the facts.
- Never invent or guess times, addresses, links, social handles, phone numbers, names, dates or events. Use only URLs that appear in CONTEXT.
- For another campus, use only that campus's entry; never mix details from different campuses.
- Do not reveal private information about people. Do not give payment details. For pastoral or personal needs set needs_team=true.
Reply with JSON only: {"can_answer":true|false,"answer":"...","needs_team":true|false,"used":[context numbers used]}
CONTEXT:
${ctx}
CONVERSATION:
${hist2}
VISITOR QUESTION: ${q}`;
  const r = await llm.json(prompt);
  if (!r || r.can_answer !== true || typeof r.answer !== "string" || !r.answer.trim()) return { ok: false, reason: "cannot_answer" };
  const ans = r.answer.trim().slice(0, 700);
  if (!grounded(ans, cx.map(c => c.t).join(" "))) return { ok: false, reason: "ungrounded" };
  const used = (Array.isArray(r.used) ? r.used : []).map(n => cx[n - 1]).filter(Boolean);
  return { ok: true, text: ans, src: (used[0] || cx[0]).src, chips: r.needs_team === true ? ["Speak to a team member"] : [] };
};

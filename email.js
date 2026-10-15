exports.send = async ({ to, subject, text }) => {
  const key = process.env.RESEND_API_KEY; if (!key || !to || !to.length) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "CCI Olu-Obasanjo <onboarding@resend.dev>", to, subject, text }) });
    return r.ok;
  } catch { return false; }
};

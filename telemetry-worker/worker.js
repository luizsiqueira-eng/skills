// Cloudflare Worker: recebe o ping anônimo do CLI e repassa ao GA4 (Measurement Protocol).
// O api_secret fica aqui, como variável do Worker — nunca no pacote npm.
// Rota: luizsiqueira.com.br/api/ping  (POST JSON { skill, version, os, node })
export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (e) { return new Response("worker error: " + (e && e.message), { status: 500 }); }
  },
};

async function handle(request, env) {
    if (request.method !== "POST") return new Response("ok", { status: 200 });
    let data;
    try { data = await request.json(); } catch { return new Response("bad json", { status: 400 }); }

    const skill = String(data.skill || "");
    if (!/^[a-z0-9-]{1,40}$/.test(skill)) return new Response("bad skill", { status: 400 });
    const version = String(data.version || "").slice(0, 20);
    const os = ["darwin", "linux", "win32"].includes(data.os) ? data.os : "other";
    const node = String(data.node || "").slice(0, 3);

    // client_id aleatório por evento: nada liga dois pings à mesma pessoa
    const clientId = crypto.randomUUID();
    const payload = {
      client_id: clientId,
      non_personalized_ads: true,
      events: [{ name: "skill_install", params: { skill, package_version: version, os, node_major: node, source: "cli", engagement_time_msec: 1 } }],
    };
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA_MEASUREMENT_ID}&api_secret=${env.GA_API_SECRET}`;
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!(r.ok || r.status === 204)) return new Response("ga error " + r.status + ": " + (await r.text()).slice(0, 200), { status: 502 });
    return new Response(null, { status: 204 });
}

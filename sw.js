/* Jojo Boss Academy — fonctionnement hors ligne.
   Page : réseau d'abord (pour recevoir les mises à jour), copie locale si pas de réseau.
   Icônes et scripts Firebase : copie locale d'abord. Holly (Gemini) et la sauvegarde en ligne passent toujours par le réseau. */
const CACHE = "jba-20261104-101741";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-512.png", "./apple-touch-icon.png"];
const LIBS = ["app", "auth", "firestore"].map(m => `https://www.gstatic.com/firebasejs/10.14.1/firebase-${m}-compat.js`);
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE.map(u => new Request(u, { cache: "reload" })));
    await Promise.all(LIBS.map(async u => { try { const r = await fetch(u, { mode: "no-cors" }); await c.put(u, r); } catch (e) { } }));
    self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== CACHE && k.startsWith("jba-")) await caches.delete(k); await self.clients.claim(); })());
});
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (/googleapis\.com|firebaseio|firebaseapp\.com|google\.com|googleusercontent/.test(url.host)) return;
  if (url.origin === location.origin && /version\.json$/.test(url.pathname)) return;
  if (req.mode === "navigate" || (url.origin === location.origin && /(\/|index\.html)$/.test(url.pathname))) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try { const r = await timeout(fetch(req, { cache: "no-store" }), 4000); if (r && r.ok) c.put("./index.html", r.clone()); return r; }
      catch (err) { return (await c.match("./index.html")) || (await c.match("./")) || Response.error(); }
    })());
    return;
  }
  if (url.origin === location.origin || url.host === "www.gstatic.com") {
    e.respondWith((async () => {
      const c = await caches.open(CACHE); const hit = await c.match(req, { ignoreSearch: url.origin === location.origin });
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
  }
});

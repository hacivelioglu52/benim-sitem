/* Yeni uygulamanın internetsiz kullanımı. Her sürümde CACHE adı ve ?v= numaraları artırılır. */
const CACHE='kigu-v7';
const FILES=['./','./index.html','./hesap.js?v=7','./veri.js?v=7','./kayit.js?v=7','./yedek.js?v=7','./personel.js?v=7','./teksen.js?v=7','./uygulama.js?v=7'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()));});
/* Yalnız kendi eski önbellekleri silinir; eski uygulamanınkine dokunulmaz */
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('kigu-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
/* Önce ağ, olmazsa kayıtlı kopya */
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope)) return;
  const yedek=()=>caches.open(CACHE).then(c=>c.match(e.request,{ignoreSearch:true}).then(r=>r||(e.request.mode==='navigate'?c.match('./index.html'):Response.error())));
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(res=>{
    if(!res.ok) return res.status>=500?yedek().then(r=>r.type==='error'?res:r):res;
    const kopya=res.clone(); e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,kopya))); return res;
  }).catch(yedek));
});

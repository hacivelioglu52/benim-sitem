/* İki cihaz eşitleme, Teksen verisi. Teksen sitesine bağlanmaz: bu cihazda kayıtlı Teksen verisini eşitler.
   Veri bütün olarak (silmeler dahil) taşınır. İki cihaz da değiştiyse ya da veri belirgin azaldıysa / eskiye döndüyse kendiliğinden yazılmaz, sorulur.
   Bu cihazın verisinin üzerine yazılmadan önce önceki hali bu cihazda saklanır (tek adım geri alma).
   Aynı gizli depo, aynı parola; ayrı dosya. Firma ve personel kayıtlarına yazmaz (yalnız okur). */
window.TeksenEsit=(function(){
  var DOSYA='teksen.sifreli.json', TABLO={firms:'sicil',hizmet:'id',uyg:'id',docs:'sicil',meta:'k'}, ADLAR=Object.keys(TABLO), SAYILAN=['firms','hizmet','uyg','docs'];
  var ORT=null, durum=null, soru=null, hata='', bilgi='', secim=null, yedekIcin='', yenileBekliyor=false, onceki=null;

  /* ---- Cihazdaki Teksen verisi ---- */
  function bosVeri(){ var o={}; ADLAR.forEach(function(n){ o[n]=[]; }); return o; }
  /* Veri deposu yoksa boş sayılır ve oluşturulmaz. Okuma hatası "boş" sayılmaz: hata verir. */
  function oku(){
    return new Promise(function(ok,no){
      var r=indexedDB.open('teksen-takip'), yok=false;
      r.onupgradeneeded=function(){ yok=true; r.transaction.abort(); };
      r.onerror=function(e){ if(yok){ e.preventDefault(); ok(bosVeri()); } else no(r.error); };
      r.onsuccess=function(){
        var d=r.result; d.onversionchange=function(){ d.close(); };
        if(!ADLAR.every(function(n){ return d.objectStoreNames.contains(n); })){ d.close(); no(new Error('Teksen verisinin yapısı tanınmadı.')); return; }
        var tx=d.transaction(ADLAR,'readonly'), q=ADLAR.map(function(n){ return tx.objectStore(n).getAll(); });
        tx.oncomplete=function(){ d.close(); var o={}; ADLAR.forEach(function(n,i){ o[n]=q[i].result||[]; }); ok(o); };
        tx.onabort=function(){ d.close(); no(tx.error||new Error('Teksen verisi okunamadı.')); };
      };
    });
  }
  /* Okuma, karşılaştırma ve yazma tek işlemde: veri "beklenen" halinden farklıysa hiçbir şey yazılmaz (false döner) */
  function yaz(veri,beklenen){
    return new Promise(function(ok,no){
      var r=indexedDB.open('teksen-takip',1);
      r.onupgradeneeded=function(){ ADLAR.forEach(function(n){ if(!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n,{keyPath:TABLO[n]}); }); };
      r.onerror=function(){ no(r.error); };
      r.onsuccess=function(){
        var d=r.result, tx, degismis=false, h=null; d.onversionchange=function(){ d.close(); };
        try{
          tx=d.transaction(ADLAR,'readwrite');
          var q=ADLAR.map(function(n){ return tx.objectStore(n).getAll(); });
          q[q.length-1].onsuccess=function(){
            try{
              var simdiki={}; ADLAR.forEach(function(n,i){ simdiki[n]=q[i].result||[]; });
              if(kanon(simdiki)!==beklenen){ degismis=true; tx.abort(); return; }
              ADLAR.forEach(function(n){ var s=tx.objectStore(n); s.clear(); veri[n].forEach(function(x){ s.put(x); }); });
            }catch(e){ h=e; tx.abort(); }
          };
          tx.oncomplete=function(){ d.close(); ok(true); };
          tx.onabort=function(){ d.close(); if(degismis) ok(false); else no(h||tx.error||new Error('Gelen Teksen verisi kaydedilemedi: tarayıcının veri alanı dolu olabilir.')); };
        }catch(e){ try{ tx.abort(); }catch(x){} d.close(); no(e); }
      };
    });
  }

  /* ---- Özet ---- */
  function sabit(x){ if(Array.isArray(x)) return '['+x.map(sabit).join(',')+']'; if(x&&typeof x==='object') return '{'+Object.keys(x).sort().filter(function(k){ return x[k]!==undefined; }).map(function(k){ return JSON.stringify(k)+':'+sabit(x[k]); }).join(',')+'}'; return JSON.stringify(x===undefined?null:x); }
  function bag(m){ return String(m.k).indexOf('link:')===0; }
  /* Elle kurulan bağdaki firma kimliği cihaza özgüdür: karşılaştırmaya girmez (bağ değişince saati "t" değişir) */
  function kanon(v){
    return ADLAR.map(function(n){
      var a=v[n].slice().sort(function(p,q){ var x=String(p[TABLO[n]]), y=String(q[TABLO[n]]); return x<y?-1:x>y?1:0; });
      if(n==='meta') a=a.map(function(m){ if(!bag(m)) return m; var c=Object.assign({},m); delete c.fid; delete c.sube; delete c.yer; return c; });
      return n+sabit(a);
    }).join('\n');
  }
  function sonAlim(v){ var s=v.meta.filter(function(m){ return m.k==='son'; })[0]; return (s&&s.t)||''; }
  async function ozetle(veri){
    var metin=kanon(veri), h=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(metin))), say={};
    ADLAR.forEach(function(n){ say[n]=veri[n].length; });
    return {ozet:Array.from(h,function(b){ return (b<16?'0':'')+b.toString(16); }).join(''),say:say,sonT:sonAlim(veri),kanon:metin,veri:veri};
  }

  /* ---- Karar (saf hesap) ---- */
  function bosMu(x){ return ADLAR.every(function(n){ return !x.say[n]; }); }
  /* Belirgin az: bir kayıt türü tamamen boşalmış ya da en az 3 kayıt ve onda birden fazlası eksilmiş */
  function azMi(yeni,eski){ return SAYILAN.some(function(n){ var e=eski.say[n]||0, y=yeni.say[n]||0; return e>0&&(y===0||(e-y>=3&&y<e*0.9)); }); }
  function eskiMi(yeni,eski){ return !!eski.sonT&&(!yeni.sonT||yeni.sonT<eski.sonT); }
  /* L: bu cihaz, U: depodaki kopya (yoksa null), T: en son ortak hal (yoksa null) */
  function karar(L,U,T,rol,durdu){
    if(U&&L.ozet===U.ozet) return 'ayni';
    if(!U){
      if(rol!=='ana') return 'bekle-ana';
      if(bosMu(L)) return 'bos';
      if(durdu) return 'sor-gerial';
      return T&&azMi(L,T)?'sor-az-giden':'gonder';
    }
    if(durdu) return 'sor-gerial';
    if(!T) return bosMu(L)?'al':(rol==='ana'?'sor-ilk-ana':'sor-ilk');
    if(L.ozet===T.ozet) return azMi(U,L)?'sor-az-gelen':(eskiMi(U,L)?'sor-eski-gelen':'al');
    if(U.ozet===T.ozet) return azMi(L,T)?'sor-az-giden':(eskiMi(L,T)?'sor-eski-giden':'gonder');
    return 'sor-cakisma';
  }

  /* ---- Birleştirme: hiçbir kayıt silinmez; aynı kayıtta yeni tarihli kalır ---- */
  function birlestir(a,b){
    var aSon=sonAlim(a), bSon=sonAlim(b);
    /* Tarihler eşitse en son Teksen alımı yapan taraf yeni sayılır */
    function yeniMi(x,y,alanlar){
      for(var i=0;i<alanlar.length;i++){ var p=String(alanlar[i](x)||''), q=String(alanlar[i](y)||''); if(p!==q) return p>q; }
      return bSon>aSon;
    }
    var OLCU={firms:[function(x){ return x.guncelleme; }],docs:[function(x){ return x.guncelleme; }],
      hizmet:[function(x){ return (x.veri||{}).guncelleme_tarihi; }],
      uyg:[function(x){ return x.sonGorulme; },function(x){ return x.guncellemeZ; }],
      meta:[function(x){ return x.t; }]};
    var out={};
    ADLAR.forEach(function(n){
      var m={}, sira=[];
      a[n].forEach(function(x){ var k=String(x[TABLO[n]]); m[k]=x; sira.push(k); });
      b[n].forEach(function(y){
        var k=String(y[TABLO[n]]), x=m[k]; if(!x){ m[k]=y; sira.push(k); return; }
        var sonuc;
        if(n==='meta'&&k==='gunluk'){
          var g={}; (x.n||[]).concat(y.n||[]).forEach(function(z){ g[z.t]=z; });
          sonuc={k:k,n:Object.keys(g).sort().reverse().slice(0,60).map(function(t){ return g[t]; })};
        } else if(n==='meta'&&k==='plannames'){
          var yb=yeniMi(y,x,OLCU.meta); sonuc={k:k,n:Object.assign({},(yb?x:y).n,(yb?y:x).n),t:Math.max(x.t||0,y.t||0)};
        } else {
          sonuc=yeniMi(y,x,OLCU[n])?y:x;
          if(n==='uyg'&&x.ilkGorulme&&y.ilkGorulme) sonuc=Object.assign({},sonuc,{ilkGorulme:x.ilkGorulme<y.ilkGorulme?x.ilkGorulme:y.ilkGorulme});
        }
        m[k]=sonuc;
      });
      out[n]=sira.map(function(k){ return m[k]; });
    });
    return out;
  }

  /* ---- Elle kurulan bağları cihazlar arasında çevirme ---- */
  async function yerListesi(){ var v=await window.Veri.oku(); if(v.hata.length) throw new Error(v.hata.join(' ')); return ORT.yerler(v); }
  function rakam(x){ return String(x==null?'':x).replace(/\D/g,''); }
  /* Gönderirken: bağlanan yerin tarifi eklenir (kaydın kendi sicili tarife girmez) */
  function tarifEkle(veri,Y){
    return Object.assign({},veri,{meta:veri.meta.map(function(m){
      var u=bag(m)&&Y.anahtar[m.fid+'|'+(m.sube||'')]; if(!u) return m;
      return Object.assign({},m,{yer:{firma:u.firma,sube:u.sube,sgk:u.sgk.filter(function(s){ return s!==rakam(m.sicil); })}});
    })});
  }
  /* Alırken: kimlik bu cihazda yoksa SGK no / adla eşlenir; emin olunamazsa olduğu gibi bırakılır */
  function bagCevir(veri,Y){
    return Object.assign({},veri,{meta:veri.meta.map(function(m){
      if(!bag(m)||Y.anahtar[m.fid+'|'+(m.sube||'')]) return m;
      var u=ORT.esle(Y,m.yer); return u?Object.assign({},m,{fid:u.fid,sube:u.sube}):m;
    })});
  }

  /* ---- Sıkıştırma ve dosya ---- */
  async function akis(bayt,T){ return new Uint8Array(await new Response(new Blob([bayt]).stream().pipeThrough(new T('gzip'))).arrayBuffer()); }
  async function paketle(a,veri){
    var duz=await akis(new TextEncoder().encode(JSON.stringify({v:1,tur:'teksen',data:veri})),CompressionStream);
    var iv=crypto.getRandomValues(new Uint8Array(12)), s=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},a.anahtar,duz);
    return JSON.stringify({app:'kigu-esit',v:1,tuz:a.tuz,iv:ORT.b64(iv),veri:ORT.b64(new Uint8Array(s))});
  }
  async function ac(a,metin){
    var z=ORT.zarf(metin); if(z.tuz!==a.tuz) throw new Error('Depodaki Teksen dosyası başka bir kurulumla yazılmış. Üzerine yazılmadı. Parolayı bilerek değiştirdiyseniz gizli depodaki teksen.sifreli.json dosyasını silin.');
    var acik; try{ acik=await crypto.subtle.decrypt({name:'AES-GCM',iv:ORT.ub64(z.iv)},a.anahtar,ORT.ub64(z.veri)); }catch(e){ throw new Error('Depodaki Teksen dosyası açılamadı (parola farklı ya da dosya bozuk). Üzerine yazılmadı.'); }
    var o; try{ o=JSON.parse(new TextDecoder().decode(await akis(new Uint8Array(acik),DecompressionStream))); }catch(e){ o=null; }
    if(!o||o.v!==1||o.tur!=='teksen'||!o.data||!ADLAR.every(function(n){ return Array.isArray(o.data[n])&&o.data[n].every(function(x){ return x&&typeof x==='object'&&x[TABLO[n]]!=null; }); })) throw new Error('Depodaki Teksen dosyası tanınmadı. Üzerine yazılmadı.');
    return o.data;
  }
  /* Dosyanın kimliği (sha) klasör listesinden okunur: değişmediyse dosya yeniden indirilmez */
  async function uzakSha(a){
    var r=await ORT.istek(a,'/contents/'); if(r.status===404) return null; if(!r.ok) throw ORT.ghHata(r);
    var l=await r.json(), f=(Array.isArray(l)?l:[]).filter(function(x){ return x.name===DOSYA; })[0]; return f?f.sha:null;
  }
  async function indir(a,sha){
    var r=await ORT.istek(a,'/git/blobs/'+sha); if(!r.ok) throw ORT.ghHata(r);
    var u=await ozetle(await ac(a,new TextDecoder().decode(ORT.ub64((await r.json()).content)))); u.sha=sha; return u;
  }
  /* null: dosya bu arada başka cihazca değiştirilmiş */
  async function gonder(a,veri,sha){
    await ORT.depoDenetle(a);
    var g={message:'esitleme',content:ORT.b64(new TextEncoder().encode(await paketle(a,veri)))}; if(sha) g.sha=sha;
    var r=await ORT.istek(a,'/contents/'+DOSYA,{method:'PUT',body:JSON.stringify(g)});
    if(r.status===409||r.status===422) return null; if(!r.ok) throw ORT.ghHata(r);
    return (await r.json()).content.sha;
  }

  /* ---- Eşitleme turu ---- */
  function durumOku(){ return ORT.depo('readonly',function(s){ return s.get('teksen'); }); }
  function durumYaz(d){ return ORT.depo('readwrite',function(s){ return s.put(d); }); }
  function oncekiOku(){ return ORT.depo('readonly',function(s){ return s.get('teksen-onceki'); }); }
  function kayitSil(k){ return ORT.depo('readwrite',function(s){ return s.delete(k); }); }
  /* Geçici kayıttaki kopya tek işlemde "önceki kopya" olur */
  function yukselt(y){ return ORT.depo('readwrite',function(s){ s.delete('teksen-onceki-yeni'); return s.put({k:'teksen-onceki',t:y.t,veri:y.veri}); }).then(function(){ onceki=y.t; }); }
  /* Veriyi değiştirir. Eski "önceki kopya" yalnız yazma başarılı olursa yenisiyle değişir.
     Değişecek bir şey yoksa ya da bu cihazdaki veri boşsa eldeki önceki kopyaya dokunulmaz. false: veri bu sırada değişmiş */
  async function degistir(hedef,L){
    if(kanon(hedef)===L.kanon) return true;
    if(bosMu(L)) return yaz(hedef,L.kanon);
    var y={k:'teksen-onceki-yeni',t:Date.now(),veri:L.veri};
    try{ await ORT.depo('readwrite',function(s){ return s.put(y); }); }catch(e){ throw new Error('Önceki Teksen verisi saklanamadığı için üzerine yazılmadı.'); }
    var oldu=false;
    try{ oldu=await yaz(hedef,L.kanon); }catch(e){ await kayitSil(y.k); throw e; }
    if(!oldu){ await kayitSil(y.k); return false; }
    await yukselt(y); return true;
  }
  /* Yazma sırasında uygulama kapandıysa: veri değişmişse geçici kopya "önceki kopya" yapılır, değişmemişse atılır */
  async function yarimKalan(){
    var y=await ORT.depo('readonly',function(s){ return s.get('teksen-onceki-yeni'); }); if(!y) return;
    if(kanon(await oku())===kanon(y.veri)) await kayitSil(y.k); else await yukselt(y);
  }
  function ortak(x,sha){ return {ozet:x.ozet,say:x.say,sonT:x.sonT,sha:sha}; }
  function mesgul(){ return !!document.getElementById('pencere').open; }

  async function tur(a){
    var d=(await durumOku())||null; durum=d;
    await yarimKalan();
    var o=await oncekiOku(); onceki=o?o.t:null;
    if(!d||!d.rol){ soru=null; return; }
    for(var i=0;i<4;i++){
      var L=await ozetle(await oku()), T=d.taban||null, sha=await uzakSha(a), U=null;
      if(sha) U=T&&T.sha===sha?Object.assign({},T):await indir(a,sha);
      var k=karar(L,U,T,d.rol,!!d.durdu), lo=L.ozet, uo=U?U.ozet:'';
      /* Kullanıcının seçimi yalnız gördüğü haller aynen duruyorsa uygulanır */
      if(secim){ if(secim.lo===lo&&secim.uo===uo&&k.indexOf('sor-')===0) k=secim.is; secim=null; }
      if(k==='ayni'){ d.taban=ortak(U,sha); d.durdu=false; return bitti(d,true); }
      if(k==='bos'||k==='bekle-ana'){ bilgi=k==='bos'?'Bu cihazda henüz Teksen verisi yok.':'Ana cihazın ilk gönderimi bekleniyor. Bilgisayarda uygulamayı açın.'; return bitti(d,false); }
      if(k.indexOf('sor-')===0){ soru={tur:k,lo:lo,uo:uo,yerel:{say:L.say,sonT:L.sonT},uzak:U?{say:U.say,sonT:U.sonT}:null}; bilgi=''; return; }
      if(k==='gonder'){
        var yeniSha=await gonder(a,tarifEkle(L.veri,await yerListesi()),sha); if(!yeniSha) continue;
        d.taban=ortak(L,yeniSha); d.durdu=false; return bitti(d,true);
      }
      /* al ya da birlestir: bu cihazın verisi değişecek */
      if(mesgul()){ bilgi='Açık pencere kapanınca diğer cihazdan gelen Teksen verisi yazılacak.'; ORT.tetikle(20000); return; }
      if(!U.veri) U=await indir(a,sha);
      var gelen=k==='birlestir'?null:U.veri, Y=await yerListesi();
      var hedef=bagCevir(gelen||birlestir(L.veri,bagCevir(U.veri,Y)),Y);
      if(!(await degistir(hedef,L))) continue;
      yenileBekliyor=true; d.durdu=false;
      if(k==='al'){ d.taban=ortak(U,sha); return bitti(d,true); }
      /* birleşen veri bir sonraki adımda gönderilir */
      d.taban=ortak(U,sha); if(!(await ORT.ayarVar())) return; await durumYaz(d);
    }
    throw new Error('Teksen verisi bu sırada değişiyor; biraz sonra yeniden denenecek.');
  }
  async function bitti(d,esit){
    soru=null; if(esit){ bilgi=''; d.son=Date.now(); }
    if(!(await ORT.ayarVar())) return;
    await durumYaz(d); durum=d;
  }
  /* Eşitleme turu bittikten sonra çağrılır: gelen veri ekrana yansıtılır (açık pencere ya da yazı varken beklenir) */
  function ekran(){
    if(yenileBekliyor&&!mesgul()&&!ORT.yaziyor()){ yenileBekliyor=false; var y=window.scrollY; Promise.resolve(ORT.UI().yenile()).then(function(){ window.scrollTo(0,y); }); }
  }

  async function rolSec(rol){
    var d={k:'teksen',rol:rol,taban:null,son:0}; await durumYaz(d); durum=d; hata=''; await ORT.simdi();
  }
  async function sec(is,s){ soru=null; ciz(); await ORT.bekle(); secim={is:is,lo:s.lo,uo:s.uo}; await ORT.simdi(); }
  /* Önceki kopyayı geri koyar. Şimdiki veri de saklanır; eşitleme, ne yapılacağı sorulana kadar durur. */
  async function geriAl(){
    var o=await oncekiOku(); if(!o) throw new Error('Saklanan önceki kopya yok.');
    var d=await durumOku(), L=await ozetle(await oku());
    /* önce eşitleme durdurulur: yazma ile durdurma arasında kendiliğinden gönderim olmaz */
    if(d){ d.durdu=true; await durumYaz(d); durum=d; }
    if(!(await degistir(o.veri,L))) throw new Error('Veri bu sırada değişti. Yeniden deneyin.');
    yenileBekliyor=true;
  }
  function sifirla(){ durum=null; soru=null; hata=''; bilgi=''; secim=null; return ORT.depo('readwrite',function(s){ return s.delete('teksen'); }); }

  /* ---- Ekran ---- */
  function sayim(x){ return x.say.firms+' firma/şube kaydı, '+x.say.hizmet+' hizmet, '+x.say.uyg+' uygunsuzluk, '+x.say.docs+' belge bilgisi · son Teksen alımı: '+(x.sonT?new Date(x.sonT).toLocaleString('tr-TR'):'yok'); }
  var SORU={
    'sor-ilk':['İlk bağlantı: bu cihaza ana cihazdaki kopya alınacak. Bu cihazdaki Teksen verisinin yerine geçer. Önce yedek indirin.',[['al','Ana cihazdaki kopyayı al','Bu cihazdaki Teksen verisi ana cihazdaki kopyayla değiştirilsin mi?']]],
    'sor-ilk-ana':['Depoda bu cihazdakinden farklı bir Teksen kopyası var.',[['gonder','Bu cihazdakini gönder','Depodaki kopya bu cihazdaki veriyle değiştirilsin mi?'],['birlestir','Birleştir (hiçbir kayıt silinmez)']]],
    'sor-cakisma':['İki cihazda da Teksen verisi değişmiş. Birleştirirseniz hiçbir kayıt silinmez, aynı kayıtta yeni tarihli kalır. Bir cihazda sildiğiniz kayıtlar geri gelebilir.',[['birlestir','Birleştir (hiçbir kayıt silinmez)']]],
    'sor-az-gelen':['Diğer cihazdan gelen veri belirgin biçimde daha az. Orada bilerek silmediyseniz almayın.',[['al','Evet, gelen kopyayı al','Gelen kopya daha az kayıt içeriyor. Bu cihazdaki veri onunla değiştirilsin mi?'],['gonder','Hayır, bu cihazdakini koru ve gönder','Diğer taraftaki kopya bu cihazdaki veriyle değiştirilsin mi?'],['birlestir','Birleştir (hiçbir kayıt silinmez)']]],
    'sor-az-giden':['Bu cihazdaki Teksen verisi belirgin biçimde azalmış. Bilerek silmediyseniz göndermeyin.',[['gonder','Evet, bu hâli gönder','Diğer cihaza da bu azalmış veri gidecek. Emin misiniz?'],['al','Hayır, depodaki kopyayı geri al','Bu cihazdaki veri depodaki kopyayla değiştirilsin mi?'],['birlestir','Birleştir (hiçbir kayıt silinmez)']]],
    'sor-eski-gelen':['Diğer cihazdan gelen veri daha eski bir Teksen alımına ait (eski bir yedek yüklenmiş olabilir).',[['al','Yine de gelen kopyayı al','Bu cihazdaki daha yeni veri, gelen eski kopyayla değiştirilsin mi?'],['gonder','Bu cihazdakini koru ve gönder','Diğer taraftaki kopya bu cihazdaki veriyle değiştirilsin mi?'],['birlestir','Birleştir (hiçbir kayıt silinmez)']]],
    'sor-eski-giden':['Bu cihazdaki veri, daha önce eşitlenenden eski bir Teksen alımına ait (eski bir yedek yüklenmiş olabilir).',[['gonder','Yine de bu hâli gönder','Daha eski veri diğer cihaza da gidecek. Emin misiniz?'],['al','Depodaki kopyayı geri al','Bu cihazdaki veri depodaki kopyayla değiştirilsin mi?'],['birlestir','Birleştir (hiçbir kayıt silinmez)']]],
    'sor-gerial':['Önceki kopyayı geri aldınız. Siz seçene kadar Teksen eşitlemesi bekler.',[['gonder','Bu hâli diğer cihaza da gönder','Diğer cihazdaki Teksen verisi de bu hâle gelecek. Emin misiniz?'],['al','Depodaki kopyayı yeniden al','Geri aldığınız hâlin yerine depodaki kopya yazılsın mı?']]]
  };
  function durumYazi(){
    if(!durum||!durum.rol) return 'henüz açılmadı';
    var son=durum.son?'son eşitleme '+ORT.saat(durum.son):'henüz eşitlenmedi';
    if(hata) return 'EŞİTLENEMEDİ · '+son;
    if(soru) return 'ONAYINIZ BEKLİYOR · '+son;
    return son;
  }
  var cizilen=null;
  function ciz(){
    var y=document.getElementById('teksen-esit'); if(!y){ cizilen=null; return; }
    var imza=JSON.stringify([durum&&durum.rol,durum&&durum.son,soru&&[soru.tur,soru.lo,soru.uo],hata,bilgi,onceki,durumYazi()]);
    if(cizilen===y&&y.getAttribute('data-imza')===imza) return; cizilen=y; y.setAttribute('data-imza',imza);
    var E=ORT.UI().E; y.textContent='';
    function dugme(yer,ad,fn){ var b=E('button','dugme ana',ad); b.type='button'; b.addEventListener('click',function(){ fn(b); }); yer.appendChild(b); return b; }
    function olmadi(e){ hata=e&&e.message||String(e); ciz(); }
    y.appendChild(E('h2',null,'Teksen verisi eşitleme'));
    if(hata) y.appendChild(E('p','bilgi uyari',hata));
    if(!durum||!durum.rol){
      y.appendChild(E('p','not','Bu cihazda kayıtlı Teksen verisinin tamamı (Akkurtlar, kayıtlı irtibat bilgileri ve hizmet kayıtlarındaki kişi bilgileri dahil) aynı gizli depoya şifreli olarak gönderilir. Teksen sitesinin çalışması gerekmez. Önce bilgisayarda açın. Bu cihaz hangisi?'));
      var s=E('div','islemler'); y.appendChild(s);
      dugme(s,'Bu bilgisayar (ana cihaz)',function(){ if(confirm('Bu cihaz ANA cihaz olarak ayarlansın mı? Depoda kopya yoksa buradaki Teksen verisi gönderilir.')) rolSec('ana').catch(olmadi); });
      dugme(s,'Bu telefon (ikinci cihaz)',function(){ if(confirm('Bu cihaz İKİNCİ cihaz olarak ayarlansın mı? Ana cihazdaki kopya buraya alınır.')) rolSec('ikinci').catch(olmadi); });
      return;
    }
    y.appendChild(E('p','bilgi',durumYazi()+(bilgi?' · '+bilgi:'')));
    y.appendChild(E('p','not','Bu cihaz: '+(durum.rol==='ana'?'ana cihaz':'ikinci cihaz')+'. Bir cihazda yapılan Teksen alımı ve silme diğerine geçer. İki cihazda da değişiklik varsa ya da veri belirgin azalırsa önce size sorulur.'));
    if(soru){
      var q=soru, tanim=SORU[q.tur], dugmeler=tanim[1], k=E('div','bilgi uyari'); y.appendChild(k);
      k.appendChild(E('p',null,tanim[0]));
      if(q.tur==='sor-gerial'){
        if(!q.uzak) dugmeler=dugmeler.filter(function(x){ return x[0]==='gonder'; });
        else {
          if(!durum.taban||durum.taban.ozet!==q.uo) k.appendChild(E('p','dikkat','Dikkat: depodaki kopya da bu arada değişmiş. “Gönder” o değişikliklerin üzerine yazar.'));
          dugmeler=dugmeler.concat([['birlestir','Birleştir (hiçbir kayıt silinmez)']]);
        }
      }
      k.appendChild(E('p',null,'Bu cihaz: '+sayim(q.yerel)));
      if(q.uzak) k.appendChild(E('p',null,'Depodaki kopya: '+sayim(q.uzak)));
      var yedekGerek=q.tur==='sor-ilk', kilitli=[];
      if(yedekGerek){
        var h=E('p','durum'); h.setAttribute('role','status');
        dugme(k,'1) Önce yedeği indir',function(b){ b.disabled=true; h.textContent='Yedek hazırlanıyor…';
          window.Yedek.indir().then(function(r){ yedekIcin=q.lo; h.textContent='İndirme başlatıldı: '+r.ad+'. Dosyanın indiğini kontrol edin.'; kilitli.forEach(function(x){ x.disabled=false; }); },function(e){ h.className='durum hata'; h.textContent=e&&e.message||String(e); }).then(function(){ b.disabled=false; }); });
        k.appendChild(h);
      }
      var s2=E('div','islemler'); k.appendChild(s2);
      dugmeler.forEach(function(x){ var b=dugme(s2,x[1],function(){ if(confirm(x[2]||'Birleştirilsin mi?')) sec(x[0],q).catch(olmadi); }); if(yedekGerek){ b.disabled=yedekIcin!==q.lo; kilitli.push(b); } });
    }
    if(onceki){
      var s3=E('div','islemler'); y.appendChild(s3);
      dugme(s3,'Önceki kopyayı geri al',function(b){ if(!confirm('Bu cihazdaki Teksen verisi, '+new Date(onceki).toLocaleString('tr-TR')+' tarihinde saklanan önceki hâle döndürülsün mü? Ondan sonra bu cihazda yapılan Teksen alımları geri alınır.')) return; b.disabled=true; ORT.kilitle(geriAl).then(function(){ return ORT.simdi(); }).then(ekran).catch(olmadi); });
    }
  }
  function sayfa(yer){ var d=ORT.UI().E('div'); d.id='teksen-esit'; yer.appendChild(d); cizilen=null; ciz(); }

  function bagla(ort){ ORT=ort; }
  return {bagla:bagla,sayfa:sayfa,ciz:ciz,ekran:ekran,sifirla:sifirla,durumYazi:durumYazi,
    /* Onay yalnız o deneme için geçerlidir: tur başarısız olursa yeniden sorulur */
    tur:function(a){ return tur(a).then(function(){ hata=''; },function(e){ hata=e&&e.message||String(e); }).then(function(){ secim=null; }); },
    /* Kurulum geçersizse Teksen verisi gönderilmez */
    atla:function(){ secim=null; soru=null; hata='Eşitleme kurulumu geçersiz olduğu için Teksen verisi gönderilmedi. Bu cihazda eşitlemeyi kapatıp yeniden kurun.'; },
    acik:function(){ return !!(durum&&durum.rol); },soruVar:function(){ return !!soru; },hataVar:function(){ return !!hata; },
    _test:{karar:karar,azMi:azMi,birlestir:birlestir,kanon:kanon}};
})();

/* İki cihaz eşitleme: ziyaret kayıtları (Akkurtlar dahil). Teksen verisinin eşitlenmesi teksen-esit.js içindedir ve aynı turda çalışır.
   Veri cihazda şifrelenir (PBKDF2 + AES-GCM) ve yalnız GİZLİ bir GitHub deposuna yazılır; depo herkese açıksa hiçbir şey gönderilmez.
   Parola saklanmaz. Erişim anahtarı ve şifre anahtarı yalnız bu cihazda (IndexedDB 'kigu-esit') durur; yedeğe girmez.
   Firma, personel ve Teksen kayıtlarını yalnız okur (ziyareti doğru firmaya bağlamak için). Ziyaret silmez: silme bir işarettir. */
window.Esitle=(function(){
  var API='https://api.github.com', DOSYA='ziyaretler.sifreli.json', TUR_SAYISI=600000, SITE_DEPOSU='benim-sitem';
  var UI=null, cfg=null, calisiyor=null, tekrar=false, bekleyen=null, hata='', bilgiNotu='';

  /* ---- Cihazdaki ayar ---- */
  function depo(mod,fn){
    return new Promise(function(ok,no){
      var r=indexedDB.open('kigu-esit',1);
      r.onupgradeneeded=function(){ r.result.createObjectStore('a',{keyPath:'k'}); };
      r.onerror=function(){ no(r.error); };
      r.onsuccess=function(){ var d=r.result, t, q; d.onversionchange=function(){ d.close(); };
        try{ t=d.transaction('a',mod); q=fn(t.objectStore('a')); }catch(e){ d.close(); no(e); return; }
        t.oncomplete=function(){ d.close(); ok(q&&q.result); }; t.onabort=function(){ d.close(); no(t.error||new Error('Eşitleme ayarı kaydedilemedi.')); };
      };
    });
  }
  async function ayarOku(){ return (await depo('readonly',function(s){ return s.get('ayar'); }))||null; }
  function ayarYaz(a){ return depo('readwrite',function(s){ return s.put(a); }); }
  function ayarSil(){ return depo('readwrite',function(s){ return s.delete('ayar'); }).then(function(){ return window.TeksenEsit.sifirla(); }); }

  /* ---- Şifreleme ---- */
  function b64(u){ var s=''; for(var i=0;i<u.length;i+=32768) s+=String.fromCharCode.apply(null,u.subarray(i,i+32768)); return btoa(s); }
  function ub64(s){ var t=atob(String(s).replace(/\s/g,'')), u=new Uint8Array(t.length); for(var i=0;i<t.length;i++) u[i]=t.charCodeAt(i); return u; }
  async function anahtarTuret(parola,tuz){
    var ham=await crypto.subtle.importKey('raw',new TextEncoder().encode(parola.normalize('NFC')),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:ub64(tuz),iterations:TUR_SAYISI},ham,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function sifrele(anahtar,tuz,list){
    var iv=crypto.getRandomValues(new Uint8Array(12)), veri=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},anahtar,new TextEncoder().encode(JSON.stringify({v:1,list:list})));
    return JSON.stringify({app:'kigu-esit',v:1,tuz:tuz,iv:b64(iv),veri:b64(new Uint8Array(veri))});
  }
  function zarf(metin){
    var o; try{ o=JSON.parse(metin); }catch(e){ o=null; }
    if(!o||o.app!=='kigu-esit'||o.v!==1||!o.tuz||!o.iv||!o.veri) throw new Error('Depodaki eşitleme dosyası tanınmadı. Üzerine yazılmadı.');
    return o;
  }
  async function coz(anahtar,o){
    var acik; try{ acik=await crypto.subtle.decrypt({name:'AES-GCM',iv:ub64(o.iv)},anahtar,ub64(o.veri)); }catch(e){ throw new Error('Parola yanlış ya da depodaki dosya bozuk. Üzerine yazılmadı.'); }
    return window.Ziyaret.coz(new TextDecoder().decode(acik)).list;
  }

  function kurulumHata(e){ e.kurulum=true; return e; }

  /* ---- GitHub ---- */
  async function istek(a,yol,secenek){
    var s=secenek||{}, b={'Authorization':'Bearer '+a.token,'Accept':s.accept||'application/vnd.github+json'};
    if(s.body) b['Content-Type']='application/json';
    try{ return await fetch(API+'/repos/'+a.depo+yol,{method:s.method||'GET',headers:b,body:s.body,cache:'no-store'}); }
    catch(e){ var h=new Error('GitHub’a ulaşılamadı (internet bağlantısını kontrol edin).'); h.ag=true; throw h; }
  }
  function ghHata(r){
    if(r.status===401) return new Error('Erişim anahtarı geçersiz veya süresi dolmuş.');
    if(r.status===429||(r.status===403&&r.headers.get('x-ratelimit-remaining')==='0')) return new Error('GitHub istek sınırı doldu; sonra yeniden denenecek.');
    if(r.status===403) return new Error('Erişim anahtarının bu depoda yazma izni yok (Contents: Read and write olmalı).');
    if(r.status===404) return new Error('Depo bulunamadı ya da anahtar bu depo için izinli değil.');
    return new Error('GitHub hata verdi ('+r.status+').');
  }
  /* Her yazmadan önce de çalışır: depo sonradan herkese açılırsa gönderim durur */
  async function depoDenetle(a){
    var r=await istek(a,''); if(!r.ok) throw ghHata(r); var d=await r.json();
    if(d.private!==true) throw new Error('Bu depo herkese açık. Güvenlik için hiçbir şey gönderilmedi. Gizli (Private) bir depo kullanın.');
  }
  async function dosyaAl(a){
    var r=await istek(a,'/contents/'+DOSYA); if(r.status===404) return null; if(!r.ok) throw ghHata(r);
    var d=await r.json(), icerik=d.content;
    if(!icerik){ /* 1 MB üstü dosyada içerik ayrı istenir */ var rb=await istek(a,'/git/blobs/'+d.sha); if(!rb.ok) throw ghHata(rb); icerik=(await rb.json()).content; }
    return {sha:d.sha,zarf:zarf(new TextDecoder().decode(ub64(icerik)))};
  }
  /* false: dosya bu arada başka cihazca değiştirilmiş, baştan alınmalı */
  async function dosyaYaz(a,metin,sha){
    var g={message:'esitleme',content:b64(new TextEncoder().encode(metin))}; if(sha) g.sha=sha;
    var r=await istek(a,'/contents/'+DOSYA,{method:'PUT',body:JSON.stringify(g)});
    if(r.status===409||r.status===422) return false; if(!r.ok) throw ghHata(r); return true;
  }

  /* ---- Birleştirme ---- */
  function sabit(x){ if(Array.isArray(x)) return '['+x.map(sabit).join(',')+']'; if(x&&typeof x==='object') return '{'+Object.keys(x).sort().filter(function(k){ return x[k]!==undefined; }).map(function(k){ return JSON.stringify(k)+':'+sabit(x[k]); }).join(',')+'}'; return JSON.stringify(x===undefined?null:x); }
  /* Kaydın içeriği: cihaza özgü firma kimliği ve değiştirilme saati karşılaştırmaya girmez */
  function imza(z){
    var ad={}; Object.keys(z.adimlar).forEach(function(k){ var v=z.adimlar[k]||{}; if(v.d||v.n) ad[k]={d:v.d||'',n:v.n||''}; });
    return sabit([z.tur,z.tarih,z.ad,!!z.tamam,z.silindi||0,ad,z.onceki||{},z.devir.map(function(x){ return [x.kod,x.d||'',x.n||'',x.not||'',x.tarih]; }),z.tespit||'',z.defter||'']);
  }
  /* taban: iki cihazın en son ortak gördüğü hali. Yalnız bir taraf değiştirdiyse o alınır; ikisi de değiştirdiyse yenisi. */
  function sec(t,y,e,tabanVar){ if(y===e) return y; if(tabanVar){ if(y===t) return e; if(e===t) return y; return y; } return y||e; }
  /* Yazılar kaybolmaz: iki taraf farklı yazdıysa ikisi de tutulur */
  function yazi(t,y,e,tabanVar){
    if(y===e) return y; if(tabanVar){ if(y===t) return e; if(e===t) return y; }
    if(!e) return y; if(!y) return e; if(y.indexOf(e)>=0) return y; if(e.indexOf(y)>=0) return e;
    return y+'\n[Diğer cihazda yazılan]: '+e;
  }
  function birKayit(taban,yerel,uzak){
    if(!yerel) return Object.assign({},uzak);
    if(!uzak) return Object.assign({},yerel);
    if(imza(yerel)===imza(uzak)) return Object.assign({},yerel,{t:Math.max(yerel.t||0,uzak.t||0)});
    var yy=(yerel.t||0)>=(uzak.t||0), y=yy?yerel:uzak, e=yy?uzak:yerel, v=!!taban, t=taban||{adimlar:{},devir:[]};
    var s=Object.assign({},e,y);
    s.tarih=sec(t.tarih,y.tarih,e.tarih,v); s.ad=sec(t.ad,y.ad,e.ad,v);
    s.tamam=v&&!!y.tamam===!!t.tamam?!!e.tamam:!!y.tamam;
    var sil=v&&(y.silindi||0)===(t.silindi||0)?(e.silindi||0):(y.silindi||0); if(sil) s.silindi=sil; else delete s.silindi;
    s.tespit=yazi(t.tespit||'',y.tespit||'',e.tespit||'',v); s.defter=yazi(t.defter||'',y.defter||'',e.defter||'',v);
    function is(tk,yk,ek){ tk=tk||{}; yk=yk||{}; ek=ek||{}; return {d:sec(tk.d||'',yk.d||'',ek.d||'',v),n:yazi(tk.n||'',yk.n||'',ek.n||'',v)}; }
    s.adimlar={}; var kodlar=Object.assign({},e.adimlar,y.adimlar);
    Object.keys(kodlar).forEach(function(k){ s.adimlar[k]=is(t.adimlar[k],y.adimlar[k],e.adimlar[k]); });
    function kodla(L){ var o={}; (L||[]).forEach(function(x){ o[x.kod]=x; }); return o; }
    var dt=kodla(t.devir), dy=kodla(y.devir), de=kodla(e.devir), sira=y.devir.map(function(x){ return x.kod; });
    e.devir.forEach(function(x){ if(!dy[x.kod]) sira.push(x.kod); });
    s.devir=sira.map(function(k){ return Object.assign({},de[k],dy[k],is(dt[k],dy[k],de[k])); });
    s.t=Math.max(y.t||0,e.t||0);
    return s;
  }

  /* ---- Ziyareti bu cihazdaki doğru firmaya bağlama ---- */
  function rakam(x){ return String(x==null?'':x).replace(/\D/g,''); }
  function duz(x){ return String(x==null?'':x).replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR').replace(/i̇/g,'i').replace(/ı/g,'i'); }
  function yerler(V){
    var out=[], gor={};
    V.firmalar.forEach(function(F){
      var subeler=[''].concat(F.sb||[]);
      Object.keys(V.lk.byUnit).forEach(function(k){ if(k.indexOf(F.id+'|')===0) subeler.push(k.slice(F.id.length+1)); });
      subeler.forEach(function(s){
        var key=F.id+'|'+s; if(gor[key]) return;
        var no={}, inf=s?(F.sbi&&F.sbi[s]):F.info, a=rakam(inf&&inf.sgk); if(a.length>=5) no[a]=1;
        (V.lk.byUnit[key]||[]).forEach(function(r){ var b=rakam(r.sicil); if(b.length>=5) no[b]=1; });
        gor[key]={fid:F.id,sube:s,firma:F.name||'',sgk:Object.keys(no).sort()}; out.push(gor[key]);
      });
    });
    return {liste:out,anahtar:gor};
  }
  /* Yalnız tek bir aday varsa eşleşir; emin olunamazsa null döner ve kullanıcıya sorulur */
  function esle(Y,yer){
    if(!yer) return null;
    var no=yer.sgk||[], a=Y.liste.filter(function(u){ return u.sgk.some(function(n){ return no.indexOf(n)>=0; }); });
    if(a.length>1) a=a.filter(function(u){ return duz(u.sube)===duz(yer.sube); });
    if(a.length) return a.length===1?a[0]:null;
    if(!duz(yer.firma)) return null;
    var b=Y.liste.filter(function(u){ return duz(u.firma)===duz(yer.firma)&&duz(u.sube)===duz(yer.sube)&&!(no.length&&u.sgk.length); });
    return b.length===1?b[0]:null;
  }
  function yerlestir(Y,s,yerel,uzak){
    var u=null;
    [yerel,uzak].forEach(function(z){ if(!u&&z) u=Y.anahtar[z.fid+'|'+z.sube]||null; });
    var tarif=(uzak&&uzak.yer)||(yerel&&yerel.yer);
    if(!u) u=esle(Y,tarif);
    if(u){ s.fid=u.fid; s.sube=u.sube; s.yer={firma:u.firma,sube:u.sube,sgk:u.sgk}; }
    else { var k=yerel||uzak; s.fid=k.fid; s.sube=k.sube; if(tarif) s.yer=tarif; }
    return s;
  }
  function harita(L){ var o={}; (L||[]).forEach(function(z){ o[z.id]=z; }); return o; }
  function hepsiniBirlestir(Y,taban,yerel,uzak){
    var l=harita(yerel), u=harita(uzak), sira=yerel.map(function(z){ return z.id; });
    uzak.forEach(function(z){ if(!l[z.id]) sira.push(z.id); });
    return sira.map(function(id){ return yerlestir(Y,birKayit(taban[id],l[id],u[id]),l[id],u[id]); });
  }

  /* Açık ziyaret formunda yazı yazılırken o ziyaret altından değiştirilmez */
  function acikForm(){ var m=/^#zform\/(.+)$/.exec(location.hash); if(!m) return ''; try{ return decodeURIComponent(m[1]); }catch(e){ return ''; } }
  function yaziyor(){ var a=document.activeElement; return !!a&&/^(TEXTAREA|INPUT|SELECT)$/.test(a.tagName)&&document.getElementById('ana').contains(a); }
  /* Okuma, birleştirme ve yazma arada beklemeden yapılır: bu sırada girilen yazı kaybolmaz */
  function uygula(taban,uzak){
    var Y=yerler(UI.veri()), ham=localStorage.getItem(window.Ziyaret.ANAHTAR), yerel=window.Ziyaret.coz(ham).list;
    var yeni=hepsiniBirlestir(Y,taban,yerel,uzak), eski=harita(yerel);
    var degisen=yeni.filter(function(z){ var o=eski[z.id]; return !o||imza(o)!==imza(z)||o.fid!==z.fid||o.sube!==z.sube; }).map(function(z){ return z.id; });
    var acik=acikForm();
    if(acik&&yaziyor()&&degisen.indexOf(acik)>=0) return null;
    var metin=JSON.stringify({v:1,list:yeni});
    if(yeni.length&&metin!==ham){ try{ localStorage.setItem(window.Ziyaret.ANAHTAR,metin); }catch(e){ throw new Error('Gelen ziyaretler kaydedilemedi: tarayıcının veri alanı dolu olabilir.'); } }
    return {list:yeni,degisen:degisen};
  }
  function ekranYenile(degisen){
    if(!degisen.length||document.getElementById('pencere').open||yaziyor()) return;
    var h=location.hash, acik=acikForm();
    if((acik&&degisen.indexOf(acik)>=0)||/^#(ziyaret(\/|$)|ana$)/.test(h)||h===''||h==='#'){ var y=window.scrollY; UI.ciz(); window.scrollTo(0,y); }
  }

  /* ---- Eşitleme turu ---- */
  async function tur(){
    var a=await ayarOku(); cfg=a; if(!a) return;
    await depoDenetle(a);
    for(var i=0;i<4;i++){
      var d=await dosyaAl(a), uzak=[];
      if(d){ if(d.zarf.tuz!==a.tuz) throw kurulumHata(new Error('Depodaki dosya yeniden oluşturulmuş. Bu cihazda eşitlemeyi kapatıp yeniden kurun.')); try{ uzak=await coz(a.anahtar,d.zarf); }catch(e){ throw kurulumHata(e); } }
      var s=uygula(a.taban||{},uzak);
      if(!s){ bilgiNotu='Yazı yazdığınız için diğer cihazdan gelen değişiklik bekliyor.'; tetikle(20000); return; }
      a.taban=harita(uzak); await ayarYaz(a);
      ekranYenile(s.degisen);
      var gonder=!d||s.list.some(function(z){ var o=a.taban[z.id]; return !o||imza(o)!==imza(z); });
      if(gonder){
        if(!(await dosyaYaz(a,await sifrele(a.anahtar,a.tuz,s.list),d&&d.sha))) continue;
        a.taban=harita(s.list);
      }
      /* bu arada eşitleme kapatıldıysa ayar geri yazılmaz */
      if(!(await ayarOku())) return;
      a.son=Date.now(); await ayarYaz(a); cfg=a; bilgiNotu=''; return;
    }
    throw new Error('Diğer cihaz aynı anda yazıyor; biraz sonra yeniden denenecek.');
  }
  function simdi(){
    if(!UI||!UI.veri()) return Promise.resolve();
    if(calisiyor){ tekrar=true; return calisiyor; }
    clearTimeout(bekleyen); bekleyen=null;
    /* Birinin hatası diğerini durdurmaz */
    var is=kilitle(function(){
      var gecersiz=false;
      return tur().then(function(){ hata=''; },function(e){ hata=e&&e.message||String(e); gecersiz=!!(e&&e.kurulum); })
        .then(ayarOku).then(function(a){ if(!a) return; if(gecersiz) return window.TeksenEsit.atla(); return window.TeksenEsit.tur(a); });
    });
    calisiyor=is.catch(function(e){ hata=e&&e.message||String(e); }).then(function(){
      calisiyor=null; durumCiz(); window.TeksenEsit.ekran(); anaYenile(); if(tekrar){ tekrar=false; tetikle(1000); }
    });
    durumCiz(); return calisiyor;
  }
  function kilitle(fn){ return navigator.locks?navigator.locks.request('kigu-esit',fn):Promise.resolve().then(fn); }
  /* Ana sayfadaki "onayınız bekliyor / eşitleme sorunu" kutuları güncel kalsın */
  var uyariImza='';
  function anaYenile(){
    var i=[!!hata,window.TeksenEsit.hataVar(),window.TeksenEsit.soruVar()].join(); if(i===uyariImza) return; uyariImza=i;
    if(/^#(ana)?$/.test(location.hash||'#')&&!document.getElementById('pencere').open&&!yaziyor()) UI.ciz();
  }
  function tetikle(ms){ if(!cfg) return; clearTimeout(bekleyen); bekleyen=setTimeout(simdi,ms); }

  /* ---- Durum yazıları ---- */
  function saat(t){ var d=new Date(t); return d.toDateString()===new Date().toDateString()?d.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }
  function durumYazi(){
    if(!cfg) return 'bu cihazda kurulu değil';
    var son=cfg.son?'son eşitleme '+saat(cfg.son):'henüz eşitlenmedi';
    if(calisiyor) return 'eşitleniyor… · '+son;
    if(hata) return 'EŞİTLENEMEDİ · '+son;
    return son;
  }
  function durumCiz(){
    var f=document.getElementById('esitdurum'); if(f) f.textContent=cfg?' · Ziyaret eşitleme: '+durumYazi()+(window.TeksenEsit.acik()?' · Teksen eşitleme: '+window.TeksenEsit.durumYazi():''):'';
    window.TeksenEsit.ciz();
    Array.prototype.forEach.call(document.querySelectorAll('[data-esit]'),function(x){ x.textContent=durumYazi()+(hata?' · '+hata:'')+(bilgiNotu?' · '+bilgiNotu:''); x.className=hata?'bilgi uyari':'bilgi'; });
  }
  function ziyaretNotu(){ return cfg?'Ziyaret kayıtları iki cihaz arasında şifreli olarak kendiliğinden eşitlenir. Elle eklenen firma/şube ve personel kayıtları eşitlenmez.':'Ziyaret kayıtları yalnız bu cihazda durur. İki cihazda aynı olması için Ayarlar’dan eşitlemeyi kurun.'; }

  /* ---- Kurulum ---- */
  function depoAdi(x){
    var s=String(x||'').trim().replace(/^https?:\/\/github\.com\//i,'').replace(/\.git$/i,'').replace(/\/+$/,'');
    if(!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(s)) throw new Error('Depo adını “kullanıcıadı/depoadı” biçiminde yazın.');
    if(s.split('/')[1].toLowerCase()===SITE_DEPOSU) throw new Error('Bu, herkese açık site deposu. Ayrı ve gizli bir depo yazın.');
    return s;
  }
  async function kur(adres,token,parola,parola2){
    var a={k:'ayar',depo:depoAdi(adres),token:String(token||'').trim(),taban:{},son:0};
    if(!/^[A-Za-z0-9_]{20,}$/.test(a.token)) throw new Error('Erişim anahtarını eksiksiz yapıştırın.');
    if(String(parola).length<12) throw new Error('Parola en az 12 karakter olmalı.');
    if(parola!==parola2) throw new Error('İki parola aynı değil.');
    await depoDenetle(a);
    var d=await dosyaAl(a);
    if(!d){
      var tuz=b64(crypto.getRandomValues(new Uint8Array(16))), k=await anahtarTuret(parola,tuz);
      if(!(await dosyaYaz(a,await sifrele(k,tuz,[]),null))) d=await dosyaAl(a);
      if(!d){ a.tuz=tuz; a.anahtar=k; }
    }
    if(d){ a.tuz=d.zarf.tuz; a.anahtar=await anahtarTuret(parola,a.tuz); await coz(a.anahtar,d.zarf); }
    await ayarYaz(a); cfg=a; hata='';
    await simdi();
  }
  async function anahtarYenile(token){
    var a=await ayarOku(); if(!a) throw new Error('Eşitleme kurulu değil.');
    a.token=String(token||'').trim(); await depoDenetle(a); await ayarYaz(a); cfg=a; hata=''; await simdi();
  }

  function sayfa(U){
    var E=U.E, ana=document.getElementById('ana');
    U.sayfa('İki cihaz eşitleme','Ziyaret kayıtları ve Teksen verisi telefonda ve bilgisayarda aynı olur.',[['Ayarlar','#ayarlar']]);
    if(!window.Kayit.onayli()) return;
    ana.appendChild(E('p','not','Ziyaret kayıtları (Akkurtlar dahil) kendiliğinden eşitlenir; Teksen verisi eşitlemesi kurulumdan sonra bu sayfada açılır. Elle eklenen firma/şube ve personel kayıtları eşitlenmez. Veri bu cihazda şifrelenip gizli GitHub deponuza (yurt dışındaki sunucu) gönderilir.'));
    function alan(f,ad,tur_,deger,not){ var l=E('label'); l.appendChild(E('span',null,ad)); var i=E('input'); i.type=tur_; i.value=deger||''; i.autocomplete=tur_==='password'?'new-password':'off'; i.autocapitalize='off'; i.spellcheck=false; l.appendChild(i); if(not) l.appendChild(E('small',null,not)); f.appendChild(l); return i; }
    function gonder(f,ad,calistir){
      var h=E('p','durum'); h.setAttribute('role','status'); var b=E('button','dugme ana',ad); b.type='submit'; f.appendChild(h); f.appendChild(b);
      f.addEventListener('submit',function(ev){ ev.preventDefault(); b.disabled=true; h.className='durum'; h.textContent='Bağlanılıyor…';
        calistir().then(function(){ U.ciz(); },function(e){ b.disabled=false; h.className='durum hata'; h.textContent=e&&e.message||String(e); }); });
    }
    if(!cfg){
      if(!(window.crypto&&window.crypto.subtle)){ ana.appendChild(E('p','bilgi uyari','Bu tarayıcı şifrelemeyi desteklemiyor.')); return; }
      var f=E('form','bilgi form'); ana.appendChild(f);
      var d=alan(f,'Gizli depo','text','hacivelioglu52/ziyaret-esitleme','Kullanıcı adı ve depo adı. Depo “Private” olmalı.');
      var t=alan(f,'GitHub erişim anahtarı','password','','Yalnız bu depoya, yalnız “Contents: Read and write” izinli anahtar. Kimseye göndermeyin.');
      var p=alan(f,'Eşitleme parolası','password','','En az 12 karakter. İki cihazda aynı olmalı. Unutulursa buluttaki kopya açılamaz.');
      var p2=alan(f,'Parola (tekrar)','password','');
      gonder(f,'Eşitlemeyi kur',function(){ return kur(d.value,t.value,p.value,p2.value); });
      return;
    }
    var dk=E('p','bilgi'); dk.setAttribute('data-esit','1'); dk.setAttribute('role','status'); ana.appendChild(dk); durumCiz();
    ana.appendChild(E('p','not','Depo: '+cfg.depo+'. Uygulama açıkken kendiliğinden eşitlenir. İnternet yoksa bağlantı gelince devam eder. Diğer cihaza geçmeden önce burada son eşitleme saatini kontrol edebilirsiniz.'));
    var s=E('div','islemler'); ana.appendChild(s);
    function dugme(ad,fn){ var b=E('button','dugme ana',ad); b.type='button'; b.addEventListener('click',fn); s.appendChild(b); }
    dugme('Şimdi eşitle',function(){ simdi(); });
    dugme('Bu cihazda eşitlemeyi kapat',function(){ if(!confirm('Eşitleme bu cihazda kapatılsın mı? Ziyaretler ve Teksen verisi bu cihazda kalır; depodaki kopya silinmez.')) return; clearTimeout(bekleyen); var bitir=calisiyor||Promise.resolve(); bitir.then(ayarSil).then(function(){ cfg=null; hata=''; bilgiNotu=''; durumCiz(); U.ciz(); },function(e){ alert(e&&e.message||e); }); });
    window.TeksenEsit.sayfa(ana);
    var det=E('details'); det.appendChild(E('summary',null,'Erişim anahtarını yenile (süresi dolduğunda)')); ana.appendChild(det);
    var f2=E('form','bilgi form'); det.appendChild(f2); var t2=alan(f2,'Yeni erişim anahtarı','password',''); gonder(f2,'Anahtarı değiştir',function(){ return anahtarYenile(t2.value); });
  }

  /* Uygulama ilk kez veri okuduktan sonra bir kez çağrılır */
  var basladi=false;
  function baslat(U){
    if(basladi) return; basladi=true; UI=U;
    window.TeksenEsit.bagla({depo:depo,istek:istek,ghHata:ghHata,depoDenetle:depoDenetle,zarf:zarf,b64:b64,ub64:ub64,yerler:yerler,esle:esle,saat:saat,yaziyor:yaziyor,tetikle:tetikle,simdi:simdi,kilitle:kilitle,
      bekle:function(){ return calisiyor||Promise.resolve(); },ayarVar:function(){ return ayarOku().then(function(a){ return !!a; }); },UI:function(){ return UI; }});
    window.addEventListener('online',function(){ tetikle(500); });
    document.addEventListener('visibilitychange',function(){ tetikle(document.hidden?0:800); });
    setInterval(function(){ if(!document.hidden&&!calisiyor&&!bekleyen) simdi(); },120000);
    ayarOku().then(function(a){ cfg=a; durumCiz(); if(a){ if(location.hash.indexOf('#esitle')===0||/^#(ziyaret|ana)?$/.test(location.hash||'#')) UI.ciz(); simdi(); } },function(){});
  }
  return {baslat:baslat,sayfa:sayfa,degisti:function(){ tetikle(10000); },simdi:simdi,durumYazi:durumYazi,hataVar:function(){ return !!hata||window.TeksenEsit.hataVar(); },ziyaretNotu:ziyaretNotu,
    _test:{birKayit:birKayit,imza:imza,esle:esle,yerler:yerler}};
})();

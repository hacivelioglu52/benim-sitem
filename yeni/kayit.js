/* Kayıt yazma. Her işlem önce güncel veriyi yeniden okur, sonra yazar.
   Hiçbir işlem kayıt silmez. Akkurtlar firmasına yazılmaz. */
window.Kayit=(function(){
  var FK='isg-firms-v1', PK='isg-evrakp-v1', ONAY='kigu-yedek-onay';
  function bosluk(s){ return String(s==null?'':s).replace(/\s+/g,' ').trim(); }
  function buyuk(s){ return bosluk(s).toLocaleUpperCase('tr-TR'); }
  function duz(s){ return bosluk(s).toLocaleLowerCase('tr-TR').replace(/i̇/g,'i').replace(/ı/g,'i'); }
  function rakam(s){ return String(s==null?'':s).replace(/\D/g,''); }
  function trd(s){ return String(s==null?'':s).replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase(); }
  function akkurt(ad){ return /AKKURT/i.test(ad||''); }
  function kimlik(on){ return on+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

  function onayli(){ try{ return !!localStorage.getItem(ONAY); }catch(e){ return false; } }
  function onayla(){ localStorage.setItem(ONAY,new Date().toISOString()); }

  function firmaOku(){
    var raw=localStorage.getItem(FK), o=null; if(raw) o=JSON.parse(raw);
    if(!o||!Array.isArray(o.list)||!o.list.length) throw new Error('Önce eski uygulamayı bu tarayıcıda bir kez açın, sonra bu sayfayı yenileyin.');
    return o;
  }
  function yaz(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ throw new Error('Kaydedilemedi: tarayıcının veri alanı dolu olabilir. Eski uygulamadan yedek alın.'); } }
  function gerekOnay(){ if(!onayli()) throw new Error('Önce yedek aldığınızı onaylayın.'); }
  function firmaDegistir(fn){ gerekOnay(); var o=firmaOku(), r=fn(o); yaz(FK,o); return r; }
  function bul(o,id){ var f=o.list.filter(function(x){ return x.id===id; })[0]; if(!f) throw new Error('Firma bulunamadı.'); if(akkurt(f.name)) throw new Error('Akkurtlar kaydı bu uygulamadan değiştirilmez.'); return f; }
  function ayniAd(o,ad){ var k=duz(ad); return k?o.list.filter(function(f){ return !akkurt(f.name)&&duz(f.name)===k; })[0]||null:null; }

  /* ---- Teksen'e göre otomatik kayıt: eski uygulamadaki kuralın aynısı, yalnız eksikler eklenir ---- */
  function teksendenEkle(o,ad,units){
    var son4=function(x){ return String(x).slice(-4); }, ex=ayniAd(o,ad), n=0;
    if(ex){
      var bilinen={}; Object.keys(ex.sbi||{}).forEach(function(k){ if(ex.sbi[k]&&ex.sbi[k].sgk) bilinen[ex.sbi[k].sgk]=1; }); if(ex.info&&ex.info.sgk) bilinen[ex.info.sgk]=1;
      units.forEach(function(u){
        if(bilinen[u.sgk]) return; var s=u.sube?buyuk(u.sube):'ŞUBE '+son4(u.sgk);
        ex.sbi=ex.sbi||{}; ex.sb=ex.sb||[];
        if(ex.sb.indexOf(s)>=0&&ex.sbi[s]&&ex.sbi[s].sgk&&ex.sbi[s].sgk!==u.sgk) s=s+' ('+son4(u.sgk)+')';
        if(ex.sb.indexOf(s)<0) ex.sb.push(s);
        ex.sbi[s]=Object.assign({},ex.sbi[s]||{}); if(!ex.sbi[s].sgk) ex.sbi[s].sgk=u.sgk; if(!ex.sbi[s].adr) ex.sbi[s].adr=u.adr||'';
        bilinen[u.sgk]=1; n++;
      });
      return n;
    }
    var nf={id:kimlik('i'),name:buyuk(ad)}, sb=[], sbi={};
    units.forEach(function(u){ var s=u.sube?buyuk(u.sube):''; if(s){ if(sb.indexOf(s)>=0) s=s+' ('+son4(u.sgk)+')'; sb.push(s); sbi[s]={sgk:u.sgk,adr:u.adr||''}; } else nf.info={sgk:u.sgk,adr:u.adr||''}; n++; });
    if(sb.length){ nf.sb=sb; nf.sbi=sbi; }
    o.list.push(nf); return n;
  }
  function otomatik(unmatched){
    if(!onayli()||!unmatched.length) return 0;
    var o=firmaOku(), g={}, sira=[], toplam=0;
    unmatched.forEach(function(r){ if(akkurt(r.ad)) return; var k=trd(r.ad).replace(/[^a-z0-9ığüşöç ]/g,' ').replace(/\s+/g,' ').trim(); if(!k) return; if(!g[k]){ g[k]=[]; sira.push(k); } g[k].push(r); });
    sira.forEach(function(k){
      var recs=g[k], ad=bosluk(recs[0].ad), ex=ayniAd(o,ad), dolu={}; if(!ad) return;
      if(ex) (ex.sb||[]).forEach(function(x){ dolu[buyuk(x)]=1; });
      var units=recs.map(function(r){
        var s=bosluk(r.sube); if(s&&trd(s)===trd(r.il)) s=''; if(!s&&(recs.length>1||ex)) s=bosluk(r.adres).slice(0,40)||'ŞUBE';
        if(s){ var t=buyuk(s), a=t, c=1; while(dolu[a]){ c++; a=t+' ('+c+')'; } dolu[a]=1; s=a; }
        return {sube:s,sgk:r.sicil,adr:r.adres||''};
      });
      toplam+=teksendenEkle(o,ad,units);
    });
    if(toplam) yaz(FK,o);
    return toplam;
  }

  /* ---- Elle kayıt ---- */
  function sgkBos(o,sgk,fid,sube){
    var k=rakam(sgk); if(!k) return; if(k.length<5) throw new Error('SGK sicil numarası çok kısa. Tamamını yazın ya da boş bırakın.');
    o.list.forEach(function(f){
      var yerler=[['',f.info&&f.info.sgk]].concat((f.sb||[]).map(function(s){ return [s,f.sbi&&f.sbi[s]&&f.sbi[s].sgk]; }));
      yerler.forEach(function(y){ if(rakam(y[1])===k&&!(f.id===fid&&y[0]===sube)) throw new Error('Bu SGK sicil numarası zaten kayıtlı: '+f.name+(y[0]?' / '+y[0]:'')); });
    });
  }
  function adKontrol(o,ad,kendi){
    if(!ad) throw new Error('Firma adı boş olamaz.');
    if(akkurt(ad)) throw new Error('Akkurtlar kaydı bu uygulamadan eklenmez veya değiştirilmez.');
    var ex=ayniAd(o,ad); if(ex&&ex.id!==kendi) throw new Error('Bu adla bir firma zaten var: '+ex.name);
  }
  function bilgi(eski,v){ var x=Object.assign({},eski||{}); x.sgk=bosluk(v.sgk); x.adr=bosluk(v.adr); return x; }
  function firmaEkle(v){ return firmaDegistir(function(o){ var ad=buyuk(v.ad); adKontrol(o,ad); sgkBos(o,v.sgk); var f={id:kimlik('i'),name:ad,info:bilgi({},v)}; o.list.push(f); return f.id; }); }
  function firmaDuzenle(id,v){ firmaDegistir(function(o){ var f=bul(o,id), ad=buyuk(v.ad); if(ad!==f.name){ adKontrol(o,ad,id); f.name=ad; } sgkBos(o,v.sgk,id,''); f.info=bilgi(f.info,v); }); }
  function subeEkle(id,v){ return firmaDegistir(function(o){
    var f=bul(o,id), s=buyuk(v.ad); if(!s) throw new Error('Şube adı boş olamaz.'); if(s.indexOf('|')>=0) throw new Error('Şube adında “|” işareti kullanılamaz.');
    f.sb=f.sb||[]; f.sbi=f.sbi||{}; if(f.sb.some(function(x){ return duz(x)===duz(s); })) throw new Error('Bu şube zaten var.');
    sgkBos(o,v.sgk); f.sb.push(s); f.sbi[s]=bilgi({},v); return s; }); }
  function subeDuzenle(id,s,v){ firmaDegistir(function(o){ var f=bul(o,id); if(s&&(f.sb||[]).indexOf(s)<0) throw new Error('Şube bulunamadı.'); sgkBos(o,v.sgk,id,s); if(s){ f.sbi=f.sbi||{}; f.sbi[s]=bilgi(f.sbi[s],v); } else f.info=bilgi(f.info,v); }); }

  /* pid verilirse o kişi düzenlenir; diğer alanları (TC, eğitimler vb.) aynen korunur */
  function kisiYaz(fid,sube,pid,v){
    gerekOnay(); var f=bul(firmaOku(),fid); if(sube&&(f.sb||[]).indexOf(sube)<0&&!v.teksenSubesi) throw new Error('Şube bulunamadı.');
    var raw=localStorage.getItem(PK), a=raw?JSON.parse(raw):{}, key=fid+'|'+(sube||''), L=a[key]||[], ad=buyuk(v.ad);
    if(!ad) throw new Error('Ad soyad boş olamaz.');
    if(L.some(function(x){ return x.id!==pid&&buyuk(x.ad)===ad; })) throw new Error('Bu şubede aynı adla bir kişi zaten kayıtlı.');
    if(pid){ var k=L.filter(function(x){ return x.id===pid; })[0]; if(!k) throw new Error('Kişi bulunamadı.'); k.ad=ad; k.gorev=buyuk(v.gorev); k.giris=v.giris||''; }
    else L.push({id:kimlik('p'),ad:ad,tc:'',gorev:buyuk(v.gorev),giris:v.giris||''});
    a[key]=L; yaz(PK,a);
  }
  return {onayli:onayli,onayla:onayla,otomatik:otomatik,firmaEkle:firmaEkle,firmaDuzenle:firmaDuzenle,subeEkle:subeEkle,subeDuzenle:subeDuzenle,kisiYaz:kisiYaz,akkurt:akkurt};
})();

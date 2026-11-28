/* Kayıt yazma. Her işlem önce güncel veriyi yeniden okur, sonra yazar.
   Silme işlemleri (kişi; Teksen kaydı bağlı olmayan firma ve şube) geri alınabilir; geri alınabilir kopya kaydedilmeden silinmez. Akkurtlar firmasına yazılmaz. */
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

  /* TC isteğe bağlıdır. Boşsa boş döner; yazıldıysa 11 haneli olmalı */
  function tcDenetle(x,ad){
    var s=String(x==null?'':x).replace(/[\s-]/g,''); if(s&&!/^[1-9]\d{10}$/.test(s)) throw new Error((ad?ad+': ':'')+'TC kimlik no 11 rakam olmalı ve 0 ile başlamamalı.'); return s;
  }
  /* pid verilirse o kişi düzenlenir; diğer alanları (eğitimler vb.) aynen korunur. TC yalnız v.tc doluysa yazılır, yalnız v.tcSil ile silinir */
  function kisiYaz(fid,sube,pid,v){
    gerekOnay(); var f=bul(firmaOku(),fid); if(sube&&(f.sb||[]).indexOf(sube)<0&&!v.teksenSubesi) throw new Error('Şube bulunamadı.');
    var raw=localStorage.getItem(PK), a=raw?JSON.parse(raw):{}, key=fid+'|'+(sube||''), L=a[key]||[], ad=buyuk(v.ad);
    if(!ad) throw new Error('Ad soyad boş olamaz.');
    var tc=tcDenetle(v.tc);
    if(L.some(function(x){ return x.id!==pid&&buyuk(x.ad)===ad; })) throw new Error('Bu şubede aynı adla bir kişi zaten kayıtlı.');
    if(pid){ var k=L.filter(function(x){ return x.id===pid; })[0]; if(!k) throw new Error('Kişi bulunamadı.'); k.ad=ad; k.gorev=buyuk(v.gorev); k.giris=v.giris||''; if(v.tcSil) k.tc=''; else if(tc) k.tc=tc; }
    else L.push({id:kimlik('p'),ad:ad,tc:tc,gorev:buyuk(v.gorev),giris:v.giris||''});
    a[key]=L; yaz(PK,a);
  }
  /* ---- Personel: toplu işlemler, eğitim, silme / geri alma ---- */
  function kisiler(){ var raw=localStorage.getItem(PK); return raw?JSON.parse(raw):{}; }
  /* O firmaya yazılabilir mi? (kayıt onayı var, firma duruyor, Akkurtlar değil) */
  function yazilacak(fid){ gerekOnay(); return bul(firmaOku(),fid); }

  /* Hepsi tek seferde yazılır; aynı adlı kişiler atlanır */
  function topluEkle(fid,sube,satirlar){
    yazilacak(fid); var a=kisiler(), key=fid+'|'+(sube||''), L=a[key]||[], var_={}, n=0, atlanan=0;
    L.forEach(function(x){ var_[buyuk(x.ad)]=1; });
    satirlar.forEach(function(s){ var ad=buyuk(s.ad); if(!ad||var_[ad]){ atlanan++; return; } var tc=tcDenetle(s.tc,ad); var_[ad]=1; L.push({id:kimlik('p')+n,ad:ad,tc:tc,gorev:buyuk(s.gorev),giris:s.giris||''}); n++; });
    if(n){ a[key]=L; yaz(PK,a); }
    return {eklenen:n,atlanan:atlanan};
  }
  /* Eğitim kaydı yalnız eklenir; aynı tarih ve konu varsa ikinci kez yazılmaz. Kayıt biçimi eski uygulamayla aynıdır. */
  function egitimEkle(fid,sube,idler,v){
    yazilacak(fid); var t=v.t||''; if(!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error('Eğitim tarihini seçin.');
    if(t>window.Hesap.today()) throw new Error('Eğitim tarihi ileri bir tarih olamaz.');
    var konu=bosluk(v.konu)||'TEMEL İSG EĞİTİMİ', sec={}; idler.forEach(function(i){ sec[i]=1; }); if(!idler.length) throw new Error('En az bir kişi seçin.');
    var a=kisiler(), L=a[fid+'|'+(sube||'')]||[], n=0, vardi=0;
    L.forEach(function(x,i){ if(!sec[x.id]) return; var g=x.egt||[]; if(g.some(function(y){ return y&&y.t===t&&duz(y.konu)===duz(konu); })){ vardi++; return; } x.egt=g.concat([{id:kimlik('g')+i,t:t,konu:konu,sure:bosluk(v.sure),kay:'Elle'}]); n++; });
    if(n) yaz(PK,a);
    return {eklenen:n,vardi:vardi};
  }

  /* Silinenler alanı eski uygulamayla ortaktır (kerem-trash, 30 gün) */
  function cop(mod,fn){
    return new Promise(function(ok,no){
      var r=indexedDB.open('kerem-trash',1);
      r.onupgradeneeded=function(){ r.result.createObjectStore('items',{keyPath:'id'}); };
      r.onerror=function(){ no(r.error); };
      r.onsuccess=function(){ var d=r.result, t, q; d.onversionchange=function(){ d.close(); };
        try{ t=d.transaction('items',mod); q=fn(t.objectStore('items')); }catch(e){ d.close(); no(e); return; }
        t.oncomplete=function(){ d.close(); ok(q&&q.result); }; t.onabort=function(){ d.close(); no(t.error||new Error('Silinenler alanına yazılamadı.')); };
      };
    });
  }
  async function kisiSil(fid,sube,pid,baslik){
    yazilacak(fid); var key=fid+'|'+(sube||''), x=(kisiler()[key]||[]).filter(function(y){ return y.id===pid; })[0]; if(!x) throw new Error('Kişi bulunamadı.');
    var id='t'+Date.now()+Math.random().toString(36).slice(2,6);
    try{ await cop('readwrite',function(s){ return s.put({id:id,type:'kisi',title:'Personel: '+x.ad+' · '+baslik,t:Date.now(),data:{fid:fid,sb:sube||'',list:[x]}}); }); }
    catch(e){ throw new Error('Geri alınabilir kopya kaydedilemediği için kişi silinmedi.'); }
    var a=kisiler(); a[key]=(a[key]||[]).filter(function(y){ return y.id!==pid; });
    try{ yaz(PK,a); }catch(e){ try{ await cop('readwrite',function(s){ return s.delete(id); }); }catch(z){} throw e; }
    return id;
  }
  async function silinenler(){ var a=await cop('readonly',function(s){ return s.getAll(); }), sinir=Date.now()-30*864e5; return (a||[]).filter(function(x){ return x.type==='kisi'&&x.t>=sinir; }).sort(function(p,q){ return q.t-p.t; }); }
  async function geriAl(id){
    var it=(await silinenler()).filter(function(x){ return x.id===id; })[0]; if(!it) throw new Error('Kayıt bulunamadı.');
    var d=it.data; yazilacak(d.fid);
    var a=kisiler(), key=d.fid+'|'+(d.sb||''), L=a[key]||[], var_={}; L.forEach(function(x){ var_[x.id]=1; });
    d.list.forEach(function(x){ if(!var_[x.id]) L.push(x); }); a[key]=L; yaz(PK,a);
    await cop('readwrite',function(s){ return s.delete(id); });
  }
  /* ---- Firma / şube: pasife alma, arşivleme, silme. Alan adları ve silinen kayıt biçimi eski uygulamayla aynıdır ---- */
  function aktifSec(o,f){ if(o.cur!==f.id) return; var n=o.list.filter(function(x){ return x!==f&&x.name&&!x.pasif; })[0]; if(n) o.cur=n.id; }
  function firmaDurum(id,k){ firmaDegistir(function(o){ var f=bul(o,id);
    if(k==='aktif'){ delete f.pasif; delete f.arsiv; return; }
    if(k!=='pasif'&&k!=='arsiv') throw new Error('Bilinmeyen işlem.');
    f.pasif=true; if(k==='arsiv') f.arsiv=true; else delete f.arsiv; aktifSec(o,f); }); }
  function subeVar(f,s){ if(!s||(f.sb||[]).indexOf(s)<0) throw new Error('Şube bulunamadı.'); }
  function subeDurum(id,s,pasif){ firmaDegistir(function(o){ var f=bul(o,id); subeVar(f,s); f.sbp=f.sbp||{}; if(pasif) f.sbp[s]=1; else delete f.sbp[s]; }); }

  /* Firmaya (sube===null) ya da şubeye bağlı Teksen kaydı sayısı. Şüpheli her bağ sayılır: ekrandaki bağ, SGK no, elle kurulan bağ */
  function teksenBagi(F,sube,v){
    var no={}, elle={};
    function ekle(s){ var k=rakam(s); if(k.length>=5) no[k]=1; }
    if(sube===null){ ekle(F.info&&F.info.sgk); Object.keys(F.sbi||{}).forEach(function(n){ ekle(F.sbi[n]&&F.sbi[n].sgk); }); }
    else ekle(F.sbi&&F.sbi[sube]&&F.sbi[sube].sgk);
    v.data.meta.forEach(function(m){ if(m&&String(m.k).indexOf('link:')===0&&m.fid===F.id&&(sube===null||(m.sube||'')===sube)) elle[m.sicil]=1; });
    return v.data.f.filter(function(r){ var l=v.lk.byRec[r.sicil]; return (l&&l.fid===F.id&&(sube===null||l.sube===sube))||!!no[rakam(r.sicil)]||!!elle[r.sicil]; }).length;
  }
  function copId(){ return 't'+Date.now()+Math.random().toString(36).slice(2,6); }
  /* Sıra: güncel veriyi oku → bağ kontrolü → geri alınabilir kopyayı kaydet → sil */
  async function yerSil(fid,sube){
    gerekOnay();
    var v=await window.Veri.oku(); if(v.hata.length) throw new Error('Veriler tam okunamadığı için silinmedi. '+v.hata.join(' '));
    var o=firmaOku(), f=bul(o,fid); if(sube!==null) subeVar(f,sube); else if(o.list.length<2) throw new Error('Listedeki tek firma silinemez.');
    if(teksenBagi(f,sube,v)) throw new Error('Bu kayda Teksen verisi bağlı olduğu için silinemez. Pasife alabilirsiniz.');
    var once=JSON.stringify(f), id=copId(), it={id:id,t:Date.now()};
    if(sube===null){ it.type='firm'; it.title='Firma: '+f.name; it.data={f:JSON.parse(once),ix:o.list.indexOf(f)}; }
    else { it.type='sube'; it.title='Şube: '+f.name+' / '+sube; it.data={fid:fid,name:sube,ix:f.sb.indexOf(sube),info:(f.sbi||{})[sube]||null,pas:!!(f.sbp&&f.sbp[sube])}; }
    try{ await cop('readwrite',function(s){ return s.put(it); }); }
    catch(e){ throw new Error('Geri alınabilir kopya kaydedilemediği için silinmedi.'); }
    try{
      firmaDegistir(function(o){
        var f=bul(o,fid); if(JSON.stringify(f)!==once) throw new Error('Kayıt bu sırada değişti, silinmedi. Yeniden deneyin.');
        if(sube===null){ o.list=o.list.filter(function(x){ return x!==f; }); if(o.cur===fid) o.cur=o.list[0].id; }
        else { f.sb=f.sb.filter(function(x){ return x!==sube; }); if(f.sbi) delete f.sbi[sube]; if(f.sbp) delete f.sbp[sube]; }
      });
    }catch(e){ try{ await cop('readwrite',function(s){ return s.delete(id); }); }catch(z){} throw e; }
    return id;
  }
  async function silinenYerler(){ var a=await cop('readonly',function(s){ return s.getAll(); }), sinir=Date.now()-30*864e5; return (a||[]).filter(function(x){ return (x.type==='firm'||x.type==='sube')&&x.t>=sinir; }).sort(function(p,q){ return q.t-p.t; }); }
  async function yerGeriAl(id){
    var it=(await silinenYerler()).filter(function(x){ return x.id===id; })[0]; if(!it) throw new Error('Kayıt bulunamadı.');
    var d=it.data;
    firmaDegistir(function(o){
      if(it.type==='firm'){
        if(akkurt(d.f.name)) throw new Error('Akkurtlar kaydı bu uygulamadan değiştirilmez.');
        if(o.list.some(function(x){ return x.id===d.f.id; })) throw new Error('Bu firma zaten listede.');
        adKontrol(o,d.f.name,d.f.id);
        sgkBos(o,d.f.info&&d.f.info.sgk); Object.keys(d.f.sbi||{}).forEach(function(n){ sgkBos(o,d.f.sbi[n]&&d.f.sbi[n].sgk); });
        o.list.splice(Math.max(0,Math.min(d.ix,o.list.length)),0,d.f); return;
      }
      if(!o.list.some(function(x){ return x.id===d.fid; })) throw new Error('Firma artık yok; önce firmayı geri alın.');
      var f=bul(o,d.fid); f.sb=f.sb||[]; f.sbi=f.sbi||{};
      if(f.sb.some(function(x){ return duz(x)===duz(d.name); })) throw new Error('Bu adla bir şube zaten var; eski kayıt üzerine yazılmadı.');
      sgkBos(o,d.info&&d.info.sgk);
      f.sb.splice(Math.max(0,Math.min(d.ix,f.sb.length)),0,d.name); if(d.info) f.sbi[d.name]=d.info; if(d.pas){ f.sbp=f.sbp||{}; f.sbp[d.name]=1; }
    });
    await cop('readwrite',function(s){ return s.delete(id); });
  }
  return {firmaDurum:firmaDurum,subeDurum:subeDurum,teksenBagi:teksenBagi,yerSil:yerSil,silinenYerler:silinenYerler,yerGeriAl:yerGeriAl,topluEkle:topluEkle,egitimEkle:egitimEkle,kisiSil:kisiSil,silinenler:silinenler,geriAl:geriAl,onayli:onayli,onayla:onayla,otomatik:otomatik,firmaEkle:firmaEkle,firmaDuzenle:firmaDuzenle,subeEkle:subeEkle,subeDuzenle:subeDuzenle,kisiYaz:kisiYaz,akkurt:akkurt};
})();

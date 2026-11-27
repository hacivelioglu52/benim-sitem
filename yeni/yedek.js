/* Yedek alma / geri yükleme. Dosya biçimi eski uygulamanın yedeğiyle aynıdır (iki yönlü kullanılır).
   Eski uygulamadaki BK listesine yeni bir anahtar eklenirse buraya da eklenmelidir. */
window.Yedek=(function(){
  var BK=[['firms','isg-firms-v1'],['logo','isg-logo-v1'],['stamps','isg-kase-v2'],['risk','risk-olusturucu-v1'],['cert','cert-olusturucu-v1'],['log','isg-log-v1'],['ctr','isg-ctr-v2'],['qcustom','isg-qcustom-v1'],['defs','isg-defs-v1'],
    ['edp','isg-edp-v1','raw'],['evrak','isg-evrak-v1','raw'],['evrakp','isg-evrakp-v1','raw'],['evrakps','isg-evrakp-set-v1','raw'],['plan','isg-plan-v2','raw'],['hz','isg-hz-v1','raw'],['osgbfo','osgb-folders','raw'],['osgbfm','osgb-forms','raw']];
  var TAKIP={ad:'teksen-takip',tablo:{firms:'sicil',hizmet:'id',uyg:'id',docs:'sicil',meta:'k'}}, OSGB={ad:'teksen-osgb',tablo:{files:'id'}};

  /* Okuma: veri deposu yoksa oluşturulmaz */
  function oku(db){
    var adlar=Object.keys(db.tablo);
    return new Promise(function(ok,no){
      var r=indexedDB.open(db.ad), yok=false;
      r.onupgradeneeded=function(){ yok=true; r.transaction.abort(); };
      r.onerror=function(e){ if(yok){ e.preventDefault(); ok(null); } else no(r.error); };
      r.onsuccess=function(){
        var d=r.result; d.onversionchange=function(){ d.close(); };
        if(!adlar.every(function(n){ return d.objectStoreNames.contains(n); })){ d.close(); ok(null); return; }
        var tx=d.transaction(adlar,'readonly'), q=adlar.map(function(n){ return tx.objectStore(n).getAll(); });
        tx.oncomplete=function(){ d.close(); var o={}; adlar.forEach(function(n,i){ o[n]=q[i].result; }); ok(o); };
        tx.onabort=function(){ d.close(); no(tx.error); };
      };
    });
  }
  /* Yazma: depo yoksa eski uygulamadaki yapının aynısıyla kurulur. Tek işlemde yapılır: ya tamamı yazılır ya hiçbiri. */
  function yazDb(db,veri,temizle){
    var adlar=Object.keys(db.tablo);
    return new Promise(function(ok,no){
      var r=indexedDB.open(db.ad,1);
      r.onupgradeneeded=function(){ adlar.forEach(function(n){ if(!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n,{keyPath:db.tablo[n]}); }); };
      r.onerror=function(){ no(r.error); };
      r.onsuccess=function(){
        var d=r.result, tx; d.onversionchange=function(){ d.close(); };
        try{
          tx=d.transaction(adlar,'readwrite');
          tx.oncomplete=function(){ d.close(); ok(); };
          tx.onabort=function(){ d.close(); no(tx.error||new Error('Yazma iptal edildi')); };
          adlar.forEach(function(n){ var s=tx.objectStore(n); if(temizle) s.clear(); (veri[n]||[]).forEach(function(x){ s.put(x); }); });
        }catch(e){ try{ tx.abort(); }catch(x){} d.close(); no(e); }
      };
    });
  }

  function b64(blob){ return new Promise(function(ok,no){ var fr=new FileReader(); fr.onload=function(){ var s=String(fr.result||''); ok(s.slice(s.indexOf(',')+1)); }; fr.onerror=function(){ no(fr.error); }; fr.readAsDataURL(blob); }); }
  function blobYap(s,tur){ var t=atob(s), u=new Uint8Array(t.length); for(var i=0;i<t.length;i++) u[i]=t.charCodeAt(i); return new Blob([u],{type:tur||'application/octet-stream'}); }

  /* Bir bölüm bile okunamazsa hata verir: eksik yedek "tamam" gibi görünmesin */
  async function hazirla(){
    var o={app:'kerem-sertifika',v:1,date:new Date().toISOString(),data:{}};
    BK.forEach(function(k){ var rw=localStorage.getItem(k[1]); if(!rw) return; if(k[2]==='raw'){ o.data[k[0]]=rw; return; }
      var v; try{ v=JSON.parse(rw); }catch(e){ throw new Error('“'+k[1]+'” kaydı okunamadığı için yedek hazırlanamadı.'); } if(v!=null) o.data[k[0]]=v; });
    var f=await oku(OSGB);
    if(f&&f.files.length) o.osgbfiles=await Promise.all(f.files.map(async function(x){ return {id:x.id,folder:x.folder,name:x.name,type:x.type,size:x.size,date:x.date,b:await b64(x.blob)}; }));
    var t=await oku(TAKIP); if(t&&t.firms.length) o.takip=t;
    return o;
  }
  async function indir(){
    var o=await hazirla(); if(!Object.keys(o.data).length&&!o.takip&&!o.osgbfiles) throw new Error('Bu tarayıcıda yedeklenecek kayıt yok.');
    var d=new Date(), p=function(n){ return (n<10?'0':'')+n; }, ad='kerem-sertifika-yedek-'+d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes())+'.json';
    var u=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'})), a=document.createElement('a'); a.href=u; a.download=ad; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },60000);
    try{ localStorage.setItem('isg-lastbk',String(Date.now())); }catch(e){}
    return {ad:ad,ozet:ozet(o)};
  }

  function ozet(o){
    var s=[], fm=o.data.firms, p=0;
    if(fm&&fm.list) s.push(fm.list.length+' firma');
    if(o.data.evrakp){ try{ var P=JSON.parse(o.data.evrakp); Object.keys(P).forEach(function(k){ p+=(P[k]||[]).length; }); s.push(p+' kişi'); }catch(e){} }
    if(o.takip) s.push(o.takip.firms.length+' Teksen kaydı');
    if(o.osgbfiles) s.push(o.osgbfiles.length+' OSGB dosyası');
    return s.join(', ')||'diğer ayarlar';
  }

  /* Dosyayı hiçbir şey yazmadan önce baştan sona denetler */
  function coz(metin){
    var o; try{ o=JSON.parse(metin); }catch(e){ throw new Error('Dosya okunamadı: bozuk ya da yarım olabilir.'); }
    var nesne=function(x){ return x&&typeof x==='object'&&!Array.isArray(x); };
    if(!o||o.app!=='kerem-sertifika'||!nesne(o.data)) throw new Error('Bu bir Kerem Sertifika yedek dosyası değil.');
    if(!BK.some(function(k){ return o.data[k[0]]!=null; })) throw new Error('Yedek dosyası boş.');
    var bozuk=function(){ throw new Error('Yedek dosyasının bir bölümü bozuk. Hiçbir şey değiştirilmedi.'); };
    var fm=o.data.firms; if(fm!=null&&!(nesne(fm)&&Array.isArray(fm.list)&&fm.list.length&&fm.list.every(function(f){ return nesne(f)&&f.id; }))) bozuk();
    BK.forEach(function(k){ var v=o.data[k[0]]; if(v!=null&&k[2]==='raw'&&typeof v!=='string') bozuk(); });
    if(o.data.evrakp!=null){ var P; try{ P=JSON.parse(o.data.evrakp); }catch(e){ bozuk(); } if(!nesne(P)) bozuk(); }
    if(o.takip!=null){ if(!nesne(o.takip)) bozuk(); Object.keys(TAKIP.tablo).forEach(function(n){ var a=o.takip[n]; if(!Array.isArray(a)||!a.every(function(x){ return nesne(x)&&x[TAKIP.tablo[n]]!=null; })) bozuk(); }); }
    if(o.osgbfiles!=null){ if(!Array.isArray(o.osgbfiles)) bozuk(); o.osgbfiles.forEach(function(x){ if(!x||!x.id||typeof x.b!=='string') bozuk(); try{ atob(x.b); }catch(e){ bozuk(); } }); }
    return o;
  }

  /* Eski uygulamadaki kural: yedekte bulunan bölümler değiştirilir, bulunmayanlar olduğu gibi kalır.
     Herhangi bir adım başarısız olursa önceki veriler geri konur. */
  async function geriYukle(o){
    var onceki={}, oncekiTakip=await oku(TAKIP), takipYazildi=false;
    var isler=BK.filter(function(k){ return o.data[k[0]]!=null; }).map(function(k){ return [k[1], k[2]==='raw'?o.data[k[0]]:JSON.stringify(o.data[k[0]])]; });
    isler.forEach(function(i){ onceki[i[0]]=localStorage.getItem(i[0]); });
    function geriAl(){
      /* önce yeni yazılanlar kaldırılır ki eskilere yer açılsın */
      Object.keys(onceki).forEach(function(k){ localStorage.removeItem(k); });
      Object.keys(onceki).forEach(function(k){ if(onceki[k]!=null) localStorage.setItem(k,onceki[k]); });
    }
    try{
      isler.forEach(function(i){ localStorage.setItem(i[0],i[1]); });
      if(o.takip){ await yazDb(TAKIP,o.takip,true); takipYazildi=true; }
      if(o.osgbfiles&&o.osgbfiles.length) await yazDb(OSGB,{files:o.osgbfiles.map(function(x){ return {id:x.id,folder:x.folder,name:x.name,type:x.type,size:x.size,date:x.date,blob:blobYap(x.b,x.type)}; })},false);
    }catch(e){
      var tam=true;
      try{ geriAl(); }catch(x){ tam=false; }
      if(takipYazildi){ try{ await yazDb(TAKIP,oncekiTakip||{},true); }catch(x){ tam=false; } }
      throw new Error('Geri yükleme yapılamadı (tarayıcının veri alanı dolu olabilir). '+(tam?'Önceki verileriniz yerinde.':'Önceki veriler tam olarak geri konamadı: az önce indirdiğiniz yedeği saklayın.'));
    }
  }
  return {indir:indir,hazirla:hazirla,coz:coz,ozet:ozet,geriYukle:geriYukle,anahtarlar:BK};
})();

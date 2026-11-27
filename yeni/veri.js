/* Veri okuma (yazma işlemleri kayit.js içindedir). Bu dosya hiçbir kaydı YAZMAZ, DEĞİŞTİRMEZ, SİLMEZ. */
window.Veri=(function(){
  function json(k){ var raw=localStorage.getItem(k); if(!raw) return null; return JSON.parse(raw); }
  function dolu(v){ return !!(v&&String(v).trim()); }
  /* Eski uygulamadaki "boş firma" kuralı */
  function bosFirma(f){ return !f.name && !dolu(f.grp) && !dolu(f.gorev) && !(f.gv&&f.gv.length) && !(f.sabl&&f.sabl.length) && !(f.sb&&f.sb.length) && !(f.ek&&f.ek.length) && !(f.logos&&((f.logos.firma&&f.logos.firma.data)||(f.logos.kurum&&f.logos.kurum.data))) && !JSON.stringify(f.info||{}).replace(/[{}\":,]/g,'').trim(); }

  /* Sürüm numarası vermeden açılır. Veri deposu yoksa oluşturulması iptal edilir:
     boş bir depo oluşursa eski uygulama kendi tablolarını bir daha kuramaz. */
  function teksen(){
    var bos={f:[],h:[],u:[],d:[],meta:[]};
    return new Promise(function(ok,no){
      var r=indexedDB.open('teksen-takip'), yok=false;
      r.onupgradeneeded=function(){ yok=true; r.transaction.abort(); };
      r.onerror=function(e){ if(yok){ e.preventDefault(); ok(bos); } else no(r.error); };
      r.onsuccess=function(){
        var db=r.result; db.onversionchange=function(){ db.close(); };
        var adlar=['firms','hizmet','uyg','docs','meta'];
        if(!adlar.every(function(n){ return db.objectStoreNames.contains(n); })){ db.close(); ok(bos); return; }
        var tx=db.transaction(adlar,'readonly'), q=adlar.map(function(n){ return tx.objectStore(n).getAll(); });
        tx.oncomplete=function(){ db.close(); ok({f:q[0].result,h:q[1].result,u:q[2].result,d:q[3].result,meta:q[4].result}); };
        tx.onabort=tx.onerror=function(){ db.close(); no(tx.error); };
      };
    });
  }

  /* Teksen kayıtlarını firma/şubeye bağlar: önce elle kurulan bağ, yoksa SGK sicil no */
  function baglantilar(firmalar,data){
    var LK={byRec:{},byUnit:{},unmatched:[]}, idx={}, elle={}, byId={};
    function sn(x){ return String(x==null?'':x).replace(/\D/g,''); }
    firmalar.forEach(function(F){ byId[F.id]=F; var a=sn(F.info&&F.info.sgk); if(a.length>=5&&!idx[a]) idx[a]={fid:F.id,sube:''};
      (F.sb||[]).forEach(function(n){ var b=sn(F.sbi&&F.sbi[n]&&F.sbi[n].sgk); if(b.length>=5&&!idx[b]) idx[b]={fid:F.id,sube:n}; }); });
    data.meta.forEach(function(m){ if(m&&String(m.k).indexOf('link:')===0) elle[m.sicil]={fid:m.fid,sube:m.sube||''}; });
    data.f.forEach(function(r){
      var m=elle[r.sicil]; if(m&&!byId[m.fid]) m=null;
      if(!m){ var k=sn(r.sicil); if(k&&idx[k]) m=idx[k]; }
      /* Akkurtlar adlı Teksen kayıtları yalnız ekranda Akkurtlar firmasının altında gösterilir; hiçbir şey yazılmaz */
      if(!m&&/AKKURT/i.test(r.ad||'')){ var ak=firmalar.filter(function(F){ return /AKKURT/i.test(F.name||''); })[0]; if(ak) m={fid:ak.id,sube:''}; }
      if(!m){ LK.unmatched.push(r); return; }
      var key=m.fid+'|'+(m.sube||''); LK.byRec[r.sicil]={fid:m.fid,sube:m.sube||''}; (LK.byUnit[key]||(LK.byUnit[key]=[])).push(r);
    });
    return LK;
  }

  function oku(){
    var hata=[], FM=null, P={};
    try{ FM=json('isg-firms-v1'); }catch(e){ hata.push('Firma listesi okunamadı.'); }
    try{ P=json('isg-evrakp-v1')||{}; }catch(e){ hata.push('Personel listesi okunamadı.'); }
    var firmalar=((FM&&Array.isArray(FM.list))?FM.list:[]).filter(function(f){ return f&&!bosFirma(f)&&!f.draft; });
    return teksen().catch(function(){ hata.push('Teksen verisi okunamadı.'); return {f:[],h:[],u:[],d:[],meta:[]}; }).then(function(data){
      return {firmalar:firmalar, kisiler:P, data:data, lk:baglantilar(firmalar,data), hata:hata};
    });
  }
  return {oku:oku};
})();

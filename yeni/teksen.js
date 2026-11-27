/* Teksen verisi alma.
   "KOPYA" işaretleri arasındaki bölüm eski uygulamadan (index.html v235, Takip merkezi) harfi harfine kopyalanmıştır;
   eskide bir kural değişirse burada da değişmeli.
   Yeni uygulamanın eki: seçmeli alma (veri türü, belge türü, firma/şube, dönem) ve Akkurtlar'a ait Teksen kayıtları bu uygulamadan hiç yazılmaz. Alma işlemi hiçbir kaydı silmez. */
window.Teksen=(function(){
    /* ---- KOPYA başı ---- */
    function today(){ return new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10); }
    function nSic(s){ return String(s==null?'':s).replace(/\s+/g,''); }
    function trd(s){ return String(s==null?'':s).replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase(); }

    /* Yer imi çıktısını oku: tsg:2 (tek firma) veya tsg:3 (tüm firmalar) */
    function parse(text){
      text=String(text||'').trim(); if(!text) throw new Error('Metin boş. Yer iminin panoya kopyaladığı metni yapıştırın.');
      var i=text.indexOf('{'), j=text.lastIndexOf('}');
      if(i<0||j<i) throw new Error('Bu bir Teksen yer imi çıktısına benzemiyor ({ ... } bulunamadı).');
      var o; try{ o=JSON.parse(text.slice(i,j+1)); }catch(e){ throw new Error('Metin okunamadı: yarım kopyalanmış veya bozulmuş olabilir. Yer imini yeniden çalıştırın.'); }
      if(o&&o.tsg===2&&o.firma) return {mod:2, liste:null, firmalar:[o], hatali:[]};
      if(o&&o.tsg===3&&Array.isArray(o.firmalar)) return {mod:3, liste:Array.isArray(o.liste)?o.liste:[], firmalar:o.firmalar, hatali:Array.isArray(o.hatali)?o.hatali:[]};
      throw new Error('Bu bir Teksen yer imi çıktısı değil (tsg:2 veya tsg:3 bulunamadı).');
    }
    /* "AYDA 1", "3 AYDA 1", "HAFTADA 1", "YILDA 1", "AYDA 2" -> yaklaşık gün */
    function periyot(s){
      var t=trd(s).replace(/\s+/g,' ').trim(), m=t.match(/^(?:(\d+)\s+)?(ayda|haftada|yılda)\s+(\d+)$/);
      if(!m) return null;
      var k=+(m[1]||1), n=+m[3]||1, b=m[2]==='ayda'?30:(m[2]==='haftada'?7:365);
      return Math.round(b*k/n);
    }
    function listeSatirlari(liste){
      var map={}; if(!liste||!liste.length) return map;
      var h=liste[0]||[], idx={};
      function col(key,def){ for(var i=0;i<h.length;i++){ if(trd(h[i]).indexOf(key)>=0) return i; } return def; }
      idx.sube=col('şube',0); idx.il=col('ili',1); idx.sgk=col('sgk',6); idx.irt=col('irtibat',7); idx.per=col('periyot',9); idx.sure=col('süresi',10);
      liste.slice(1).forEach(function(r){ if(!r||!r.length) return; var s=nSic(r[idx.sgk]); if(s) map[s]={sube:r[idx.sube]||'',il:r[idx.il]||'',irt:r[idx.irt]||'',per:r[idx.per]||'',sure:r[idx.sure]||''}; });
      return map;
    }
    function ustate(u){ if(String(u.silindi)==='1') return 'silindi'; return u.kapatilma_tarihi?'kapali':'acik'; }

    /* Saf hesap: ne yazılacak ve rapor ne olacak (veritabanına dokunmaz) */
    function plan(P, opt, ex, bugun){
      var fM={}, hM={}, uM={};
      ex.firms.forEach(function(x){ fM[x.sicil]=x; }); ex.hizmet.forEach(function(x){ hM[x.id]=x; }); ex.uyg.forEach(function(x){ uM[x.id]=x; });
      var rows=listeSatirlari(P.liste);
      var W={firms:[],hizmet:[],uyg:[],docs:[],meta:[]};
      var R={mod:P.mod, ilk:ex.firms.length===0, firmaIslendi:0, firmaYeni:0, firmaGuncel:0, listeEsles:0, listeEslesmeyen:0, sicilsiz:0, hatali:(P.hatali||[]).length,
             hizmetYeni:0, hizmetDegisen:0, uygYeni:0, uygKapanan:0, uygYenidenAcilan:0, uygGorunmeyen:0, acik:0, gecikmis:0, degisim:[]};
      P.firmalar.forEach(function(e){
        var f=(e&&e.firma)||{}, sic=nSic(f.sgksicil);
        if(!sic){ R.sicilsiz++; return; }
        var old=fM[sic]; R.firmaIslendi++; if(old) R.firmaGuncel++; else R.firmaYeni++;
        var rec=Object.assign({},old||{},{sicil:sic, ad:f.firmaadi||'', adres:f.adres||'', tehlike:f.tehlike||'', calisan:parseInt(f.calisan,10)||0, sure:parseInt(f.sure,10)||0, guncelleme:bugun});
        var row=rows[sic];
        if(row){ R.listeEsles++; rec.sube=row.sube; rec.il=row.il; rec.periyot=row.per; rec.periyotGun=periyot(row.per); if(row.sure&&!rec.sure) rec.sure=parseInt(row.sure,10)||0; if(opt.irtibat) rec.irtibat=row.irt; }
        else if(P.liste&&P.liste.length) R.listeEslesmeyen++;
        if(opt.irtibat){ rec.yetkili=f.firmayetkili||''; rec.yetkiliMail=f.firmayetkilimail||''; rec.yetkiliTel=f.firmayetkilitel||''; }
        var dg=[]; if(!R.ilk){ if(!old) dg.push('yeni firma/şube'); else [['ad','ad'],['adres','adres'],['tehlike','tehlike sınıfı'],['calisan','çalışan sayısı'],['sure','süre'],['sube','şube'],['il','il'],['periyot','periyot']].forEach(function(k){ var a=old[k[0]]==null?'':String(old[k[0]]), b=rec[k[0]]==null?'':String(rec[k[0]]); if((k[0]==='sure'||k[0]==='calisan')&&(a===''||a==='0')&&(b===''||b==='0')) return; if(a!==b) dg.push(k[1]+': '+(a||'—')+' → '+(b||'—')); }); }
        fM[sic]=rec; W.firms.push(rec);
        var hids={};
        (Array.isArray(e.hizmetler)?e.hizmetler:[]).forEach(function(h){
          if(!h||h.id==null) return; var id=String(h.id); hids[id]=1;
          var v=Object.assign({},h); if(!opt.irtibat) delete v.kazazede_telefon;
          var o=hM[id]; if(!o) R.hizmetYeni++; else if(String((o.veri||{}).guncelleme_tarihi||'')!==String(v.guncelleme_tarihi||'')) R.hizmetDegisen++;
          if(!R.ilk){ if(!o){ dg.push('yeni hizmet kaydı'+(v.hizmet_tarihi?' ('+v.hizmet_tarihi+')':'')); } else { ['egitim_tarih','egitimi_tamam_personel','egitimi_eksik_personel','gerekli_ilkyardimci','gerekli_destek_elemani','gerekli_calisan_temsilcisi','gerekli_yanginci','gerekli_arama_kurtarma','tatbikat_yapildi','tatbikat_yapilma_tarih'].forEach(function(k){ var a=(o.veri||{})[k], b=v[k]; a=a==null?'':String(a); b=b==null?'':String(b); if(a!==b) dg.push('hizmet '+(v.hizmet_tarihi||'')+' '+k.replace(/_/g,' ')+': '+(a||'—')+' → '+(b||'—')); }); } }
          var r={id:id, sicil:sic, tarih:v.hizmet_tarihi||'', veri:v}; hM[id]=r; W.hizmet.push(r);
        });
        var seen={}, uy=e.uyg||{};
        Object.keys(uy).forEach(function(hid){
          (Array.isArray(uy[hid])?uy[hid]:[]).forEach(function(u){
            if(!u||u.id==null) return; var id=String(u.id), o=uM[id], st=ustate(u); seen[id]=1;
            if(!o) R.uygYeni++; else if(o.state==='acik'&&st!=='acik') R.uygKapanan++; else if(o.state!=='acik'&&st==='acik') R.uygYenidenAcilan++;
            if(!R.ilk){ var tn=String(u.tanim||'').replace(/\s+/g,' ').slice(0,60); if(!o) dg.push('yeni uygunsuzluk: '+tn); else if(o.state==='acik'&&st!=='acik') dg.push('uygunsuzluk kapandı: '+tn); else if(o.state!=='acik'&&st==='acik') dg.push('uygunsuzluk yeniden açıldı: '+tn); }
            var r={id:id, hizmet_id:String(u.hizmet_id!=null?u.hizmet_id:hid), sicil:sic, tespit:u.tespit_tarihi||'', termin:u.termin_tarihi||'', kapatma:u.kapatilma_tarihi||'', onem:u.onem_derecesi||'', sorumlu:u.sorumlu||'', tanim:u.tanim||'', oneri:u.oneri||'', aciklama:u.aciklama||'', silindi:String(u.silindi||'0'), olusturma:u.olusturma_zamani||'', guncellemeZ:u.guncelleme_zamani||'', state:st, gorunmuyor:false,
                   ilkGorulme:o?o.ilkGorulme:bugun, sonGorulme:bugun, kapanisGorulme:st==='acik'?'':((o&&o.kapanisGorulme)||bugun)};
            uM[id]=r; W.uyg.push(r);
          });
        });
        /* Önceden açık olup bu alışta hiç gelmeyenler: değiştirme, sadece işaretle (yer imi hizmet sayfasını okuyamamış olabilir) */
        Object.keys(uM).forEach(function(id){ var o=uM[id]; if(o.sicil===sic&&o.state==='acik'&&!seen[id]&&hids[o.hizmet_id]){ R.uygGorunmeyen++; var c=Object.assign({},o,{gorunmuyor:true}); uM[id]=c; W.uyg.push(c); } });
        if(dg.length&&R.degisim.length<300) R.degisim.push({s:sic,ad:rec.ad||'',sb:rec.sube||'',ne:dg.slice(0,8),fazla:Math.max(0,dg.length-8)});
        W.docs.push({sicil:sic, docs:e.docs||{}, guncelleme:bugun});
      });
      Object.keys(uM).forEach(function(id){ var o=uM[id]; if(o.state==='acik'){ R.acik++; if(o.termin&&o.termin<bugun) R.gecikmis++; } });
      return {W:W, R:R};
    }
    /* ---- KOPYA sonu ---- */

  var ADLAR=['firms','hizmet','uyg','docs','meta'], ANAHTAR={firms:'sicil',hizmet:'id',uyg:'id',docs:'sicil',meta:'k'};
  function akkurt(ad){ return /AKKURT/i.test(ad||''); }
  function rakam(s){ return String(s==null?'':s).replace(/\D/g,''); }

  /* Akkurtlar'a ait sicil numaraları: adı Akkurtlar olan, Akkurtlar firmasına SGK no ile ya da elle bağlı olan kayıtlar */
  function akkurtSiciller(firmalar,ex){
    var no={}, akId={};
    function isaretle(s){ var k=rakam(s); if(k.length>=5) no[k]=1; if(nSic(s)) no[nSic(s)]=1; }
    firmalar.forEach(function(F){ if(!F||!akkurt(F.name)) return; akId[F.id]=1; if(F.info) isaretle(F.info.sgk); Object.keys(F.sbi||{}).forEach(function(n){ isaretle(F.sbi[n]&&F.sbi[n].sgk); }); });
    ex.firms.forEach(function(r){ if(akkurt(r.ad)) isaretle(r.sicil); });
    (ex.meta||[]).forEach(function(m){ if(m&&String(m.k).indexOf('link:')===0&&akId[m.fid]) isaretle(m.sicil); });
    return function(sicil){ var k=rakam(sicil); return !!(no[nSic(sicil)]||(k.length>=5&&no[k])); };
  }

  /* ---- Seçmeli alma (yeni uygulamaya özgü; kopya bölümün dışındadır) ----
     secim yoksa her şey alınır. secim = {firma, hizmet, uyg, belge:{anahtar:true}, siciller:{sicil:true}|null, donem:{bas,son}|null}
     Seçilmeyen veri yazılmaz; kayıtlı hali aynen kalır. */
  var BELGELER=[['risk_analizi_dosya','Risk Analizi'],['acil_durum_dosya','Acil Durum Planı'],['calisma_plani_dosya','Çalışma Planı'],['degerlendirme_plani_dosya','Değerlendirme Planı'],['egitim_plani_dosya','Eğitim Planı'],['tatbikat_plani_dosya','Tatbikat Planı'],['sozlesme_dosya','İSG Katip Sözleşmesi'],['personel_belgeleri','Personel belgeleri']];
  function gunOku(s){
    s=String(s==null?'':s).trim(); var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/), y,a,g;
    if(m){ y=+m[1]; a=+m[2]; g=+m[3]; } else { m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/); if(!m) return ''; y=+m[3]; a=+m[2]; g=+m[1]; }
    var d=new Date(Date.UTC(y,a-1,g)); if(y<1900||d.getUTCMonth()!==a-1||d.getUTCDate()!==g) return '';
    return d.toISOString().slice(0,10);
  }
  /* tur: tum | buyil | gecenyil | son12 | aralik */
  function donem(tur,bugun,bas,son){
    var y=+bugun.slice(0,4);
    if(tur==='buyil') return {bas:y+'-01-01',son:y+'-12-31'};
    if(tur==='gecenyil') return {bas:(y-1)+'-01-01',son:(y-1)+'-12-31'};
    if(tur==='son12'){ var g=bugun.slice(5)==='02-29'?'02-28':bugun.slice(5); return {bas:(y-1)+'-'+g,son:bugun}; }
    if(tur==='aralik'){ if(!gunOku(bas)||!gunOku(son)) throw new Error('İki tarihi de seçin.'); if(bas>son) throw new Error('Başlangıç tarihi bitiş tarihinden sonra olamaz.'); return {bas:bas,son:son}; }
    return null;
  }
  /* Seçim ekranındaki firma/şube listesi; Akkurtlar listede yer almaz */
  function liste(P,ex,firmalar){
    var bizim=akkurtSiciller(firmalar,ex), rows=listeSatirlari(P.liste), var_={}, gor={}, out=[];
    ex.firms.forEach(function(x){ var_[x.sicil]=1; });
    P.firmalar.forEach(function(e){
      var f=(e&&e.firma)||{}, s=nSic(f.sgksicil);
      if(!s||gor[s]||akkurt(f.firmaadi)||bizim(s)) return; gor[s]=1;
      out.push({sicil:s,ad:f.firmaadi||'(adsız)',sube:(rows[s]&&rows[s].sube)||'',yeni:!var_[s]});
    });
    return out.sort(function(a,b){ return trd(a.ad+' '+a.sube).localeCompare(trd(b.ad+' '+b.sube),'tr'); });
  }
  function tamVeri(sc){ return !!(sc.firma&&sc.hizmet&&sc.uyg&&!sc.donem&&BELGELER.every(function(b){ return sc.belge[b[0]]; })); }
  function secimUygula(out,sc,ex,bugun){
    var W=out.W, R=out.R, eski={firms:{},hizmet:{},uyg:{},docs:{}};
    ex.firms.forEach(function(x){ eski.firms[x.sicil]=x; }); ex.docs.forEach(function(x){ eski.docs[x.sicil]=x; });
    ex.hizmet.forEach(function(x){ eski.hizmet[x.id]=x; }); ex.uyg.forEach(function(x){ eski.uyg[x.id]=x; });
    var d=sc.donem, tarihsiz={hizmet:{},uyg:{}};
    function icinde(g){ return g>=d.bas&&g<=d.son; }

    /* Firma bilgisi seçilmediyse yalnız yeni kayıtların temel bilgisi yazılır (diğer veriler bu kayda bağlanır) */
    var temel={};
    if(!sc.firma) W.firms=W.firms.filter(function(x){ if(eski.firms[x.sicil]) return false; temel[x.sicil]=1; return true; });

    W.hizmet=!sc.hizmet?[]:W.hizmet.filter(function(x){
      if(!d) return true; var g=gunOku(x.tarih); if(!g){ tarihsiz.hizmet[x.id]=1; return true; } return icinde(g);
    });
    /* Açık olanlar ve kayıtta açık görünenler (sonradan kapananlar) döneme bakılmadan alınır */
    W.uyg=!sc.uyg?[]:W.uyg.filter(function(x){
      if(!d) return true; var g=gunOku(x.tespit), o=eski.uyg[x.id];
      if(x.state==='acik'||(o&&o.state==='acik')) return true;
      if(!g){ tarihsiz.uyg[x.id]=1; return true; } return icinde(g);
    });

    var secili=BELGELER.filter(function(b){ return sc.belge[b[0]]; }), zorunluBelge={};
    if(!secili.length) W.docs=[];
    else if(secili.length<BELGELER.length) W.docs=W.docs.map(function(x){
      var o=eski.docs[x.sicil];
      /* Daha önce belge bilgisi yoksa tamamı yazılır: yoksa seçilmeyenler yanlışlıkla “yüklenmemiş” görünür */
      if(!o||!o.docs||!Object.keys(o.docs).length){ zorunluBelge[x.sicil]=1; return x; }
      var yeni=Object.assign({},o.docs);
      secili.forEach(function(b){ if(Object.prototype.hasOwnProperty.call(x.docs,b[0])) yeni[b[0]]=x.docs[b[0]]; else delete yeni[b[0]]; });
      return Object.assign({},o,{docs:yeni});
    });

    /* Rapor sayıları yalnız yazılacaklara göre yeniden hesaplanır */
    function tekil(l){ var m={}; l.forEach(function(x){ m[x.id]=x; }); return m; }
    R.firmaGuncel=0; var gorulen={};
    W.firms.forEach(function(x){ if(eski.firms[x.sicil]&&!gorulen[x.sicil]) R.firmaGuncel++; gorulen[x.sicil]=1; });
    R.hizmetYeni=0; R.hizmetDegisen=0;
    var h=tekil(W.hizmet); Object.keys(h).forEach(function(id){ var o=eski.hizmet[id]; if(!o) R.hizmetYeni++; else if(String((o.veri||{}).guncelleme_tarihi||'')!==String(h[id].veri.guncelleme_tarihi||'')) R.hizmetDegisen++; });
    R.uygYeni=0; R.uygKapanan=0; R.uygYenidenAcilan=0; R.uygGorunmeyen=0;
    var u=tekil(W.uyg); Object.keys(u).forEach(function(id){ var o=eski.uyg[id], x=u[id]; if(x.gorunmuyor) R.uygGorunmeyen++; if(!o) R.uygYeni++; else if(o.state==='acik'&&x.state!=='acik') R.uygKapanan++; else if(o.state!=='acik'&&x.state==='acik') R.uygYenidenAcilan++; });
    var son=Object.assign({},eski.uyg,u); R.acik=0; R.gecikmis=0;
    Object.keys(son).forEach(function(id){ var o=son[id]; if(o.state==='acik'){ R.acik++; if(o.termin&&o.termin<bugun) R.gecikmis++; } });

    R.zorunluTemel=Object.keys(temel).length; R.zorunluBelge=Object.keys(zorunluBelge).length;
    R.tarihsizHizmet=Object.keys(tarihsiz.hizmet).length; R.tarihsizUyg=Object.keys(tarihsiz.uyg).length;
    R.yeniHizmetsiz=(!sc.hizmet||d)?W.firms.filter(function(x){ return !eski.firms[x.sicil]; }).length:0;
    var kismi=[];
    if(!tamVeri(sc)){
      R.degisim=[];
      var ad=[]; if(sc.firma) ad.push('firma/şube bilgisi'); if(sc.hizmet) ad.push('hizmet'); if(sc.uyg) ad.push('uygunsuzluk');
      if(secili.length) ad.push(secili.length===BELGELER.length?'tüm belge bilgileri':secili.map(function(b){ return b[1]; }).join(', '));
      kismi.push('veri: '+(ad.join(', ')||'yok'));
      if(d) kismi.push('dönem: '+d.bas.split('-').reverse().join('.')+' – '+d.son.split('-').reverse().join('.'));
    }
    if(R.secilmeyen) kismi.push(R.secilmeyen+' firma/şube seçilmedi');
    R.kismi=kismi.join(' · ');
    return out;
  }

  /* plan() çağrılmadan önce Akkurtlar girdileri ayıklanır; sonuçta da Akkurtlar'a ait hiçbir satır bırakılmaz */
  function hesapla(P,opt,ex,firmalar,bugun){
    var bizim=akkurtSiciller(firmalar,ex), atlanan=[], sc=opt.secim||null, secilmeyen={};
    var kalan=P.firmalar.filter(function(e){
      var f=(e&&e.firma)||{}, s=nSic(f.sgksicil);
      if(akkurt(f.firmaadi)||(s&&bizim(s))){ atlanan.push(f.firmaadi||s); return false; }
      if(sc&&sc.siciller&&s&&!sc.siciller[s]){ secilmeyen[s]=1; return false; }
      return true;
    });
    var out=plan(Object.assign({},P,{firmalar:kalan}),opt,ex,bugun);
    /* Aynı kayıt kimliği Akkurtlar'da varsa üzerine yazılmaz */
    ['hizmet','uyg'].forEach(function(n){
      var korunan={}; ex[n].forEach(function(x){ if(bizim(x.sicil)) korunan[x.id]=1; });
      out.W[n]=out.W[n].filter(function(x){ return !korunan[x.id]&&!bizim(x.sicil); });
    });
    out.R.akkurtAtlanan=atlanan.length;
    if(sc){ out.R.secilmeyen=Object.keys(secilmeyen).length; secimUygula(out,sc,ex,bugun); }
    return out;
  }

  /* Yazılacak bir şey yoksa kayıt yapılmaz */
  function bos(out){ return !['firms','hizmet','uyg','docs'].some(function(n){ return out.W[n].length; }); }

  /* Okuma ve yazma aynı işlem içinde yapılır: arada başka sekme değişiklik yapamaz; ya tamamı yazılır ya hiçbiri */
  function kaydet(P,opt,firmalar){
    return new Promise(function(ok,no){
      var r;
      try{ r=indexedDB.open('teksen-takip',1); }catch(e){ no(e); return; }
      r.onupgradeneeded=function(){ ADLAR.forEach(function(n){ if(!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n,{keyPath:ANAHTAR[n]}); }); };
      r.onerror=function(){ no(r.error); };
      r.onsuccess=function(){
        var db=r.result, tx, hata=null, sonuc=null; db.onversionchange=function(){ db.close(); };
        try{
          tx=db.transaction(ADLAR,'readwrite');
          var q=ADLAR.map(function(n){ return tx.objectStore(n).getAll(); });
          q[q.length-1].onsuccess=function(){
            try{
              var ex={}; ADLAR.forEach(function(n,i){ ex[n]=q[i].result||[]; });
              var out=hesapla(P,opt,ex,firmalar,today());
              if(bos(out)) throw new Error('Kaydedilecek Teksen kaydı yok.');
              var tNow=new Date().toISOString(), gl=[];
              ex.meta.forEach(function(m){ if(m&&m.k==='gunluk'&&Array.isArray(m.n)) gl=m.n; });
              out.W.meta.push({k:'son', t:tNow, R:out.R});
              out.W.meta.push({k:'gunluk', n:[{t:tNow,R:out.R}].concat(gl).slice(0,60)});
              ADLAR.forEach(function(n){ var s=tx.objectStore(n); out.W[n].forEach(function(x){ s.put(x); }); });
              sonuc=out.R;
            }catch(e){ hata=e; tx.abort(); }
          };
          tx.oncomplete=function(){ db.close(); ok(sonuc); };
          tx.onabort=function(){ db.close(); no(hata||tx.error||new Error('Kayıt iptal edildi')); };
        }catch(e){ try{ tx.abort(); }catch(x){} db.close(); no(e); }
      };
    });
  }
  return {BELGELER:BELGELER,donem:donem,liste:liste,parse:parse,periyot:periyot,plan:plan,hesapla:hesapla,bos:bos,kaydet:kaydet,today:today};
})();

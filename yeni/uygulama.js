/* Kerem İGU: ekranlar. Her sayfa aynı şablonu kullanır: başlık + tek cümle + kutular; ayrıntı açılır pencerede. */
(function(){
  var H=window.Hesap, V=null, OZ=null, UY={}, PASIF=false, ARA='';
  var ana=document.getElementById('ana'), pen=document.getElementById('pencere'), penB=document.getElementById('pencere-baslik'), penI=document.getElementById('pencere-icerik');

  function E(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  function kisiler(fid,sb){ return V.kisiler[fid+'|'+(sb||'')]||[]; }
  function recAd(r){ return (r.ad||'(adsız)')+(r.sube?' · '+r.sube:''); }
  function firma(id){ return V.firmalar.filter(function(f){ return f.id===id; })[0]||null; }
  function uyariSay(recs){ return recs.reduce(function(t,r){ return t+(UY[r.sicil]?UY[r.sicil].why.length:0); },0); }

  /* Eski uygulamadaki firma başlığı ve şube listesi kuralları */
  function firmaAd(F){
    var recs=[]; Object.keys(V.lk.byUnit).forEach(function(k){ if(k.indexOf(F.id+'|')===0) recs=recs.concat(V.lk.byUnit[k]); });
    if(!recs.length) return F.name||'(adsız firma)';
    var ads=recs.map(function(r){ return String(r.ad||'').trim(); });
    if(ads.length>1){ var on=ads.map(function(x){ var i=x.lastIndexOf(' - '); return i>0?x.slice(0,i):x; }); if(on.every(function(x){ return x===on[0]; })&&on[0]) return on[0]; }
    return ads.slice().sort(function(a,b){ return a.length-b.length; })[0]||F.name||'(adsız firma)';
  }
  function birimler(F){
    var out=[], gor={};
    function ekle(sube,ad){ var key=F.id+'|'+sube; gor[key]=1; out.push({fid:F.id,sube:sube,ad:ad,recs:V.lk.byUnit[key]||[]}); }
    function acik(n){ return PASIF||!(F.sbp&&F.sbp[n]); }
    var sb=(F.sb||[]).filter(function(n){ return n&&acik(n); });
    if(!sb.length||V.lk.byUnit[F.id+'|']||kisiler(F.id,'').length) ekle('','Firma geneli');
    sb.forEach(function(n){ ekle(n,n); });
    Object.keys(V.lk.byUnit).forEach(function(k){ if(k.indexOf(F.id+'|')===0&&!gor[k]){ var n=k.slice(F.id.length+1); if(!n||acik(n)) ekle(n,n||'Firma geneli'); } });
    return out;
  }

  /* ---- ortak şablon ---- */
  function sayfa(baslik,aciklama,yol){
    ana.textContent='';
    if(yol&&yol.length){ var n=E('nav','yol'); yol.forEach(function(y){ var a=E('a',null,'‹ '+y[0]); a.href=y[1]; n.appendChild(a); }); ana.appendChild(n); }
    ana.appendChild(E('h1',null,baslik)); ana.appendChild(E('p','aciklama',aciklama));
    V.hata.forEach(function(h){ ana.appendChild(E('p','bilgi uyari',h)); });
  }
  function izgara(){ var g=E('div','kutular'); ana.appendChild(g); return g; }
  function kutu(g,o){
    var k=E(o.href?'a':(o.tik?'button':'div'),'kutu'+(o.ton?' '+o.ton:''));
    if(o.href) k.href=o.href; else if(o.tik){ k.type='button'; k.addEventListener('click',o.tik); }
    if(o.sayi!=null) k.appendChild(E('span','sayi',String(o.sayi)));
    k.appendChild(E('span','ad',o.ad)); if(o.alt) k.appendChild(E('span','alt',o.alt));
    g.appendChild(k); return k;
  }
  /* satirlar: [{b:başlık, a:açıklama, href}] */
  function ac(baslik,satirlar,bosYazi){
    penB.textContent=baslik; penI.textContent='';
    if(!satirlar.length) penI.appendChild(E('p','bilgi',bosYazi||'Kayıt yok.'));
    satirlar.forEach(function(s){
      var d=E(s.href?'a':'div','satir'); if(s.href){ d.href=s.href; d.addEventListener('click',function(){ pen.close(); }); }
      d.appendChild(E('b',null,s.b)); if(s.a) d.appendChild(E('span',null,s.a)); penI.appendChild(d);
    });
    pen.showModal(); penI.scrollTop=0;
  }
  document.getElementById('pencere-kapat').addEventListener('click',function(){ pen.close(); });
  pen.addEventListener('click',function(e){ if(e.target===pen) pen.close(); });

  function panoAdres(fid,sb){ return '#pano/'+encodeURIComponent(fid)+'/'+encodeURIComponent(sb||''); }
  function recSatir(m){ var l=V.lk.byRec[m.f.sicil]; return {b:recAd(m.f), a:(m.why.join(' · ')||'uyarı yok')+(l?'':' · firmaya bağlanmamış'), href:l?panoAdres(l.fid,l.sube):null}; }

  function veriYok(){
    if(V.data.f.length) return false;
    ana.appendChild(E('p','bilgi','Bu tarayıcıda kayıtlı Teksen verisi yok. Önce eski uygulamada “Teksen verisini al” işlemini yapın, sonra bu sayfayı yenileyin.'));
    return true;
  }

  /* ---- Bugün ---- */
  function bugunSayfa(){
    sayfa('Bugün','Hangi firma ve şubelerde bakılması gereken bir iş olduğunu gösterir.');
    if(veriYok()) return;
    var c=OZ.c, g=izgara(), rows=OZ.rows.slice().sort(function(a,b){ return (b.pts-a.pts)||H.trd(a.f.ad||'').localeCompare(H.trd(b.f.ad||''),'tr'); });
    var uyarili=rows.filter(function(m){ return m.why.length; });
    kutu(g,{sayi:rows.filter(function(m){ return m.pts>0; }).length,ad:'Öncelikli liste',alt:'en önemliden başlar',tik:function(){ ac('Öncelikli liste',rows.filter(function(m){ return m.pts>0; }).map(recSatir),'Uyarı yok.'); }});
    [['Ziyareti gecikmiş',c.gec,function(m){ return m.v.state==='gec'; }],
     ['Hiç ziyareti yok',c.yok,function(m){ return m.v.state==='yok'; }],
     ['Süresi geçmiş uygunsuzluk',c.ug,function(m){ return m.ug>0; }],
     ['Belge uyarısı',c.doc,function(m){ return m.docBad>0; }],
     ['Görevlendirme eksik',c.pers,function(m){ return m.st&&m.st.pers.length; }],
     ['Eğitim kaydı yok',c.egy,function(m){ return m.eyok; }],
     ['Eğitim yenilenmeli',c.eyen,function(m){ return m.eyen; }],
     ['Kişi eğitimi yenilenmeli',c.kyen,function(m){ return m.kyen; }]
    ].forEach(function(x){ kutu(g,{sayi:x[1],ad:x[0],alt:'firma/şube',ton:x[1]?'uyari':'iyi',tik:function(){ ac(x[0],uyarili.filter(x[2]).map(recSatir),'Bu başlıkta uyarı yok.'); }}); });
    var son=V.data.meta.filter(function(m){ return m.k==='son'; })[0];
    if(son&&son.t) ana.appendChild(E('p','not','Teksen verisi en son '+new Date(son.t).toLocaleString('tr-TR')+' tarihinde alındı.'));
  }

  /* ---- Firmalar ---- */
  function firmalarSayfa(){
    sayfa('Firmalar','Bir firmaya dokunarak şubelerini görün.');
    var q=E('input','ara'); q.type='search'; q.placeholder='Firma veya şube ara'; q.setAttribute('aria-label','Firma veya şube ara'); q.value=ARA; ana.appendChild(q);
    var pasifN=V.firmalar.filter(function(f){ return f.pasif; }).length+V.firmalar.reduce(function(t,f){ return t+Object.keys(f.sbp||{}).length; },0);
    if(pasifN){ var l=E('label','secim'), cb=E('input'); cb.type='checkbox'; cb.checked=PASIF; cb.addEventListener('change',function(){ PASIF=cb.checked; firmalarSayfa(); }); l.appendChild(cb); l.appendChild(document.createTextNode(' Pasif / arşiv olanları da göster ('+pasifN+')')); ana.appendChild(l); }
    var g=izgara();
    function ciz(){
      g.textContent=''; var duz=function(x){ return H.trd(x).replace(/ı/g,'i'); }, s=duz(ARA).trim();
      var list=V.firmalar.filter(function(f){ return PASIF||!f.pasif; }).map(function(f){ return {f:f,ad:firmaAd(f),b:birimler(f)}; })
        .filter(function(x){ return !s||duz(x.ad+' '+(x.f.name||'')+' '+x.b.map(function(u){ return u.ad+' '+u.recs.map(recAd).join(' '); }).join(' ')).indexOf(s)>=0; })
        .sort(function(a,b){ return a.ad.localeCompare(b.ad,'tr'); });
      list.forEach(function(x){
        var recs=[]; x.b.forEach(function(u){ recs=recs.concat(u.recs); }); var w=uyariSay(recs);
        var sb=x.b.filter(function(u){ return u.sube; }).length;
        kutu(g,{ad:x.ad,alt:(sb?sb+' şube':'şubesiz')+' · '+(!recs.length?'Teksen kaydı eşleşmedi':(w?w+' uyarı':'uyarı yok'))+(x.f.pasif?' · pasif':''),ton:w?'uyari':'',href:'#firma/'+encodeURIComponent(x.f.id)});
      });
      if(!list.length) g.appendChild(E('p','bilgi',V.firmalar.length?'Aramaya uyan firma yok.':'Bu tarayıcıda kayıtlı firma yok. Bu sayfayı eski uygulamayla aynı adresten ve aynı tarayıcıda açın.'));
      if(V.lk.unmatched.length&&!s) kutu(g,{sayi:V.lk.unmatched.length,ad:'Bağlanmamış Teksen kaydı',alt:'henüz bir firmaya bağlı değil',tik:function(){ ac('Bağlanmamış Teksen kayıtları',V.lk.unmatched.map(function(r){ return {b:recAd(r),a:r.adres||''}; })); }});
    }
    q.addEventListener('input',function(){ ARA=q.value; ciz(); }); ciz();
  }

  /* ---- Şubeler ---- */
  function firmaSayfa(fid){
    var F=firma(fid); if(!F){ location.replace('#firmalar'); return; }
    sayfa(firmaAd(F),'Bir şubeye dokunarak panosunu açın.',[['Firmalar','#firmalar']]);
    var g=izgara();
    birimler(F).forEach(function(u){
      var w=uyariSay(u.recs), n=kisiler(u.fid,u.sube).length, adres=u.recs[0]&&u.recs[0].adres;
      kutu(g,{ad:u.ad,alt:(!u.recs.length?'Teksen kaydı yok':(w?w+' uyarı':'uyarı yok'))+' · '+n+' kişi'+(adres?' · '+adres:''),ton:w?'uyari':'',href:panoAdres(u.fid,u.sube)});
    });
  }

  /* ---- Pano ---- */
  function panoSayfa(fid,sb){
    var F=firma(fid); if(!F){ location.replace('#firmalar'); return; }
    var recs=V.lk.byUnit[fid+'|'+sb]||[], L=kisiler(fid,sb), bugun=H.today(), cok=recs.length>1;
    sayfa(sb||'Firma geneli',firmaAd(F)+' için güncel durum özeti.',[['Firmalar','#firmalar'],['Şubeler','#firma/'+encodeURIComponent(fid)]]);
    var g=izgara(), ad=function(r,x){ return cok?recAd(r)+' · '+x:x; };
    if(recs.length){
      var uyar=[], ziy=[], ugAcik=[], ugGec=0, bel=[], belKotu=0, belVar=false, egt=[], gorev=[], gorevEksik=0, tum={f:recs,h:V.data.h,u:V.data.u,d:V.data.d};
      recs.forEach(function(r){ var m=UY[r.sicil]; if(m) m.why.forEach(function(w){ uyar.push({b:w,a:cok?recAd(r):''}); }); });
      H.visitStats(tum,bugun).forEach(function(v){
        ziy.push({b:ad(v.f,v.last?'Son ziyaret '+H.vTr(v.last):'Ziyaret kaydı yok'),a:[v.last?v.days+' gün önce':'',v.per?'periyot yaklaşık '+v.per+' gün':'periyot bilinmiyor',v.late?v.late+' gün gecikmiş':''].filter(Boolean).join(' · ')});
        v.past.slice(1,13).forEach(function(d){ ziy.push({b:ad(v.f,H.vTr(d)),a:'önceki ziyaret'}); });
      });
      var sicil={}; recs.forEach(function(r){ sicil[r.sicil]=r; });
      V.data.u.filter(function(u){ return u.state==='acik'&&sicil[u.sicil]; }).sort(function(a,b){ return String(a.termin||'9').localeCompare(String(b.termin||'9')); }).forEach(function(u){
        var gec=u.termin&&u.termin<bugun; if(gec) ugGec++;
        ugAcik.push({b:ad(sicil[u.sicil],u.tanim||'(tanım yok)'),a:[u.onem,u.termin?'termin '+(/^\d{4}-\d{2}-\d{2}/.test(u.termin)?H.vTr(u.termin.slice(0,10)):u.termin):'termin yok',gec?'süresi geçmiş':'',u.gorunmuyor?'son Teksen alımında görünmedi':''].filter(Boolean).join(' · ')});
      });
      recs.forEach(function(r){
        var x=V.data.d.filter(function(d){ return d.sicil===r.sicil; })[0];
        if(!x||!x.docs||!Object.keys(x.docs).length){ bel.push({b:ad(r,'Belge bilgisi alınmamış'),a:''}); return; }
        belVar=true;
        H.DTYPES.forEach(function(t){ var s=H.docEval(t[0],x.docs[t[0]],r.tehlike,bugun); if(H.CORE.indexOf(t[0])>=0&&(s.s==='yok'||s.s==='eski')) belKotu++; bel.push({b:ad(r,t[1]),a:s.msg+(s.last?' · son dosya '+H.vTr(s.last):'')}); });
      });
      var egtSorun=false;
      H.staffStats(tum,bugun).forEach(function(x){
        if(!x.egitim||x.egEski||x.egitim.eksik>0) egtSorun=true;
        egt.push({b:ad(x.f,x.egitim?'Son eğitim '+H.vTr(x.egitim.d):'Eğitim kaydı yok'),a:x.egitim?'eğitim alan '+x.egitim.tamam+', almayan '+x.egitim.eksik+(x.egEski?' · yenilenmeli':''):''});
        if(!x.persVar) gorev.push({b:ad(x.f,'Hizmet kaydı yok'),a:'karşılaştırma yapılamadı'});
        else if(!x.pers.length) gorev.push({b:ad(x.f,'Görevlendirmeler gerekli sayıda'),a:''});
        else x.pers.forEach(function(p){ gorevEksik++; gorev.push({b:ad(x.f,p.t),a:'görevli '+p.mev+', gereken '+p.gerekli}); });
      });
      var b=function(sayi,adi,alt,ton,satir,bos){ kutu(g,{sayi:sayi,ad:adi,alt:alt,ton:ton,tik:function(){ ac(adi,satir,bos); }}); };
      b(uyar.length,'Uyarılar','bakılacak konu',uyar.length?'uyari':'iyi',uyar,'Uyarı yok.');
      var son=H.visitStats(tum,bugun), gecZ=son.some(function(v){ return v.state==='gec'||v.state==='yok'; });
      b(null,'Ziyaretler',cok?recs.length+' kayıt':(son[0].last?'son: '+H.vTr(son[0].last):'kayıt yok'),gecZ?'uyari':'',ziy);
      b(ugAcik.length,'Açık uygunsuzluk',ugGec+' tanesinin süresi geçmiş',ugGec?'uyari':'',ugAcik,'Kayıtlı açık uygunsuzluk yok.');
      b(belVar?belKotu:'–','Belgeler',belVar?'temel belge eksik veya yenilenmeli':'bilgi alınmamış',belKotu?'uyari':'',bel);
      b(null,'Eğitim',egtSorun?'kontrol gerekli':'uyarı yok',egtSorun?'uyari':'iyi',egt);
      b(gorevEksik,'Görevlendirme','eksik görev türü',gorevEksik?'uyari':'',gorev);
    }
    /* TC kimlik numarası bilerek gösterilmez */
    kutu(g,{sayi:L.length,ad:'Personel',alt:'kayıtlı kişi',tik:function(){ ac('Personel',L.slice().sort(function(a,b){ return String(a.ad||'').localeCompare(String(b.ad||''),'tr'); }).map(function(x){ return {b:x.ad||'(adsız)',a:x.gorev||''}; }),'Bu şubede kayıtlı kişi yok.'); }});
    if(!recs.length) ana.appendChild(E('p','bilgi','Bu şubeye bağlı Teksen kaydı yok; ziyaret, uygunsuzluk ve belge kutuları bu yüzden görünmüyor.'));
  }

  function coz(x){ try{ return decodeURIComponent(x||''); }catch(e){ return ''; } }
  function yonlendir(){
    if(!V) return; if(pen.open) pen.close();
    var p=location.hash.slice(1).split('/'), s=p[0]||'bugun';
    if(s==='firmalar') firmalarSayfa(); else if(s==='firma') firmaSayfa(coz(p[1])); else if(s==='pano') panoSayfa(coz(p[1]),coz(p[2])); else bugunSayfa();
    document.querySelectorAll('[data-sekme]').forEach(function(a){ var on=a.getAttribute('data-sekme')===(s==='firma'||s==='pano'?'firmalar':(s==='firmalar'?s:'bugun')); if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    window.scrollTo(0,0);
  }
  var sira=0;
  function yukle(){
    var n=++sira;
    return window.Veri.oku().then(function(v){
      if(n!==sira) return; V=v;
      var evp={get:function(fid,sb){ return kisiler(fid,sb); }};
      window.__evpApi=evp;
      OZ=H.ozet(V.data,V.lk,H.today()); UY={}; OZ.rows.forEach(function(m){ UY[m.f.sicil]=m; });
      yonlendir();
    }).catch(function(e){ ana.textContent=''; ana.appendChild(E('p','bilgi uyari','Veriler gösterilemedi: '+(e&&e.message||e))); });
  }
  window.addEventListener('hashchange',yonlendir);
  /* Eski uygulamada yapılan değişiklikler, bu sayfaya dönünce görünsün */
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&!pen.open) yukle(); });
  yukle();
})();

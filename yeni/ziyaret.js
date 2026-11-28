/* Ziyaret formu: ilk ve periyodik ziyaret adımları, eksiklerin sonraki ziyarete taşınması, Onaylı Defter taslağı.
   Yalnız kendi kaydını (kigu-ziyaret-v1) yazar; firma, personel ve Teksen kayıtlarını yalnız okur (Akkurtlar dahil).
   Adımlar Kerem'in anlattığı çalışma akışıdır; mevzuat doğrulaması yapılmış bir liste değildir. */
window.Ziyaret=(function(){
  var H=window.Hesap, ANAHTAR='kigu-ziyaret-v1';
  var TUR={ilk:'İlk ziyaret',periyodik:'Periyodik ziyaret'}, DURUM={yapildi:'Yapıldı',eksik:'Eksik',gerekmiyor:'Gerekmiyor'};

  /* [bölüm, [kod, kısa ad, açıklama]...]  Kodlar kayıtlarda saklanır; değiştirilmemeli. */
  var ADIM={
    ilk:[
      ['1. Yasal atama ve süre',['i_katip','İSG-KATİP sözleşme onayı','İSG-KATİP üzerinden sözleşme onaylarının yapılması'],['i_sure','Aylık zorunlu çalışma süresi','Tehlike sınıfına göre aylık zorunlu çalışma süresinin belirlenmesi']],
      ['2. Kurum ve personel bilgileri',['i_nace','NACE kodu ve tehlike sınıfı','İş yerinin NACE kodu ve tehlike sınıfı bilgilerinin alınması'],['i_sgk','Güncel SGK hizmet listesi','Güncel SGK hizmet listesinin alınması'],['i_gorev','Çalışan görev tanımları','Çalışanların görev tanımlarının alınması']],
      ['3. Saha gezisi ve teknik analiz',['i_saha','Saha gezisi ve tehlike fotoğrafları','Tüm bölümlerin gezilmesi ve tehlikelerin fotoğraflanması'],['i_ekipman','Makine, ekipman, kimyasal incelemesi','Makine, ekipman, kimyasal maddeler ve çalışma yöntemlerinin yerinde incelenmesi']],
      ['4. Temel dokümanlar',['i_risk','Risk Değerlendirmesi Raporu',''],['i_adep','Acil Durum Eylem Planı ve tahliye krokileri',''],['i_calisma','Yıllık Çalışma Planı',''],['i_egplan','Yıllık Eğitim Planı',''],['i_atama','Temsilci ve destek elemanı atama yazıları','Çalışan temsilcisi ve destek elemanı (arama-kurtarma, yangın, ilk yardım)'],['i_taseron','Alt işveren ve ziyaretçi İSG prosedürleri','']],
      ['5. Eğitim ve özlük evrakları',['i_egitim','Temel İSG eğitimleri','Mevcut tüm personele tehlike sınıfına uygun temel İSG eğitimi'],['i_kkd','KKD zimmet tutanakları',''],['i_dosya','Personel İSG dosyaları','']],
      ['6. Sağlık ve teknik kontrol planı',['i_ek2','EK-2 sağlık muayenesi planı','İşyeri hekimiyle birlikte planlanması'],['i_periyodik','Periyodik teknik kontrol takvimi','Basınçlı kaplar, kaldırma araçları, elektrik topraklama'],['i_olcum','Ortam ölçümü takvimi','']],
      ['7. Kayıt altına alma',['i_defter','Onaylı Deftere yazma ve imza','İlk tespit ve önerilerin deftere yazılıp işveren veya vekiline imzalatılması']]
    ],
    periyodik:[
      ['1. Durum tespiti',['p_hareket','Personel hareketleri','Önceki ziyaretten bu yana işe giren ve ayrılanların sorulması'],['p_olay','İş kazası ve ramak kala sorgusu',''],['p_degisim','Çalışma ortamındaki değişiklikler','Yeni makine, proses değişikliği, tadilat vb.']],
      ['2. Personel evrak ve eğitim güncellemesi',['p_giris','Yeni girenler: eğitim, KKD, özlük evrakı',''],['p_ozel','Özel politika gerektiren gruplar','Engelli, gebe, stajyer, genç çalışan vb. için ek belge ve risk önlemleri'],['p_cikis','Ayrılanlar: ekip ve atama güncellemesi','Çalışan temsilcisi, destek elemanı ve acil durum ekip listeleri']],
      ['3. Olay, kaza ve ramak kala',['p_bildirim','Kaza / meslek hastalığı bildirimi ve analizi','Yasal bildirim sürelerinin kontrolü ve kök neden analizi'],['p_ramak','Ramak kala kaydı ve önleyici faaliyet','']],
      ['4. Evrak, sağlık ve teknik takip',['p_klasor','İSG klasöründeki eksik belgeler',''],['p_ek2','EK-2 muayene geçerlilikleri','İşe giriş ve periyodik muayeneler, işyeri hekimiyle birlikte'],['p_periyodik','Periyodik teknik muayeneler ve ortam ölçümleri','Vinç, kompresör, elektrik tesisatı vb.'],['p_taseron','Taşeron ve bakım ekibi evrakları','SGK, eğitim, KKD']],
      ['5. Saha denetimi',['p_onceki','Önceki uygunsuzlukların kontrolü','Giderilip giderilmediğinin yerinde kontrolü'],['p_saha','Mevcut saha koşullarının denetimi','']],
      ['6. Kurul ve kayıt',['p_kurul','İSG Kurulu toplantısı','Çalışan sayısı 50 ve üzeri olan işletmelerde'],['p_defter','Onaylı Deftere işleme ve onay','Yeni tespit ve öneriler']]
    ]
  };
  var BILGI={};
  ['ilk','periyodik'].forEach(function(t){ ADIM[t].forEach(function(b){ b.slice(1).forEach(function(a){ BILGI[a[0]]={ad:a[1],ac:a[2],tur:t}; }); }); });
  function kodlar(tur){ var o=[]; ADIM[tur].forEach(function(b){ b.slice(1).forEach(function(a){ o.push(a[0]); }); }); return o; }
  function adimAd(kod){ return BILGI[kod]?BILGI[kod].ad:kod; }

  /* ---- Kayıt ---- */
  function nesne(x){ return !!x&&typeof x==='object'&&!Array.isArray(x); }
  function coz(raw){
    if(!raw) return {v:1,list:[]};
    var o; try{ o=JSON.parse(raw); }catch(e){ o=null; }
    if(!o||!Array.isArray(o.list)||!o.list.every(function(z){ return nesne(z)&&z.id&&TUR[z.tur]&&nesne(z.adimlar)&&Array.isArray(z.devir); })) throw new Error('Ziyaret kayıtları okunamadı. Üzerine yazılmadı.');
    return o;
  }
  function oku(){ return coz(localStorage.getItem(ANAHTAR)); }
  function yaz(o){ try{ localStorage.setItem(ANAHTAR,JSON.stringify(o)); }catch(e){ throw new Error('Kaydedilemedi: tarayıcının veri alanı dolu olabilir.'); } if(window.Esitle) window.Esitle.degisti(); }
  /* Yedek geri yüklenirken ziyaretler silinmez: iki liste birleştirilir, aynı kayıtta son değiştirilen kalır */
  function birlestir(mevcutRaw,gelenRaw){
    var a=coz(mevcutRaw), b=coz(gelenRaw), m={}, sira=[];
    a.list.concat(b.list).forEach(function(z){ if(!m[z.id]){ m[z.id]=z; sira.push(z.id); } else if((z.t||0)>(m[z.id].t||0)) m[z.id]=z; });
    return JSON.stringify({v:1,list:sira.map(function(i){ return m[i]; })});
  }
  function canli(o){ return o.list.filter(function(z){ return !z.silindi; }); }
  function sirala(a,b){ return a.tarih<b.tarih?1:a.tarih>b.tarih?-1:(b.olusma||0)-(a.olusma||0); }
  function yerinde(o,fid,sube){ return canli(o).filter(function(z){ return z.fid===fid&&z.sube===sube; }).sort(sirala); }
  function guncelle(id,fn){ var o=oku(), z=o.list.filter(function(x){ return x.id===id; })[0]; if(!z) throw new Error('Ziyaret bulunamadı.'); fn(z); z.t=Date.now(); yaz(o); return z; }

  /* Bir ziyaretten sonrakine kalan işler: "eksik" işaretlenenler ve önceden devredip hâlâ işaretlenmeyenler */
  function kalanlar(z){
    var out=[];
    kodlar(z.tur).forEach(function(k){
      var a=z.adimlar[k]||{}, on=(z.onceki||{})[k];
      if(a.d==='eksik'||(!a.d&&on)) out.push({kod:k,not:a.n||(on&&on.not)||'',tarih:on?on.tarih:z.tarih});
    });
    z.devir.forEach(function(x){ if(!x.d||x.d==='eksik') out.push({kod:x.kod,not:x.n||x.not||'',tarih:x.tarih}); });
    return out;
  }
  function yeni(fid,sube,tur,ad,tarih){
    var o=oku(), L=yerinde(o,fid,sube), acik=L.filter(function(z){ return !z.tamam; })[0];
    if(acik) throw new Error('Bu yerde tamamlanmamış bir ziyaret var. Önce onu tamamlayın veya silin.');
    var once=L[0], onceki={}, devir=[], bu={}; kodlar(tur).forEach(function(k){ bu[k]=1; });
    if(once) kalanlar(once).forEach(function(x){ if(bu[x.kod]) onceki[x.kod]={tarih:x.tarih,not:x.not}; else devir.push({kod:x.kod,not:x.not,tarih:x.tarih,d:'',n:''}); });
    var z={id:'z'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),fid:fid,sube:sube,ad:ad,tur:tur,tarih:tarih,olusma:Date.now(),t:Date.now(),tamam:false,adimlar:{},onceki:onceki,devir:devir,tespit:'',defter:''};
    o.list.push(z); yaz(o); return z.id;
  }

  /* ---- Metinler ---- */
  function eksikler(z){
    var out=[];
    kodlar(z.tur).forEach(function(k){ var a=z.adimlar[k]||{}; if(a.d==='eksik') out.push({ad:adimAd(k),not:a.n||''}); });
    z.devir.forEach(function(x){ if(x.d==='eksik') out.push({ad:adimAd(x.kod),not:x.n||x.not||''}); });
    return out;
  }
  function isaretsiz(z){
    var o=[];
    kodlar(z.tur).forEach(function(k){ if(!(z.adimlar[k]||{}).d) o.push(adimAd(k)); });
    z.devir.forEach(function(x){ if(!x.d) o.push(adimAd(x.kod)); });
    return o;
  }
  function satirlar(metin){ return String(metin||'').split('\n').map(function(s){ return s.replace(/^\s*(?:\d+[.)]|[-•*])\s+/,'').trim(); }).filter(Boolean); }
  /* Firma ve kişi adı eklenmez; metni Kerem düzenleyip deftere kendisi yazar */
  function defterTaslagi(z){
    var s=['Tarih: '+H.vTr(z.tarih),'','İş yerinde '+(z.tur==='ilk'?'ilk':'periyodik')+' İSG ziyareti yapılmıştır.'], t=satirlar(z.tespit), e=eksikler(z);
    if(t.length){ s.push('','Tespit ve öneriler:'); t.forEach(function(x,i){ s.push((i+1)+'. '+x); }); }
    if(e.length){ s.push('','Tamamlanması gereken işler:'); e.forEach(function(x){ s.push('- '+x.ad+(x.not?': '+x.not.replace(/\s+/g,' ').trim():'')); }); }
    return s.join('\n');
  }
  function ozetMetni(z){
    var s=[z.ad,TUR[z.tur]+' · '+H.vTr(z.tarih)+(z.tamam?'':' (tamamlanmadı)')];
    function grup(b,l){ if(!l.length) return; s.push('',b+' ('+l.length+'):'); l.forEach(function(x){ s.push('- '+x); }); }
    var y=[], g=[];
    function ekle(kod,d,n){ var m=adimAd(kod)+(n?': '+n:''); if(d==='yapildi') y.push(m); else if(d==='gerekmiyor') g.push(m); }
    kodlar(z.tur).forEach(function(k){ var a=z.adimlar[k]||{}; ekle(k,a.d,a.n); }); z.devir.forEach(function(x){ ekle(x.kod,x.d,x.n); });
    grup('Eksik',eksikler(z).map(function(x){ return x.ad+(x.not?': '+x.not:''); })); grup('Yapıldı',y); grup('Gerekmiyor',g); grup('İşaretlenmedi',isaretsiz(z));
    var t=satirlar(z.tespit); grup('Tespit ve öneriler',t);
    return s.join('\n');
  }

  /* ---- Uygulamadaki veriden hatırlatmalar (yalnız okuma) ---- */
  function ipuclari(V,fid,sube,oncekiTarih){
    var bugun=H.today(), recs=V.lk.byUnit[fid+'|'+sube]||[], L=V.kisiler[fid+'|'+sube]||[], o={}, cok=recs.length>1;
    function ekle(kodlar_,metin,uyari){ kodlar_.forEach(function(k){ (o[k]||(o[k]=[])).push({m:metin,u:!!uyari}); }); }
    var egtsiz=L.filter(function(p){ return !(p.egt||[]).some(function(y){ return y&&y.t; }); }).length;
    ekle(['i_gorev','i_dosya','i_sgk'],'Uygulamada kayıtlı kişi: '+L.length);
    if(egtsiz) ekle(['i_egitim','p_giris'],egtsiz+' kişide eğitim kaydı girilmemiş',true);
    if(oncekiTarih){ var giren=L.filter(function(p){ return p.giris&&p.giris>oncekiTarih; }).length; ekle(['p_hareket','p_giris'],'Uygulamadaki işe giriş tarihine göre '+H.vTr(oncekiTarih)+' sonrasında giren: '+giren,giren>0); }
    if(!recs.length) return o;
    var tum={f:recs,h:V.data.h,u:V.data.u,d:V.data.d}, dM={}; V.data.d.forEach(function(x){ dM[x.sicil]=x.docs; });
    recs.forEach(function(r){
      var on=cok?(r.sube||r.ad)+': ':'';
      var TS={aztehlikeli:'az tehlikeli',tehlikeli:'tehlikeli',coktehlikeli:'çok tehlikeli'};
      ekle(['i_nace','i_sure'],on+'Teksen: '+(TS[r.tehlike]||r.tehlike||'tehlike sınıfı yok')+(r.sure?' · kayıtlı süre: '+r.sure:''));
      ekle(['p_kurul'],on+'Teksen’deki çalışan sayısı: '+(r.calisan||'bilinmiyor'),r.calisan>=50);
      var dd=dM[r.sicil];
      if(!dd||!Object.keys(dd).length){ ekle(['p_klasor'],on+'belge bilgisi alınmamış'); return; }
      function belge(key,ad,k){ var e=H.docEval(key,dd[key],r.tehlike,bugun); ekle(k,on+ad+' (Teksen): '+e.msg,e.s!=='ok'); }
      belge('risk_analizi_dosya','Risk Analizi',['i_risk']); belge('acil_durum_dosya','Acil Durum Planı',['i_adep']); belge('calisma_plani_dosya','Çalışma Planı',['i_calisma']); belge('egitim_plani_dosya','Eğitim Planı',['i_egplan']);
      H.DTYPES.forEach(function(t){ var e=H.docEval(t[0],dd[t[0]],r.tehlike,bugun); if(e.s!=='ok') ekle(['p_klasor'],on+t[1]+': '+e.msg,true); });
    });
    H.visitStats(tum,bugun).forEach(function(v){ ekle(['p_hareket'],(cok?(v.f.sube||v.f.ad)+': ':'')+'Teksen’deki son ziyaret: '+(v.last?H.vTr(v.last):'kayıt yok')); });
    H.staffStats(tum,bugun).forEach(function(x){
      var on=cok?(x.f.sube||x.f.ad)+': ':'';
      x.pers.forEach(function(p){ ekle(['i_atama','p_cikis'],on+p.t+': görevli '+p.mev+', gereken '+p.gerekli+' (Teksen)',true); });
      if(x.egitim&&x.egEski) ekle(['i_egitim','p_giris'],on+'Teksen’e göre eğitim yenilenmeli (son '+H.vTr(x.egitim.d)+')',true);
      if(x.egitim&&x.egitim.eksik>0) ekle(['i_egitim','p_giris'],on+'Teksen’e göre eğitim almayan: '+x.egitim.eksik,true);
    });
    var sicil={}; recs.forEach(function(r){ sicil[r.sicil]=1; });
    var acik=V.data.u.filter(function(u){ return u.state==='acik'&&sicil[u.sicil]; });
    var gec=acik.filter(function(u){ return u.termin&&u.termin<bugun; }).length;
    ekle(['p_onceki'],'Teksen’de açık uygunsuzluk: '+acik.length+(gec?', termini geçmiş: '+gec:''),acik.length>0);
    acik.slice(0,15).forEach(function(u){ ekle(['p_onceki'],'• '+(u.tanim||'(tanım yok)')); });
    if(acik.length>15) ekle(['p_onceki'],'+'+(acik.length-15)+' uygunsuzluk daha (şube panosunda)');
    return o;
  }

  /* ---- Ekran ---- */
  function el(id){ return document.getElementById(id); }
  function yerAdi(UI,fid,sube){ var F=UI.firma(fid); return F?UI.firmaAd(F)+(sube?' · '+sube:''):''; }
  function dugme(UI,ad,fn,sinif){ var b=UI.E('button',sinif||'dugme',ad); b.type='button'; b.addEventListener('click',fn); return b; }
  function zAdres(id){ return '#zform/'+encodeURIComponent(id); }
  function satirBag(UI,yer,z){
    var a=UI.E('a','satir'); a.href=zAdres(z.id); a.appendChild(UI.E('b',null,z.ad));
    var e=eksikler(z).length, k=kalanlar(z).length;
    a.appendChild(UI.E('span',null,TUR[z.tur]+' · '+H.vTr(z.tarih)+' · '+(z.tamam?'tamamlandı':'devam ediyor')+(e?' · '+e+' eksik':'')+(z.tamam&&k>e?' · '+k+' iş sonraki ziyarete kaldı':'')));
    yer.appendChild(a);
  }

  /* Liste ve yeni ziyaret */
  function sayfa(UI,fid,sube){
    var E=UI.E, V=UI.veri(), ana=el('ana');
    UI.sayfa('Ziyaret','Yeni ziyaret başlatın veya kayıtlı bir ziyareti açın.');
    var o; try{ o=oku(); }catch(e){ ana.appendChild(E('p','bilgi uyari',e.message)); return; }
    ana.appendChild(E('p','not',window.Esitle.ziyaretNotu()+' Yeni uygulamadan alınan yedeğe girer; eski uygulamanın yedeğine girmez.'));
    if(!window.Kayit.onayli()) return;
    var firmalar=V.firmalar.filter(function(f){ return !f.pasif||f.id===fid; }).map(function(f){ return {f:f,ad:UI.firmaAd(f)}; }).sort(function(a,b){ return a.ad.localeCompare(b.ad,'tr'); });
    var kart=E('div','bilgi form'); ana.appendChild(kart);
    function alan(ad,x){ var l=E('label'); l.appendChild(E('span',null,ad)); l.appendChild(x); kart.appendChild(l); return l; }
    function secenek(s,v,y){ var op=E('option',null,y); op.value=v; s.appendChild(op); }
    var sF=E('select'), sS=E('select'), sT=E('select'), tarih=E('input'); tarih.type='date'; tarih.value=H.today(); tarih.max=H.today();
    secenek(sF,'','Firma seçin'); firmalar.forEach(function(x){ secenek(sF,x.f.id,x.ad); });
    alan('Firma',sF); alan('Şube',sS); alan('Ziyaret türü',sT); alan('Ziyaret tarihi',tarih);
    secenek(sT,'periyodik',TUR.periyodik); secenek(sT,'ilk',TUR.ilk);
    var durum=E('div'); kart.appendChild(durum);
    var hata=E('p','hata'); hata.setAttribute('role','alert');
    function subeDoldur(){
      sS.textContent=''; var F=UI.firma(sF.value); if(!F){ secenek(sS,'','Önce firma seçin'); return; }
      UI.birimler(F).forEach(function(u){ secenek(sS,u.sube,u.ad); });
    }
    function durumCiz(){
      durum.textContent=''; hata.textContent=''; basla.disabled=true; if(!UI.firma(sF.value)) return;
      var L=yerinde(oku(),sF.value,sS.value), acik=L.filter(function(z){ return !z.tamam; })[0];
      if(acik){ durum.appendChild(E('p','dikkat','Bu yerde tamamlanmamış bir ziyaret var:')); satirBag(UI,durum,acik); return; }
      basla.disabled=false;
      if(L[0]){ var k=kalanlar(L[0]).length; durum.appendChild(E('p',k?'dikkat':'not','Önceki ziyaret '+H.vTr(L[0].tarih)+(k?' · '+k+' iş yeni ziyarete taşınacak.':' · taşınacak iş yok.'))); }
    }
    var basla=dugme(UI,'Ziyareti başlat',function(){
      try{
        if(!/^\d{4}-\d{2}-\d{2}$/.test(tarih.value)||tarih.value>H.today()) throw new Error('Bugünü veya geçmiş bir tarihi seçin.');
        var L=yerinde(oku(),sF.value,sS.value); if(L[0]&&tarih.value<L[0].tarih) throw new Error('Bu yerde daha yeni tarihli bir ziyaret var ('+H.vTr(L[0].tarih)+').');
        var id=yeni(sF.value,sS.value,sT.value,yerAdi(UI,sF.value,sS.value),tarih.value); location.hash=zAdres(id);
      }catch(e){ hata.textContent=e.message||String(e); }
    },'dugme ana');
    kart.appendChild(hata); kart.appendChild(basla);
    function turOner(){ sT.value=sF.value&&yerinde(oku(),sF.value,sS.value).length===0&&!(V.lk.byUnit[sF.value+'|'+sS.value]||[]).length?'ilk':'periyodik'; }
    sF.addEventListener('change',function(){ subeDoldur(); turOner(); durumCiz(); }); sS.addEventListener('change',function(){ turOner(); durumCiz(); });
    if(fid&&UI.firma(fid)) sF.value=fid;
    subeDoldur(); if(fid&&Array.prototype.some.call(sS.options,function(x){ return x.value===sube; })) sS.value=sube;
    turOner(); durumCiz();

    var L=canli(o).sort(sirala), buYer=fid?L.filter(function(z){ return z.fid===fid&&z.sube===sube; }):L;
    function grup(b,l,bos){ ana.appendChild(E('h2',null,b)); var d=E('div','bilgi'); ana.appendChild(d); if(!l.length) d.appendChild(E('p','not',bos)); l.forEach(function(z){ satirBag(UI,d,z); }); }
    if(fid){ grup('Bu yerin ziyaretleri',buYer,'Henüz ziyaret yok.'); var tumu=E('a',null,'Tüm ziyaretleri göster'); tumu.href='#ziyaret'; ana.appendChild(tumu); }
    else { grup('Devam eden ziyaretler',L.filter(function(z){ return !z.tamam; }),'Devam eden ziyaret yok.'); grup('Tamamlanan ziyaretler',L.filter(function(z){ return z.tamam; }),'Henüz tamamlanan ziyaret yok.'); }
    var sil=o.list.filter(function(z){ return z.silindi; }).sort(sirala);
    if(sil.length&&!fid){
      var det=E('details'); det.appendChild(E('summary',null,'Silinen ziyaretler ('+sil.length+')')); ana.appendChild(det);
      sil.forEach(function(z){ var b=E('button','satir'); b.type='button'; b.appendChild(E('b',null,z.ad)); b.appendChild(E('span',null,TUR[z.tur]+' · '+H.vTr(z.tarih)+' · geri almak için dokunun'));
        b.addEventListener('click',function(){ if(!confirm(z.ad+' ziyareti geri alınsın mı?')) return; try{ if(!z.tamam&&yerinde(oku(),z.fid,z.sube).some(function(x){ return !x.tamam; })) throw new Error('Bu yerde tamamlanmamış başka bir ziyaret var.'); guncelle(z.id,function(x){ delete x.silindi; }); UI.ciz(); }catch(e){ alert(e.message||e); } }); det.appendChild(b); });
    }
  }

  function kopyala(metin,kutu_,durum){
    function olmadi(){ if(kutu_){ kutu_.focus(); kutu_.select(); } durum.textContent='Otomatik kopyalanamadı; metni seçip kopyalayın.'; }
    if(!navigator.clipboard||!navigator.clipboard.writeText){ olmadi(); return; }
    navigator.clipboard.writeText(metin).then(function(){ durum.textContent='Kopyalandı.'; },olmadi);
  }

  /* Diğer cihazdan gelen ve firması eşleşmeyen ziyaret: kullanıcı seçer */
  function yerSec(UI,ana,z,kaydet){
    var E=UI.E, kart=E('div','bilgi form'), l=E('label'), s=E('select'); l.appendChild(E('span',null,'Firma / şube')); l.appendChild(s); kart.appendChild(l);
    function secenek(v,y){ var op=E('option',null,y); op.value=v; s.appendChild(op); }
    secenek('','Seçin');
    var L=[]; UI.veri().firmalar.forEach(function(f){ UI.birimler(f).forEach(function(u){ L.push({fid:u.fid,sube:u.sube,ad:yerAdi(UI,u.fid,u.sube)}); }); });
    L.sort(function(a,b){ return a.ad.localeCompare(b.ad,'tr'); }).forEach(function(u,i){ secenek(String(i),u.ad); });
    kart.appendChild(dugme(UI,'Bu yere bağla',function(){
      var u=L[s.value]; if(s.value===''||!u) return;
      if(!confirm('“'+z.ad+'” ziyareti “'+u.ad+'” yerine bağlansın mı?')) return;
      if(kaydet(function(x){ x.fid=u.fid; x.sube=u.sube; delete x.yer; })) UI.ciz();
    },'dugme ana'));
    ana.appendChild(kart);
  }

  /* Ziyaret formu */
  function formSayfa(UI,id){
    var E=UI.E, V=UI.veri(), ana=el('ana'), z;
    try{ z=canli(oku()).filter(function(x){ return x.id===id; })[0]; }catch(e){ UI.sayfa('Ziyaret formu','Kayıt açılamadı.',[['Ziyaret','#ziyaret']]); ana.appendChild(E('p','bilgi uyari',e.message)); return; }
    if(!z){ location.replace('#ziyaret'); return; }
    UI.sayfa(z.ad,TUR[z.tur]+' · '+H.vTr(z.tarih)+(z.tamam?' · tamamlandı':' · yazdıklarınız kendiliğinden kaydedilir'),[['Ziyaret','#ziyaret']]);
    if(!window.Kayit.onayli()) return;
    var sayac=E('p','bilgi'); sayac.setAttribute('role','status'); ana.appendChild(sayac);
    var hata=E('p','hata z-hata'); hata.setAttribute('role','alert');
    function kaydet(fn){ try{ z=guncelle(id,fn); hata.textContent=''; sayacCiz(); return true; }catch(e){ hata.textContent=e.message||String(e); alert(hata.textContent); return false; } }
    function sayacCiz(){ var n=kodlar(z.tur).length+z.devir.length, b=isaretsiz(z).length; sayac.textContent=n+' işten '+(n-b)+' tanesi işaretlendi · '+eksikler(z).length+' eksik'; }
    var onceki=yerinde(oku(),z.fid,z.sube).filter(function(x){ return x.id!==z.id&&x.tarih<=z.tarih; })[0];
    var F=UI.firma(z.fid), ip=F?ipuclari(V,z.fid,z.sube,onceki?onceki.tarih:''):{};
    if(!F){ ana.appendChild(E('p','bilgi uyari','Bu ziyaretin firması bu cihazda kesin olarak bulunamadı; hatırlatmalar gösterilemiyor. Hangi firma/şube olduğunu biliyorsanız aşağıdan seçin.')); yerSec(UI,ana,z,kaydet); }
    else ana.appendChild(E('p','not','Hatırlatmalar bu cihazdaki güncel kayıtlardan gelir; ziyaret tarihindeki durumu göstermeyebilir.'));
    var alanlar=E('fieldset','secimler'); alanlar.disabled=z.tamam; ana.appendChild(alanlar);

    function isKarti(yer,baslik,aciklama,oncekiBilgi,hatirlatma,al,ayarla){
      var k=E('div','z-is'); k.appendChild(E('b',null,baslik)); if(aciklama) k.appendChild(E('small',null,aciklama));
      if(oncekiBilgi) k.appendChild(E('p','dikkat',H.vTr(oncekiBilgi.tarih)+' ziyaretinden kalan'+(oncekiBilgi.not?': '+oncekiBilgi.not:'')));
      if(hatirlatma&&hatirlatma.length){
        var uy=hatirlatma.some(function(h){ return h.u; }), det=E('details'); det.appendChild(E('summary',uy?'dikkat':null,'Hatırlatma ('+hatirlatma.length+')'));
        hatirlatma.forEach(function(h){ det.appendChild(E('p',h.u?'dikkat':'not',h.m)); }); k.appendChild(det);
      }
      var s=E('div','z-durum'); s.setAttribute('role','group'); s.setAttribute('aria-label',baslik);
      var bs={}; Object.keys(DURUM).forEach(function(d){
        var b=E('button','z-'+d,DURUM[d]); b.type='button'; bs[d]=b; s.appendChild(b);
        b.addEventListener('click',function(){ var yeniD=al().d===d?'':d; if(kaydet(function(x){ ayarla(x,'d',yeniD); })) boya(); });
      });
      function boya(){ Object.keys(bs).forEach(function(d){ bs[d].setAttribute('aria-pressed',al().d===d?'true':'false'); }); }
      k.appendChild(s);
      var not_=E('textarea','z-not'); not_.rows=1; not_.placeholder='Not'; not_.setAttribute('aria-label',baslik+' notu'); not_.value=al().n||''; if(not_.value) not_.rows=2;
      not_.addEventListener('input',function(){ var v=not_.value; kaydet(function(x){ ayarla(x,'n',v); }); }); k.appendChild(not_);
      boya(); yer.appendChild(k);
    }
    if(z.devir.length){
      alanlar.appendChild(E('h2',null,'Önceki ziyaretten kalan diğer işler'));
      z.devir.forEach(function(x,i){ isKarti(alanlar,adimAd(x.kod),'',{tarih:x.tarih,not:x.not},ip[x.kod],function(){ return z.devir[i]; },function(y,a,v){ y.devir[i][a]=v; }); });
    }
    ADIM[z.tur].forEach(function(b){
      alanlar.appendChild(E('h2',null,b[0]));
      b.slice(1).forEach(function(a){ var kod=a[0]; isKarti(alanlar,a[1],a[2],(z.onceki||{})[kod],ip[kod],function(){ return z.adimlar[kod]||{}; },function(y,al_,v){ var c=y.adimlar[kod]||(y.adimlar[kod]={d:'',n:''}); c[al_]=v; }); });
    });

    alanlar.appendChild(E('h2',null,'Sahada tespit edilen uygunsuzluk ve öneriler'));
    var tespit=E('textarea','z-metin'); tespit.rows=6; tespit.value=z.tespit||''; tespit.placeholder='Her satıra bir tespit veya öneri yazın.'; tespit.setAttribute('aria-label','Sahada tespit edilen uygunsuzluk ve öneriler');
    tespit.addEventListener('input',function(){ kaydet(function(x){ x.tespit=tespit.value; }); }); alanlar.appendChild(tespit);

    ana.appendChild(E('h2',null,'Onaylı Defter taslağı'));
    ana.appendChild(E('p','not','Taslak, tespit satırlarınızdan ve “Eksik” işaretlediğiniz işlerle notlarından oluşur. Deftere yazmadan önce okuyup düzeltin; eksikler listesinde deftere girmemesi gerekenler olabilir. Uygulama deftere veya Teksen’e bir şey göndermez.'));
    var defter=E('textarea','z-metin'); defter.rows=10; defter.value=z.defter||''; defter.readOnly=z.tamam; defter.setAttribute('aria-label','Onaylı Defter taslağı');
    defter.addEventListener('input',function(){ if(!z.tamam) kaydet(function(x){ x.defter=defter.value; }); });
    var dDurum=E('p','durum'); dDurum.setAttribute('role','status');
    var d1=E('div','islemler');
    if(!z.tamam) d1.appendChild(dugme(UI,'Taslağı oluştur',function(){
      var m=defterTaslagi(z); if(defter.value.trim()&&defter.value!==m&&!confirm('Defter metnindeki değişiklikleriniz silinip taslak yeniden oluşturulsun mu?')) return;
      if(kaydet(function(x){ x.defter=m; })){ defter.value=m; dDurum.textContent='Taslak oluşturuldu.'; }
    },'dugme ana'));
    d1.appendChild(dugme(UI,'Defter metnini kopyala',function(){ if(!defter.value.trim()){ dDurum.textContent='Önce taslağı oluşturun veya metni yazın.'; return; } kopyala(defter.value,defter,dDurum); }));
    ana.appendChild(d1); ana.appendChild(defter); ana.appendChild(dDurum);

    ana.appendChild(E('h2',null,'Ziyareti bitir'));
    ana.appendChild(hata);
    var d2=E('div','islemler'), oDurum=E('p','durum'); oDurum.setAttribute('role','status');
    var oAlan=E('textarea','z-metin'); oAlan.rows=8; oAlan.readOnly=true; oAlan.hidden=true; oAlan.setAttribute('aria-label','Ziyaret özeti');
    if(z.tamam) d2.appendChild(dugme(UI,'Yeniden düzenlemeye aç',function(){
      try{ if(yerinde(oku(),z.fid,z.sube).some(function(x){ return !x.tamam; })) throw new Error('Bu yerde tamamlanmamış başka bir ziyaret var. Önce onu tamamlayın veya silin.'); }catch(e){ alert(e.message); return; }
      if(yerinde(oku(),z.fid,z.sube)[0].id!==z.id&&!confirm('Bu yerde daha yeni bir ziyaret var. Burada yapacağınız değişiklik, yeni ziyarete taşınmış listeyi değiştirmez. Açılsın mı?')) return;
      if(kaydet(function(x){ x.tamam=false; })) UI.ciz();
    },'dugme ana'));
    else d2.appendChild(dugme(UI,'Ziyareti tamamla',function(){
      var b=isaretsiz(z).length, m='Ziyaret tamamlansın mı?';
      if(b) m=b+' iş işaretlenmedi. Yeni işaretlenmeyenler sonraki ziyarete “eksik” olarak taşınmaz (önceki ziyaretten kalanlar taşınır). Yine de tamamlansın mı?';
      if(confirm(m)&&kaydet(function(x){ x.tamam=true; })) UI.ciz();
    },'dugme ana'));
    d2.appendChild(dugme(UI,'Ziyaret özetini kopyala',function(){ oAlan.value=ozetMetni(z); oAlan.hidden=false; kopyala(oAlan.value,oAlan,oDurum); }));
    d2.appendChild(dugme(UI,'Ziyareti sil',function(){ if(!confirm('Bu ziyaret silinsin mi? Ziyaret sayfasındaki “Silinen ziyaretler” bölümünden geri alabilirsiniz.')) return; if(kaydet(function(x){ x.silindi=Date.now(); })) location.hash='#ziyaret'; }));
    ana.appendChild(d2); ana.appendChild(oDurum); ana.appendChild(oAlan);
    sayacCiz();
  }

  /* Ana sayfa ve pano kutularının alt yazısı */
  function durumYazi(fid,sube){
    try{
      var L=fid==null?canli(oku()).sort(sirala):yerinde(oku(),fid,sube), a=L.filter(function(z){ return !z.tamam; }).length;
      if(fid==null) return a?a+' ziyaret devam ediyor':'ilk veya periyodik ziyaret adımları';
      if(!L.length) return 'henüz ziyaret formu yok';
      if(a) return 'devam eden ziyaret var';
      var k=kalanlar(L[0]).length; return 'son: '+H.vTr(L[0].tarih)+(k?' · '+k+' iş kaldı':'');
    }catch(e){ return 'kayıtlar okunamadı'; }
  }

  return {ANAHTAR:ANAHTAR,ADIM:ADIM,coz:coz,oku:oku,birlestir:birlestir,kalanlar:kalanlar,yeni:yeni,defterTaslagi:defterTaslagi,ozetMetni:ozetMetni,sayfa:sayfa,formSayfa:formSayfa,durumYazi:durumYazi};
})();

/* Kerem İGU: ekranlar. Her sayfa aynı şablonu kullanır: başlık + tek cümle + kutular; ayrıntı açılır pencerede. */
(function(){
  var H=window.Hesap, K=window.Kayit, V=null, OZ=null, UY={}, PASIF=false, ARA='';
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
    if(!K.onayli()) onayKutusu();
  }
  function onayKutusu(){
    var d=E('div','bilgi uyari');
    d.appendChild(E('p',null,'Kayıt işlemleri kapalı. Açılınca Teksen’deki eksik firma ve şubeler otomatik kaydedilir, elle kayıt da yapabilirsiniz. Önce: (1) eski uygulamayı yenileyin ve altta “Sürüm 235” yazdığını görün, (2) aşağıdaki düğmeyle ya da eski uygulamadan yedek indirin, (3) eski uygulamanın açık diğer sekmelerini kapatın.'));
    var b=E('button','dugme ana','Yedek aldım, kayıtları başlat'); b.type='button'; b.addEventListener('click',function(){ try{ K.onayla(); yukle(); }catch(e){ alert(e.message||e); } }); var y=E('button','dugme','Önce yedek al'); y.type='button'; y.addEventListener('click',yedekPenceresi); var s=E('div','islemler'); s.appendChild(y); s.appendChild(b); d.appendChild(s); ana.appendChild(d);
  }
  function islem(ad,fn){ var b=E('button','dugme ana',ad); b.type='button'; b.addEventListener('click',fn); var s=ana.querySelector('.islemler'); if(!s){ s=E('div','islemler'); ana.insertBefore(s,ana.querySelector('.aciklama').nextSibling); } s.appendChild(b); }
  /* alanlar: [{k,ad,deger,tur,kilit,not}] ; kaydet(değerler) hata fırlatırsa pencerede gösterilir */
  function form(baslik,alanlar,kaydet){
    penB.textContent=baslik; penI.textContent='';
    var f=E('form','form'), G={}, hata=E('p','hata'); hata.setAttribute('role','alert');
    alanlar.forEach(function(a){ var l=E('label'); l.appendChild(E('span',null,a.ad)); var i=E('input'); i.type=a.tur||'text'; i.value=a.deger||''; i.autocomplete='off'; if(a.kilit) i.readOnly=true; G[a.k]=i; l.appendChild(i); if(a.not) l.appendChild(E('small',null,a.not)); f.appendChild(l); });
    var b=E('button','dugme ana','Kaydet'); b.type='submit'; f.appendChild(hata); f.appendChild(b);
    f.addEventListener('submit',function(ev){ ev.preventDefault(); var v={}; Object.keys(G).forEach(function(k){ v[k]=G[k].value; }); var git;
      try{ git=kaydet(v); }catch(e){ hata.textContent=e.message||String(e); return; }
      pen.close(); if(git) history.replaceState(null,'',git); yukle(); });
    penI.appendChild(f); if(!pen.open) pen.showModal();
  }
  var SGKNOT='İsteğe bağlı. Yazarsanız aynı numaralı Teksen kaydı bu yere bağlanır.', KILIT='Teksen kaydı bu numarayla bağlı olduğu için değiştirilemez.';
  function bilgiAlan(inf,kilit){ inf=inf||{}; return [{k:'sgk',ad:'SGK sicil no',deger:inf.sgk,kilit:kilit,not:kilit?KILIT:SGKNOT},{k:'adr',ad:'Adres',deger:inf.adr}]; }
  function yazilabilir(F){ return K.onayli()&&!K.akkurt(F.name); }

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
      var d=E(s.href?'a':(s.tik?'button':'div'),'satir'); if(s.tik){ d.type='button'; d.addEventListener('click',s.tik); } if(s.href){ d.href=s.href; d.addEventListener('click',function(){ pen.close(); }); }
      d.appendChild(E('b',null,s.b)); if(s.a) d.appendChild(E('span',null,s.a)); penI.appendChild(d);
    });
    pen.showModal(); penI.scrollTop=0;
  }
  document.getElementById('pencere-kapat').addEventListener('click',function(){ if(!yukleniyor) pen.close(); });
  pen.addEventListener('click',function(e){ if(e.target===pen&&!yukleniyor) pen.close(); });
  pen.addEventListener('cancel',function(e){ if(yukleniyor) e.preventDefault(); });

  function panoAdres(fid,sb){ return '#pano/'+encodeURIComponent(fid)+'/'+encodeURIComponent(sb||''); }
  function recSatir(m){ var l=V.lk.byRec[m.f.sicil]; return {b:recAd(m.f), a:(m.why.join(' · ')||'uyarı yok'), href:l?panoAdres(l.fid,l.sube):null}; }

  function veriYok(){
    if(V.data.f.length) return false;
    ana.appendChild(E('p','bilgi','Bu tarayıcıda kayıtlı Teksen verisi yok. Aşağıdaki “Teksen verisi al” düğmesini kullanın.'));
    ana.appendChild(dugme('Teksen verisi al',teksenPenceresi));
    return true;
  }

  function sirali(){ return OZ.rows.slice().sort(function(a,b){ return (b.pts-a.pts)||H.trd(a.f.ad||'').localeCompare(H.trd(b.f.ad||''),'tr'); }); }
  function kategoriler(){
    var c=OZ.c, uyarili=sirali().filter(function(m){ return m.why.length; });
    return [['Ziyareti gecikmiş',c.gec,function(m){ return m.v.state==='gec'; }],
     ['Hiç ziyareti yok',c.yok,function(m){ return m.v.state==='yok'; }],
     ['Süresi geçmiş uygunsuzluk',c.ug,function(m){ return m.ug>0; }],
     ['Belge uyarısı',c.doc,function(m){ return m.docBad>0; }],
     ['Görevlendirme eksik',c.pers,function(m){ return m.st&&m.st.pers.length; }],
     ['Eğitim kaydı yok',c.egy,function(m){ return m.eyok; }],
     ['Eğitim yenilenmeli',c.eyen,function(m){ return m.eyen; }],
     ['Kişi eğitimi yenilenmeli',c.kyen,function(m){ return m.kyen; }]
    ].map(function(x){ return {ad:x[0],sayi:x[1],tik:function(){ ac(x[0],uyarili.filter(x[2]).map(recSatir),'Bu başlıkta uyarı yok.'); }}; });
  }

  /* ---- Ana sayfa ---- */
  function bolum(ad){ ana.appendChild(E('h2',null,ad)); return izgara(); }
  function sonTeksen(){ var s=V.data.meta.filter(function(m){ return m.k==='son'; })[0], t=s&&s.t?new Date(s.t):null; return t&&!isNaN(t)?'son alım '+t.toLocaleDateString('tr-TR'):'henüz veri alınmadı'; }
  function sonYedek(){ var t=0; try{ t=parseInt(localStorage.getItem('isg-lastbk')||'0',10)||0; }catch(e){} return t; }
  function yedekYazi(){ var t=sonYedek(); if(!t) return 'henüz yedek alınmadı'; var g=Math.floor((Date.now()-t)/864e5); return g<1?'son yedek bugün':'son yedek '+g+' gün önce'; }
  function anaSayfa(){
    sayfa('Ana sayfa','Günün uyarılarını görün, yapmak istediğiniz işi seçin.');
    if(V.eklenen) ana.appendChild(E('p','bilgi',V.eklenen+' Teksen kaydı firma/şube olarak kaydedildi.'));
    var g=bolum('Bugün');
    if(!V.data.f.length) g.appendChild(E('p','bilgi','Bu tarayıcıda kayıtlı Teksen verisi yok.'));
    else{
      var dolu=kategoriler().filter(function(x){ return x.sayi; });
      dolu.forEach(function(x){ kutu(g,{sayi:x.sayi,ad:x.ad,alt:'firma/şube',ton:'uyari',tik:x.tik}); });
      kutu(g,{ad:'Tüm uyarılar',alt:dolu.length?'öncelikli liste':'uyarı yok',ton:dolu.length?'':'iyi',href:'#bugun'});
    }
    g=bolum('İşler');
    kutu(g,{ad:'Teksen verisi al',alt:sonTeksen(),tik:teksenPenceresi});
    var nF=V.firmalar.filter(function(f){ return !f.pasif; }).length;
    kutu(g,{ad:'Firmalar',alt:nF+' firma · şubeler ve panolar',href:'#firmalar'});
    kutu(g,{ad:'Personel',alt:window.Personel.say(UI)+' kişi · eğitim durumları',href:'#personel'});
    [['Evrak','firma ve personel evrakları, planlar'],['Eğitim','katılım formu, sınav, rehber ve afiş'],['Raporlar','raporlar ve belge sayıları']].forEach(function(x){ kutu(g,{ad:x[0],alt:'Hazırlanıyor · '+x[1],ton:'bekliyor'}); });
    var gec=!sonYedek()||Date.now()-sonYedek()>=7*864e5;
    kutu(g,{ad:'Ayarlar ve yedek',alt:yedekYazi(),ton:gec?'uyari':'',href:'#ayarlar'});
  }

  /* ---- Ayarlar ve yedek ---- */
  function ayarSayfa(){
    sayfa('Ayarlar ve yedek','Teksen verisi alın, yedek alın veya bir yedekten geri yükleyin.');
    var g=izgara();
    kutu(g,{ad:'Teksen verisi al',alt:sonTeksen(),tik:teksenPenceresi});
    kutu(g,{ad:'Yedek al',alt:yedekYazi(),tik:yedekPenceresi});
    kutu(g,{ad:'Yedekten geri yükle',alt:'bu cihazdaki kayıtların üzerine yazar',tik:geriPenceresi});
    kutu(g,{ad:'Diğer ayarlar',alt:'Hazırlanıyor',ton:'bekliyor'});
    ana.appendChild(E('p','not','Yedek dosyasında kişisel bilgiler bulunur. Güvenli bir yerde saklayın; GitHub gibi herkese açık yerlere yüklemeyin. Eski ve yeni uygulama aynı yedek dosyasını kullanır.'));
  }
  function pencereAc(baslik){ penB.textContent=baslik; penI.textContent=''; if(!pen.open) pen.showModal(); }
  function dugme(ad,fn){ var b=E('button','dugme ana',ad); b.type='button'; b.addEventListener('click',fn); return b; }
  /* Yedek indirme düğmesi; indirme başlayınca sonra() çağrılır */
  function indirDugmesi(yer,ad,sonra){
    var durum=E('p','durum'); durum.setAttribute('role','status');
    var b=dugme(ad,function(){ b.disabled=true; durum.className='durum'; durum.textContent='Yedek hazırlanıyor…';
      window.Yedek.indir().then(function(r){ durum.textContent='İndirme başlatıldı: '+r.ad+' ('+r.ozet+'). Dosyanın indirilenler klasörüne geldiğini kontrol edin.'; if(sonra) sonra(); },function(e){ durum.className='durum hata'; durum.textContent=e&&e.message||String(e); }).then(function(){ b.disabled=false; }); });
    yer.appendChild(b); yer.appendChild(durum);
  }
  function yedekPenceresi(){ pencereAc('Yedek al'); penI.appendChild(E('p',null,'Tüm kayıtlarınız tek bir dosya olarak bu cihaza indirilir.')); indirDugmesi(penI,'Yedeği indir',null); }
  var yukleniyor=false;
  function geriPenceresi(){
    pencereAc('Yedekten geri yükle');
    penI.appendChild(E('p',null,'Başlamadan eski uygulamanın açık sekmelerini kapatın. Yedek dosyasını seçin; siz onaylamadan hiçbir şey değişmez.'));
    var i=E('input'); i.type='file'; i.accept='.json,application/json'; i.setAttribute('aria-label','Yedek dosyası seç'); var alan=E('div'); penI.appendChild(i); penI.appendChild(alan);
    i.addEventListener('change',function(){
      var f=i.files&&i.files[0]; alan.textContent=''; if(!f) return;
      f.text().then(function(t){
        var o=window.Yedek.coz(t), t2=new Date(o.date);
        alan.appendChild(E('p','bilgi uyari','Seçilen yedek: '+(isNaN(t2)?'tarihi bilinmiyor':t2.toLocaleString('tr-TR'))+' · '+window.Yedek.ozet(o)+'. Yedekte bulunan bölümler bu cihazdakilerin yerine geçer; o tarihten sonra girdikleriniz kaybolur.'));
        var git=dugme('2) Geri yükle',function(){
          if(!confirm('Bu cihazdaki kayıtlar seçtiğiniz yedekle değiştirilsin mi?')) return;
          git.disabled=true; yukleniyor=true; sonuc.className='durum'; sonuc.textContent='Geri yükleniyor, sayfayı kapatmayın…';
          window.Yedek.geriYukle(o).then(function(){ sonuc.textContent='Geri yüklendi. Sayfa yenileniyor…'; setTimeout(function(){ location.reload(); },900); },function(e){ yukleniyor=false; git.disabled=false; sonuc.className='durum hata'; sonuc.textContent=e&&e.message||String(e); });
        });
        var sonuc=E('p','durum'); sonuc.setAttribute('role','status'); git.disabled=true;
        var bosMu=!localStorage.getItem('isg-firms-v1')&&!V.data.f.length;
        if(bosMu) git.disabled=false; else indirDugmesi(alan,'1) Önce şimdiki verilerin yedeğini indir',function(){ git.disabled=false; });
        alan.appendChild(git); alan.appendChild(sonuc);
      }).catch(function(e){ alan.appendChild(E('p','durum hata',e&&e.message||String(e))); });
    });
  }

  /* ---- Teksen verisi alma: önce özet, sonra yedek, en son kayıt ---- */
  function teksenPenceresi(){
    pencereAc('Teksen verisi al');
    if(!K.onayli()){ penI.appendChild(E('p','bilgi uyari','Kayıt işlemleri kapalı. Önce bu pencereyi kapatın ve sayfanın üstündeki “Yedek aldım, kayıtları başlat” adımını tamamlayın.')); return; }
    var T=window.Teksen;
    penI.appendChild(E('p',null,'Teksen’de “Teksen’den al” yer imini çalıştırın, kopyalanan metni buraya yapıştırın. Pano çalışmazsa inen teksenisg_veri.json dosyasını seçin. Teksen’de hiçbir şey değişmez.'));
    var f=E('div','form'), l=E('label'); l.appendChild(E('span',null,'Yer imi çıktısı')); var ta=E('textarea'); ta.rows=5; ta.placeholder='{"tsg":3, ...}'; l.appendChild(ta); f.appendChild(l); penI.appendChild(f);
    var fl=E('input'); fl.type='file'; fl.accept='.json,application/json,text/plain'; fl.setAttribute('aria-label','Teksen JSON dosyası seç'); penI.appendChild(fl);
    var il=E('label','secim'), cb=E('input'); cb.type='checkbox'; il.appendChild(cb); il.appendChild(document.createTextNode(' İrtibat bilgilerini de al (yetkili adı, telefon, e-posta)')); penI.appendChild(il);
    var dosya=null, no=0, alan=E('div');
    function temizle(){ no++; alan.textContent=''; }
    var goster=dugme('Özeti göster',function(){
      temizle(); var n=no, P, opt={irtibat:cb.checked};
      try{ P=T.parse(dosya!=null?dosya:ta.value); }catch(e){ alan.appendChild(E('p','durum hata',e.message||String(e))); return; }
      window.Veri.teksen().then(function(d){
        if(n!==no) return;
        var out=T.hesapla(P,opt,{firms:d.f,hizmet:d.h,uyg:d.u,docs:d.d,meta:d.meta},V.firmalar,T.today()), R=out.R, bosMu=T.bos(out);
        alan.appendChild(E('h3',null,'Özet (henüz hiçbir şey kaydedilmedi)'));
        raporYaz(alan,R);
        if(bosMu){ alan.appendChild(E('p','durum hata','Kaydedilecek Teksen kaydı yok.')); return; }
        alan.appendChild(E('p','not','Bu işlem hiçbir kaydı silmez. Aynı kayıtlar güncellenir, yeniler eklenir.'));
        var sonuc=E('p','durum'); sonuc.setAttribute('role','status');
        var git=dugme('2) Onaylıyorum, kaydet',function(){
          git.disabled=true; goster.disabled=true; yukleniyor=true; sonuc.className='durum'; sonuc.textContent='Kaydediliyor, sayfayı kapatmayın…';
          /* Firma listesi kayıt anında yeniden okunur */
          window.Veri.oku().then(function(v){ if(v.hata.length) throw new Error(v.hata.join(' ')); return T.kaydet(P,opt,v.firmalar); }).then(function(R2){
            yukleniyor=false; try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
            return yukle().then(function(){
              pencereAc('Teksen verisi kaydedildi'); raporYaz(penI,R2);
              if(V.eklenen) penI.appendChild(E('p','bilgi',V.eklenen+' Teksen kaydı firma/şube olarak kaydedildi.'));
              V.hata.forEach(function(h){ penI.appendChild(E('p','bilgi uyari',h)); });
            });
          }).catch(function(e){ yukleniyor=false; git.disabled=false; goster.disabled=false; sonuc.className='durum hata'; sonuc.textContent='Kaydedilemedi, Teksen verisi değişmedi: '+(e&&e.message||e); });
        });
        git.disabled=true;
        var kayitYok=!d.f.length&&!localStorage.getItem('isg-firms-v1');
        if(kayitYok) git.disabled=false; else indirDugmesi(alan,'1) Önce yedeği indir',function(){ git.disabled=false; });
        alan.appendChild(git); alan.appendChild(sonuc);
      }).catch(function(e){ if(n===no) alan.appendChild(E('p','durum hata','Kayıtlı Teksen verisi okunamadı: '+(e&&e.message||e))); });
    });
    penI.appendChild(goster); penI.appendChild(alan);
    ta.addEventListener('input',function(){ dosya=null; fl.value=''; temizle(); });
    cb.addEventListener('change',temizle);
    fl.addEventListener('change',function(){
      var d=fl.files&&fl.files[0]; temizle(); dosya=null; if(!d) return; var n=no; ta.value='';
      d.text().then(function(t){ if(n!==no) return; dosya=t; goster.click(); },function(){ alan.appendChild(E('p','durum hata','Dosya okunamadı.')); });
    });
  }
  function raporYaz(yer,R){
    function satir(x,c){ yer.appendChild(E('p',c||null,x)); }
    satir((R.mod===3?'Tüm firmalar':'Tek firma')+(R.ilk?' · ilk alma':'')+'. Firma/şube: '+R.firmaIslendi+' ('+R.firmaYeni+' yeni, '+R.firmaGuncel+' güncellenen).');
    satir('Hizmet: '+R.hizmetYeni+' yeni, '+R.hizmetDegisen+' değişen. Uygunsuzluk: '+R.uygYeni+' yeni, '+R.uygKapanan+' kapanan'+(R.uygYenidenAcilan?', '+R.uygYenidenAcilan+' yeniden açılan':'')+'.');
    satir('İşlemden sonra açık uygunsuzluk: '+R.acik+', termini geçmiş: '+R.gecikmis+'.');
    if(R.akkurtAtlanan) satir('Akkurtlar: '+R.akkurtAtlanan+' kayıt atlandı, mevcut Akkurtlar verisi değişmez. Güncellemek için eski uygulamadan veri alın.','dikkat');
    if(R.uygGorunmeyen) satir(R.uygGorunmeyen+' açık uygunsuzluk bu alışta hiç gelmedi. Silinmez ve kapatılmaz, “görünmedi” diye işaretlenir.','dikkat');
    if(R.hatali) satir('Okunamayan firma: '+R.hatali+' (yer imi bunları alamadı, yeniden deneyin).','dikkat');
    if(R.sicilsiz) satir('SGK sicil numarası olmadığı için atlanan: '+R.sicilsiz+'.','dikkat');
    if(R.listeEslesmeyen) satir('Firma listesinde bulunamayan: '+R.listeEslesmeyen+'.','not');
    if(R.degisim&&R.degisim.length){
      var d=E('details'); d.appendChild(E('summary',null,'Değişiklikler ('+R.degisim.length+' firma/şube)'));
      R.degisim.forEach(function(x){ var s=E('div','satir'); s.appendChild(E('b',null,x.ad+(x.sb?' · '+x.sb:''))); s.appendChild(E('span',null,x.ne.join('; ')+(x.fazla?' (+'+x.fazla+' değişiklik daha)':''))); d.appendChild(s); });
      yer.appendChild(d);
    }
  }

  /* ---- Bugün ---- */
  function bugunSayfa(){
    sayfa('Bugün','Hangi firma ve şubelerde bakılması gereken bir iş olduğunu gösterir.');
    if(veriYok()) return;
    islem('Teksen verisi al',teksenPenceresi);
    if(V.eklenen) ana.appendChild(E('p','bilgi',V.eklenen+' Teksen kaydı firma/şube olarak kaydedildi.'));
    if(K.onayli()&&V.lk.unmatched.length) ana.appendChild(E('p','bilgi uyari',V.lk.unmatched.length+' Teksen kaydı kaydedilemedi (firma adı eksik olabilir): '+V.lk.unmatched.slice(0,5).map(function(r){ return recAd(r)+' (sicil '+r.sicil+')'; }).join(', ')+(V.lk.unmatched.length>5?' …':'')));
    var g=izgara(), rows=sirali();
    kutu(g,{sayi:rows.filter(function(m){ return m.pts>0; }).length,ad:'Öncelikli liste',alt:'en önemliden başlar',tik:function(){ ac('Öncelikli liste',rows.filter(function(m){ return m.pts>0; }).map(recSatir),'Uyarı yok.'); }});
    kategoriler().forEach(function(x){ kutu(g,{sayi:x.sayi,ad:x.ad,alt:'firma/şube',ton:x.sayi?'uyari':'iyi',tik:x.tik}); });
    var son=V.data.meta.filter(function(m){ return m.k==='son'; })[0];
    if(son&&son.t) ana.appendChild(E('p','not','Teksen verisi en son '+new Date(son.t).toLocaleString('tr-TR')+' tarihinde alındı.'));
  }

  function duz(x){ return H.trd(x).replace(/ı/g,'i'); }
  /* Aramada Türkçe harfler sade karşılıklarıyla da eşleşir */
  function sade(x){ return H.trd(x).replace(/[çğıöşü]/g,function(c){ return 'cgiosu'['çğıöşü'.indexOf(c)]; }); }

  /* ---- Firmalar ---- */
  function firmalarSayfa(){
    sayfa('Firmalar','Bir firmaya dokunarak şubelerini görün.');
    var q=E('input','ara'); q.type='search'; q.placeholder='Firma veya şube ara'; q.setAttribute('aria-label','Firma veya şube ara'); q.value=ARA; ana.appendChild(q);
    var pasifN=V.firmalar.filter(function(f){ return f.pasif; }).length+V.firmalar.reduce(function(t,f){ return t+Object.keys(f.sbp||{}).length; },0);
    if(pasifN){ var l=E('label','secim'), cb=E('input'); cb.type='checkbox'; cb.checked=PASIF; cb.addEventListener('change',function(){ PASIF=cb.checked; firmalarSayfa(); }); l.appendChild(cb); l.appendChild(document.createTextNode(' Pasif / arşiv olanları da göster ('+pasifN+')')); ana.appendChild(l); }
    if(K.onayli()) islem('+ Firma ekle',function(){ form('Firma ekle',[{k:'ad',ad:'Firma adı'}].concat(bilgiAlan()),function(v){ return '#firma/'+encodeURIComponent(K.firmaEkle(v)); }); });
    if(K.onayli()) islem('Silinenler',silinenYerlerPenceresi);
    var g=izgara();
    function ciz(){
      g.textContent=''; var s=sade(ARA).trim();
      var list=V.firmalar.filter(function(f){ return PASIF||!f.pasif; }).map(function(f){ return {f:f,ad:firmaAd(f),b:birimler(f)}; })
        .filter(function(x){ return !s||sade(x.ad+' '+(x.f.name||'')+' '+x.b.map(function(u){ return u.ad+' '+u.recs.map(recAd).join(' '); }).join(' ')).indexOf(s)>=0; })
        .sort(function(a,b){ return a.ad.localeCompare(b.ad,'tr'); });
      list.forEach(function(x){
        var recs=[]; x.b.forEach(function(u){ recs=recs.concat(u.recs); }); var w=uyariSay(recs);
        var sb=x.b.filter(function(u){ return u.sube; }).length;
        kutu(g,{ad:x.ad,alt:(sb?sb+' şube':'şubesiz')+' · '+(!recs.length?'Teksen kaydı eşleşmedi':(w?w+' uyarı':'uyarı yok'))+(x.f.arsiv?' · arşiv':x.f.pasif?' · pasif':'')+(x.f.name&&duz(x.f.name)!==duz(x.ad)?' · kayıtlı ad: '+x.f.name:''),ton:w?'uyari':'',href:'#firma/'+encodeURIComponent(x.f.id)});
      });
      if(!list.length) g.appendChild(E('p','bilgi',V.firmalar.length?'Aramaya uyan firma yok.':'Bu tarayıcıda kayıtlı firma yok. Bu sayfayı eski uygulamayla aynı adresten ve aynı tarayıcıda açın.'));
    }
    q.addEventListener('input',function(){ ARA=q.value; ciz(); }); ciz();
  }

  /* O yerdeki SGK numarasıyla eşleşen bir Teksen kaydı var mı? */
  function bagli(fid,sb){ var F=firma(fid), inf=(sb?(F.sbi||{})[sb]:F.info)||{}, k=String(inf.sgk||'').replace(/\D/g,''); return !!k&&(V.lk.byUnit[fid+'|'+sb]||[]).some(function(r){ return String(r.sicil).replace(/\D/g,'')===k; }); }

  /* ---- Pasife alma, arşivleme, silme ---- */
  function uygula(fn){ try{ fn(); }catch(e){ alert(e.message||e); } yukle(); }
  function silDugmesi(F,sb){
    var fid=F.id, ad=sb===null?F.name:F.name+' / '+sb;
    if(K.teksenBagi(F,sb,V)){ ana.insertBefore(E('p','not',(sb===null?'Bu firmaya':'Bu şubeye')+' Teksen kaydı bağlı olduğu için silinemez; pasife alabilirsiniz.'),ana.querySelector('.islemler').nextSibling); return; }
    islem(sb===null?'Firmayı sil':'Şubeyi sil',function(){
      var n=0; Object.keys(V.kisiler).forEach(function(k){ if(sb===null?k.indexOf(fid+'|')===0:k===fid+'|'+sb) n+=(V.kisiler[k]||[]).length; });
      if(!confirm(ad+' silinsin mi?'+(n?'\nDİKKAT: Burada '+n+' kişi kayıtlı. Kişiler, silinen kayıt geri alınana kadar görünmez.':'')+'\n30 gün içinde Firmalar sayfasındaki “Silinenler” bölümünden geri alabilirsiniz.')) return;
      K.yerSil(fid,sb).then(function(){ history.replaceState(null,'',sb===null?'#firmalar':'#firma/'+encodeURIComponent(fid)); yukle(); },function(e){ alert(e.message||e); yukle(); });
    });
  }
  function silinenYerlerPenceresi(){
    pencereAc('Silinen firma ve şubeler'); penI.appendChild(E('p','not','Silinenler 30 gün saklanır. Geri almak için dokunun. Bu liste yedek dosyasına girmez.'));
    var hata=E('p','hata'); hata.setAttribute('role','alert'); penI.appendChild(hata);
    K.silinenYerler().then(function(a){
      if(!a.length) penI.appendChild(E('p','bilgi','Silinen firma veya şube yok.'));
      a.forEach(function(it){ var b=E('button','satir'); b.type='button'; b.appendChild(E('b',null,it.title)); b.appendChild(E('span',null,new Date(it.t).toLocaleString('tr-TR')+' tarihinde silindi'));
        b.addEventListener('click',function(){ if(!confirm(it.title+' geri alınsın mı?')) return; b.disabled=true; K.yerGeriAl(it.id).then(function(){ pen.close(); yukle(); },function(e){ b.disabled=false; hata.textContent=e.message||String(e); }); }); penI.appendChild(b); });
    },function(){ hata.textContent='Silinenler okunamadı.'; });
  }

  /* ---- Şubeler ---- */
  function firmaSayfa(fid){
    var F=firma(fid); if(!F){ location.replace('#firmalar'); return; }
    sayfa(firmaAd(F),'Bir şubeye dokunarak panosunu açın.',[['Firmalar','#firmalar']]);
    if(yazilabilir(F)){
      islem('+ Şube ekle',function(){ form('Şube ekle',[{k:'ad',ad:'Şube adı',not:'Şube adı sonradan bu uygulamadan değiştirilemez.'}].concat(bilgiAlan()),function(v){ K.subeEkle(fid,v); }); });
      islem('Firmayı düzenle',function(){ var kilit=bagli(fid,''); form('Firmayı düzenle',[{k:'ad',ad:'Kayıtlı firma adı',deger:F.name,not:'Teksen kaydı bağlı firmalarda sayfa başlığı Teksen’deki addan gelir.'}].concat(bilgiAlan(F.info,kilit)),function(v){ K.firmaDuzenle(fid,v); }); });
      if(F.pasif||F.arsiv) islem(F.arsiv?'Arşivden çıkar (aktif yap)':'Aktif yap',function(){ uygula(function(){ K.firmaDurum(fid,'aktif'); }); });
      if(!F.pasif) islem('Pasife al',function(){ if(confirm(F.name+' pasife alınsın mı? Listede gizlenir, kayıtları silinmez.')) uygula(function(){ K.firmaDurum(fid,'pasif'); }); });
      if(!F.arsiv) islem('Arşive al',function(){ if(confirm(F.name+' arşive alınsın mı? Listede gizlenir, kayıtları silinmez.')) uygula(function(){ K.firmaDurum(fid,'arsiv'); }); });
      silDugmesi(F,null);
    }
    if(F.pasif||F.arsiv) ana.appendChild(E('p','bilgi',F.arsiv?'Bu firma arşivde.':'Bu firma pasif.'));
    if(K.akkurt(F.name)) ana.appendChild(E('p','not','Akkurtlar kaydı bu uygulamada yalnızca görüntülenir.'));
    var g=izgara(), liste=birimler(F);
    /* Pasif şubeler bu sayfada her zaman erişilebilir kalır, geri açılabilsin */
    (F.sb||[]).forEach(function(n){ if(F.sbp&&F.sbp[n]&&!liste.some(function(u){ return u.sube===n; })) liste.push({fid:F.id,sube:n,ad:n,recs:V.lk.byUnit[F.id+'|'+n]||[]}); });
    liste.forEach(function(u){
      var w=uyariSay(u.recs), n=kisiler(u.fid,u.sube).length, adres=u.recs[0]&&u.recs[0].adres;
      kutu(g,{ad:u.ad,alt:(u.sube&&F.sbp&&F.sbp[u.sube]?'pasif · ':'')+(!u.recs.length?'Teksen kaydı yok':(w?w+' uyarı':'uyarı yok'))+' · '+n+' kişi'+(adres?' · '+adres:''),ton:w?'uyari':'',href:panoAdres(u.fid,u.sube)});
    });
  }

  /* ---- Pano ---- */
  function panoSayfa(fid,sb){
    var F=firma(fid); if(!F){ location.replace('#firmalar'); return; }
    var recs=V.lk.byUnit[fid+'|'+sb]||[], L=kisiler(fid,sb), bugun=H.today(), cok=recs.length>1;
    sayfa(sb||'Firma geneli',firmaAd(F)+' için güncel durum özeti.',[['Firmalar','#firmalar'],['Şubeler','#firma/'+encodeURIComponent(fid)]]);
    var kayitliSube=!sb||(F.sb||[]).indexOf(sb)>=0;
    if(yazilabilir(F)){
      if(kayitliSube) islem(sb?'Şube bilgisini düzenle':'Firma bilgisini düzenle',function(){ form(sb?'Şube bilgisi':'Firma bilgisi',bilgiAlan(sb?(F.sbi||{})[sb]:F.info,bagli(fid,sb)),function(v){ K.subeDuzenle(fid,sb,v); }); });
      if(sb&&kayitliSube){
        var pasif=!!(F.sbp&&F.sbp[sb]);
        islem(pasif?'Şubeyi aktif yap':'Şubeyi pasife al',function(){ if(pasif||confirm(sb+' pasife alınsın mı? Listede gizlenir, kayıtları silinmez.')) uygula(function(){ K.subeDurum(fid,sb,!pasif); }); });
        silDugmesi(F,sb);
        if(pasif) ana.appendChild(E('p','bilgi','Bu şube pasif.'));
      }
    }
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
    kutu(g,{sayi:L.length,ad:'Personel',alt:'kayıtlı kişi · eğitim durumları',href:'#personel/'+encodeURIComponent(fid)+'/'+encodeURIComponent(sb||'')});
    if(!recs.length) ana.appendChild(E('p','bilgi','Bu şubeye bağlı Teksen kaydı yok; ziyaret, uygunsuzluk ve belge kutuları bu yüzden görünmüyor.'));
  }

  /* Personel sayfasının kullandığı ortak ekran parçaları */
  var UI={E:E,sayfa:sayfa,izgara:izgara,kutu:kutu,islem:islem,firma:firma,firmaAd:firmaAd,birimler:birimler,panoAdres:panoAdres,
    veri:function(){ return V; },pencere:function(b){ pencereAc(b); return penI; },kapat:function(){ pen.close(); },yenile:function(){ yukle(); },ciz:function(){ yonlendir(); }};

  function coz(x){ try{ return decodeURIComponent(x||''); }catch(e){ return ''; } }
  function yonlendir(){
    if(!V) return; if(pen.open) pen.close();
    var p=location.hash.slice(1).split('/'), s=p[0]||'ana';
    if(s==='firmalar') firmalarSayfa(); else if(s==='firma') firmaSayfa(coz(p[1])); else if(s==='pano') panoSayfa(coz(p[1]),coz(p[2])); else if(s==='personel') window.Personel.sayfa(UI,coz(p[1]),coz(p[2])); else if(s==='bugun') bugunSayfa(); else if(s==='ayarlar') ayarSayfa(); else anaSayfa();
    document.querySelectorAll('[data-sekme]').forEach(function(a){ var on=a.getAttribute('data-sekme')===(s==='firma'||s==='pano'?'firmalar':(s==='firmalar'||s==='bugun'||s==='personel'?s:'ana')); if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    window.scrollTo(0,0);
  }
  var sira=0;
  function yukle(){
    var n=++sira;
    return window.Veri.oku().then(function(v){
      if(n!==sira) return;
      var ek=0; try{ ek=window.Kayit.otomatik(v.lk.unmatched); }catch(e){ v.hata.push('Otomatik kayıt yapılamadı: '+(e&&e.message||e)); }
      if(ek) return window.Veri.oku().then(function(y){ if(n!==sira) return; y.eklenen=ek; goster(y); });
      goster(v);
    }).catch(function(e){ ana.textContent=''; ana.appendChild(E('p','bilgi uyari','Veriler gösterilemedi: '+(e&&e.message||e))); });
  }
  function goster(v){
      V=v;
      var evp={get:function(fid,sb){ return kisiler(fid,sb); }};
      window.__evpApi=evp;
      OZ=H.ozet(V.data,V.lk,H.today()); UY={}; OZ.rows.forEach(function(m){ UY[m.f.sicil]=m; });
      yonlendir();
  }
  window.addEventListener('hashchange',yonlendir);
  /* Eski uygulamada yapılan değişiklikler, bu sayfaya dönünce görünsün */
  document.addEventListener('visibilitychange',function(){ if(!document.hidden&&!pen.open) yukle(); });
  yukle();
})();

/* Personel sayfası: tüm kişiler, arama, toplu ekleme, eğitim tarihleri, silme / geri alma. TC kimlik numarası gösterilmez. */
window.Personel=(function(){
  var H=window.Hesap, K=window.Kayit;
  var DURUM={yok:'Eğitim kaydı yok',eski:'Eğitim yenilenmeli',yakin:'Yenileme yaklaşıyor'};
  var SUZ='', ARA='', PASIF=false, SINIR=60, SON='', mesaj=null; /* mesaj: {yazi, geriAl} sonraki çizimde gösterilir */

  function duz(x){ return H.trd(x).replace(/ı/g,'i'); }
  function tarih(t){ return /^\d{4}-\d{2}-\d{2}$/.test(t||'')?H.vTr(t):(t||''); }

  /* Aramada Türkçe harfler sade karşılıklarıyla da eşleşir */
  function sade(x){ return H.trd(x).replace(/[çğıöşü]/g,function(c){ return 'cgiosu'['çğıöşü'.indexOf(c)]; }); }

  /* Eski uygulamadaki kişi eğitim durumu kuralı */
  function durum(x,tehlike){
    var g=(x.egt||[]).filter(function(y){ return y&&y.t; }), t=H.trd(String(tehlike||'')).replace(/ı/g,'i').replace(/ç/g,'c').replace(/[^a-z]/g,''), yy=H.EGY[t];
    if(!g.length) return {k:'yok',yazi:'Eğitim kaydı yok'};
    var son=g.map(function(y){ return y.t; }).sort().pop();
    if(!yy) return {k:'ok',yazi:'Son eğitim '+tarih(son)+' · tehlike sınıfı bilinmiyor'};
    var vade=(+son.slice(0,4)+yy)+son.slice(4,10), kalan=H.dayNum(vade)-H.dayNum(H.today());
    if(kalan<=0) return {k:'eski',yazi:'Yenilenmeli ('+tarih(vade)+')'};
    if(kalan<=60) return {k:'yakin',yazi:'Yenileme '+tarih(vade)+' ('+kalan+' gün)'};
    return {k:'ok',yazi:'Yenileme '+tarih(vade)};
  }

  /* Eski uygulamadaki gibi: yalnız duran firmaların kişileri */
  function topla(U){
    var V=U.veri(), out=[];
    Object.keys(V.kisiler).forEach(function(key){
      var i=key.indexOf('|'), fid=key.slice(0,i), sb=key.slice(i+1), F=U.firma(fid); if(!F) return;
      var rec=(V.lk.byUnit[key]||[])[0], pasif=!!(F.pasif||(sb&&F.sbp&&F.sbp[sb])), yer=U.firmaAd(F)+(sb?' / '+sb:'');
      (V.kisiler[key]||[]).forEach(function(x){ out.push({x:x,F:F,fid:fid,sb:sb,yer:yer,pasif:pasif,d:durum(x,rec&&rec.tehlike)}); });
    });
    return out.sort(function(a,b){ return String(a.x.ad||'').localeCompare(String(b.x.ad||''),'tr'); });
  }

  /* ---- yer seçimi (firma + şube) ---- */
  function yerSecici(U,f,fid,sb){
    var E=U.E, fS=E('select'), sS=E('select');
    function alan(ad,el){ var l=E('label'); l.appendChild(E('span',null,ad)); l.appendChild(el); f.appendChild(l); }
    alan('Firma',fS); alan('Şube',sS);
    var liste=U.veri().firmalar.filter(function(F){ return !K.akkurt(F.name)&&(!F.pasif||F.id===fid); }).map(function(F){ return {F:F,ad:U.firmaAd(F)}; }).sort(function(a,b){ return a.ad.localeCompare(b.ad,'tr'); });
    function secenek(s,v,ad){ var o=E('option',null,ad); o.value=v; s.appendChild(o); }
    secenek(fS,'','Firma seçin'); liste.forEach(function(x){ secenek(fS,x.F.id,x.ad); });
    function subeler(v){ sS.textContent=''; var F=U.firma(fS.value); if(!F) return; U.birimler(F).forEach(function(u){ secenek(sS,u.sube,u.ad); }); if(v!=null) sS.value=v; if(sS.selectedIndex<0) sS.selectedIndex=0; }
    fS.value=fid||''; if(fS.selectedIndex<0) fS.value=''; subeler(sb); fS.addEventListener('change',function(){ subeler(); });
    return function(){ if(!fS.value) throw new Error('Firma seçin.'); return {fid:fS.value,sb:sS.value}; };
  }
  function girdi(E,f,ad,tur,deger){ var l=E('label'); l.appendChild(E('span',null,ad)); var i=E('input'); i.type=tur||'text'; i.value=deger||''; i.autocomplete='off'; l.appendChild(i); f.appendChild(l); return i; }
  /* Ortak pencere formu. kaydet() mesaj döndürür; hata fırlatırsa pencerede kalır */
  function formAc(U,baslik,kur,dugmeAdi){
    var E=U.E, govde=U.pencere(baslik), f=E('form','form'), hata=E('p','hata'); hata.setAttribute('role','alert');
    var kaydet=kur(f), b=E('button','dugme ana',dugmeAdi||'Kaydet'); b.type='submit'; f.appendChild(hata); f.appendChild(b);
    f.addEventListener('submit',function(ev){ ev.preventDefault(); var m; try{ m=kaydet(); }catch(e){ hata.textContent=e.message||String(e); return; } bitti(U,m); });
    govde.appendChild(f);
  }
  function bitti(U,yazi,geriAlId){ mesaj={yazi:yazi,geriAl:geriAlId}; U.kapat(); U.yenile(); }

  function kisiEkle(U,fid,sb){
    formAc(U,'Kişi ekle',function(f){
      var yer=yerSecici(U,f,fid,sb), a=girdi(U.E,f,'Ad soyad'), g=girdi(U.E,f,'Görev'), d=girdi(U.E,f,'İşe giriş tarihi','date');
      return function(){ var y=yer(); K.kisiYaz(y.fid,y.sb,null,{ad:a.value,gorev:g.value,giris:d.value,teksenSubesi:true}); return 'Kişi eklendi.'; };
    });
  }

  /* ---- yapıştırılan listeyi satırlara ayırma ---- */
  function isoTarih(s){
    var m=/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/.exec(s), y,a,g; if(m){ y=+m[3]; a=+m[2]; g=+m[1]; } else { m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if(!m) return ''; y=+m[1]; a=+m[2]; g=+m[3]; }
    var d=new Date(Date.UTC(y,a-1,g)); if(d.getUTCMonth()!==a-1||d.getUTCDate()!==g) return ''; return d.toISOString().slice(0,10);
  }
  function baslikTuru(h){ var t=duz(h).replace(/[.:]/g,'').trim();
    if(/^(sira|no|sicil|personel no)/.test(t)||/(tc|t c|kimlik|telefon)/.test(t)) return 'atla';
    if(/(giriş|giris|başlama|baslama)/.test(t)) return 'giris';
    if(/^(soyad|soyisim)/.test(t)) return 'soyad';
    if(/^(adi? ?(ve )?soy|ad ?soyad|isim ?soy|çalişan|calisan|personel$|personel adi)/.test(t)) return 'adsoyad';
    if(/^(ad|adi|isim)$/.test(t)) return 'ad';
    if(/^(görev|gorev|ünvan|unvan|pozisyon|meslek|kadro)/.test(t)) return 'gorev';
    return null; }
  function ayristir(metin){
    var rows=String(metin||'').split(/\r?\n/).map(function(l){ return l.split(/\t|;/).map(function(c){ return c.trim(); }); }).filter(function(r){ return r.join(''); });
    if(!rows.length) return [];
    var harita=rows[0].map(baslikTuru), basli=harita.some(function(h){ return h==='ad'||h==='adsoyad'; });
    if(basli) rows=rows.slice(1);
    return rows.map(function(r){
      var o={ad:'',gorev:'',giris:'',not:''}, soyad='';
      if(basli) r.forEach(function(c,i){ var h=harita[i]; if(h==='ad'||h==='adsoyad') o.ad=c; else if(h==='soyad') soyad=c; else if(h==='gorev') o.gorev=c; else if(h==='giris'&&c){ o.giris=isoTarih(c); if(!o.giris) o.not='tarih okunamadı: '+c; } });
      else{
        var yazi=[]; r.forEach(function(c){ if(!c) return; if(/^\d{1,4}[.\/-]\d{1,2}[.\/-]\d{1,4}$/.test(c)){ o.giris=isoTarih(c); if(!o.giris) o.not='tarih okunamadı: '+c; } else if(/[a-zçğıöşü]/i.test(c)) yazi.push(c); });
        o.ad=yazi[0]||''; o.gorev=yazi[1]||''; if(yazi.length>2) o.not='fazla sütun var; ad ve görevi kontrol edin (başlık satırı eklemek yardımcı olur)';
      }
      if(soyad) o.ad=(o.ad+' '+soyad).trim();
      return o;
    }).filter(function(o){ return o.ad; });
  }

  function topluEkle(U,fid,sb){
    var E=U.E, govde=U.pencere('Toplu kişi ekle'), f=E('form','form');
    var yer=yerSecici(U,f,fid,sb), l=E('label'); l.appendChild(E('span',null,'Listeyi yapıştırın')); var ta=E('textarea'); ta.rows=7; ta.placeholder='Ayşe Yılmaz ; Kasiyer ; 01.03.2026'; l.appendChild(ta);
    l.appendChild(E('small',null,'Her satıra bir kişi. Excel’den sütunları kopyalayabilirsiniz. Ad ve soyad ayrı sütunlardaysa başlık satırını da (Ad, Soyad, Görev) kopyalayın. TC kimlik numarası alınmaz.')); f.appendChild(l);
    var hata=E('p','hata'); hata.setAttribute('role','alert'); var b=E('button','dugme ana','Önizle'); b.type='submit'; f.appendChild(hata); f.appendChild(b);
    var alan=E('div'); govde.appendChild(f); govde.appendChild(alan);
    function sil(){ alan.textContent=''; }
    f.addEventListener('input',sil); f.addEventListener('change',sil);
    f.addEventListener('submit',function(ev){
      ev.preventDefault(); sil(); hata.textContent=''; var y, S;
      try{ y=yer(); S=ayristir(ta.value); if(!S.length) throw new Error('Okunabilen satır yok.'); }catch(e){ hata.textContent=e.message; return; }
      var kayitli={}; (U.veri().kisiler[y.fid+'|'+y.sb]||[]).forEach(function(x){ kayitli[duz(x.ad)]=1; });
      alan.appendChild(E('p','bilgi uyari','Henüz kaydedilmedi. Satırları kontrol edin; hataları düzeltebilirsiniz.'));
      var G=S.map(function(s){
        var cift=kayitli[duz(s.ad)]; kayitli[duz(s.ad)]=1;
        var d=E('div','onizle'), c=E('input'); c.type='checkbox'; c.checked=!cift; c.disabled=!!cift; c.setAttribute('aria-label','Bu satırı ekle');
        var i=['ad','gorev','giris'].map(function(k,n){ var x=E('input'); x.type=k==='giris'?'date':'text'; x.value=s[k]; x.setAttribute('aria-label',['Ad soyad','Görev','İşe giriş tarihi'][n]); x.placeholder=['Ad soyad','Görev',''][n]; return x; });
        d.appendChild(c); i.forEach(function(x){ d.appendChild(x); }); if(cift||s.not) d.appendChild(E('small',null,cift?'Bu ad zaten var, eklenmeyecek.':s.not)); alan.appendChild(d); return {c:c,i:i};
      });
      var kh=E('p','hata'), kb=E('button','dugme ana','İşaretli kişileri kaydet'); kb.type='button';
      kb.addEventListener('click',function(){
        var sec=G.filter(function(g){ return g.c.checked; }).map(function(g){ return {ad:g.i[0].value,gorev:g.i[1].value,giris:g.i[2].value}; }); if(!sec.length){ kh.textContent='Eklenecek kişi seçilmedi.'; return; }
        var r; try{ r=K.topluEkle(y.fid,y.sb,sec); }catch(e){ kh.textContent=e.message; return; }
        bitti(U,r.eklenen+' kişi eklendi.'+(r.atlanan?' '+r.atlanan+' satır atlandı (aynı ad veya boş).':''));
      });
      alan.appendChild(kh); alan.appendChild(kb);
    });
  }

  function egitimAlanlari(E,f){ return {t:girdi(E,f,'Eğitim tarihi','date'),konu:girdi(E,f,'Konu','text','TEMEL İSG EĞİTİMİ'),sure:girdi(E,f,'Süre (saat, isteğe bağlı)','number')}; }
  function deger(a){ return {t:a.t.value,konu:a.konu.value,sure:a.sure.value}; }
  function egitimSonuc(r){ return r.eklenen+' kişiye eğitim kaydı eklendi.'+(r.vardi?' '+r.vardi+' kişide aynı kayıt zaten vardı.':''); }

  function topluEgitim(U,fid,sb){
    formAc(U,'Toplu eğitim tarihi gir',function(f){
      var E=U.E, liste=(U.veri().kisiler[fid+'|'+sb]||[]).slice().sort(function(a,b){ return String(a.ad).localeCompare(String(b.ad),'tr'); }), A=egitimAlanlari(E,f);
      var tum=E('label','secim'), tc=E('input'); tc.type='checkbox'; tum.appendChild(tc); tum.appendChild(document.createTextNode(' Tümünü seç ('+liste.length+' kişi)')); f.appendChild(tum);
      var C=liste.map(function(x){ var l=E('label','secim'), c=E('input'); c.type='checkbox'; c.value=x.id; l.appendChild(c); l.appendChild(document.createTextNode(' '+x.ad)); f.appendChild(l); return c; });
      tc.addEventListener('change',function(){ C.forEach(function(c){ c.checked=tc.checked; }); });
      return function(){ return egitimSonuc(K.egitimEkle(fid,sb,C.filter(function(c){ return c.checked; }).map(function(c){ return c.value; }),deger(A))); };
    });
  }

  function kisiAc(U,p){
    var E=U.E, x=p.x, g=U.pencere(x.ad||'(adsız)'), yaz=K.onayli()&&!K.akkurt(p.F.name);
    g.appendChild(E('p',null,[p.yer,x.gorev,x.giris?'işe giriş '+tarih(x.giris):''].filter(Boolean).join(' · ')));
    g.appendChild(E('p',p.d.k==='ok'?'':'dikkat',p.d.yazi));
    g.appendChild(E('h3',null,'Eğitim kayıtları'));
    var L=(x.egt||[]).filter(function(y){ return y&&y.t; }).sort(function(a,b){ return a.t<b.t?1:-1; });
    if(!L.length) g.appendChild(E('p','bilgi','Kayıt yok.'));
    L.forEach(function(y){ var d=E('div','satir'); d.appendChild(E('b',null,tarih(y.t))); d.appendChild(E('span',null,[y.konu||'Eğitim',y.sure?y.sure+' saat':'',y.kay||'Elle'].filter(Boolean).join(' · '))); g.appendChild(d); });
    if(!yaz){ if(K.akkurt(p.F.name)) g.appendChild(E('p','not','Akkurtlar kaydı bu uygulamada yalnızca görüntülenir.')); return; }
    var s=E('div','islemler'); g.appendChild(s);
    function dugme(ad,fn,ana){ var b=E('button','dugme'+(ana?' ana':''),ad); b.type='button'; b.addEventListener('click',fn); s.appendChild(b); return b; }
    dugme('Eğitim ekle',function(){ formAc(U,'Eğitim ekle: '+x.ad,function(f){ var A=egitimAlanlari(E,f); return function(){ return egitimSonuc(K.egitimEkle(p.fid,p.sb,[x.id],deger(A))); }; }); },true);
    dugme('Bilgileri düzenle',function(){ formAc(U,'Kişiyi düzenle',function(f){ var a=girdi(E,f,'Ad soyad','text',x.ad), gv=girdi(E,f,'Görev','text',x.gorev), d=girdi(E,f,'İşe giriş tarihi','date',x.giris); return function(){ K.kisiYaz(p.fid,p.sb,x.id,{ad:a.value,gorev:gv.value,giris:d.value,teksenSubesi:true}); return 'Kişi güncellendi.'; }; }); });
    var hata=E('p','hata'); hata.setAttribute('role','alert');
    dugme('Kişiyi sil',function(){
      if(!confirm(x.ad+' silinsin mi?\n“Silinenler” bölümünden 30 gün içinde geri alabilirsiniz.')) return;
      K.kisiSil(p.fid,p.sb,x.id,p.yer).then(function(id){ bitti(U,x.ad+' silindi.',id); },function(e){ hata.textContent=e.message||String(e); });
    });
    g.appendChild(hata);
  }

  function geriAl(U,id){ return K.geriAl(id).then(function(){ bitti(U,'Kişi geri alındı.'); },function(e){ alert('Geri alınamadı: '+(e.message||e)); }); }
  function silinenlerAc(U){
    var E=U.E, g=U.pencere('Silinen kişiler'); g.appendChild(E('p','not','Silinen kişiler 30 gün saklanır. Geri almak için dokunun. Bu liste yedek dosyasına girmez.'));
    K.silinenler().then(function(a){
      if(!a.length) g.appendChild(E('p','bilgi','Silinen kişi yok.'));
      a.forEach(function(it){ var b=E('button','satir'); b.type='button'; b.appendChild(E('b',null,it.title.replace(/^Personel: /,''))); b.appendChild(E('span',null,new Date(it.t).toLocaleString('tr-TR')+(K.onayli()?' · geri al':'')));
        if(K.onayli()) b.addEventListener('click',function(){ if(confirm('Geri alınsın mı?')) geriAl(U,it.id); }); g.appendChild(b); });
    },function(){ g.appendChild(E('p','hata','Silinenler okunamadı.')); });
  }

  /* ---- sayfa. fid verilirse yalnız o firma/şube ---- */
  function sayfa(U,fid,sb){
    var E=U.E, F=fid?U.firma(fid):null; if(fid&&!F){ location.replace('#personel'); return; }
    var yer=fid+'|'+(sb||''); if(yer!==SON){ SON=yer; SUZ=''; ARA=''; SINIR=60; }
    U.sayfa(F?'Personel: '+(sb||'Firma geneli'):'Personel',F?U.firmaAd(F)+' kişileri ve eğitim durumları.':'Tüm kişileri bulun, eğitim durumlarını görün.',F?[['Şube panosu',U.panoAdres(fid,sb)],['Tüm personel','#personel']]:null);
    if(mesaj){ var m=mesaj; mesaj=null; var d=E('div','bilgi'); d.setAttribute('role','status'); d.appendChild(E('span',null,m.yazi+' ')); if(m.geriAl){ var gb=E('button','dugme','Geri al'); gb.type='button'; gb.addEventListener('click',function(){ gb.disabled=true; geriAl(U,m.geriAl); }); d.appendChild(gb); } ana().appendChild(d); }
    if(K.onayli()&&!(F&&K.akkurt(F.name))){
      U.islem('+ Kişi ekle',function(){ kisiEkle(U,fid,sb); });
      U.islem('Toplu ekle',function(){ topluEkle(U,fid,sb); });
      if(F&&(U.veri().kisiler[yer]||[]).length) U.islem('Toplu eğitim tarihi',function(){ topluEgitim(U,fid,sb||''); });
    }
    var kaynak=topla(U).filter(function(p){ return F?(p.fid===fid&&p.sb===(sb||'')):true; });
    if(!F&&kaynak.some(function(p){ return p.pasif; })){ var l=E('label','secim'), cb=E('input'); cb.type='checkbox'; cb.checked=PASIF; cb.addEventListener('change',function(){ PASIF=cb.checked; U.ciz(); }); l.appendChild(cb); l.appendChild(document.createTextNode(' Pasif / arşiv firmalardakileri de göster')); ana().appendChild(l); }
    var hepsi=kaynak.filter(function(p){ return F||PASIF||!p.pasif; });
    var ozet=U.izgara();
    [['','Tüm kişiler']].concat(Object.keys(DURUM).map(function(k){ return [k,DURUM[k]]; })).forEach(function(x){
      var n=x[0]?hepsi.filter(function(p){ return p.d.k===x[0]; }).length:hepsi.length;
      var k=U.kutu(ozet,{sayi:n,ad:x[1],ton:x[0]&&n?'uyari':'',tik:function(){ SUZ=x[0]; SINIR=60; U.ciz(); }}); k.setAttribute('aria-pressed',SUZ===x[0]?'true':'false');
    });
    U.kutu(ozet,{ad:'Silinenler',alt:'geri alma',tik:function(){ silinenlerAc(U); }});
    var q=E('input','ara'); q.type='search'; q.placeholder='Ad, görev, firma veya şube ara'; q.setAttribute('aria-label',q.placeholder); q.value=ARA; ana().appendChild(q);
    var sonuc=E('p','not'); ana().appendChild(sonuc); var g=U.izgara(), daha=E('button','dugme','Daha fazla göster'); daha.type='button'; ana().appendChild(daha);
    function listele(){
      g.textContent=''; var s=sade(ARA).trim().split(/\s+/);
      var L=hepsi.filter(function(p){ if(SUZ&&p.d.k!==SUZ) return false; var t=sade([p.x.ad,p.x.gorev,p.yer].join(' ')); return s.every(function(w){ return t.indexOf(w)>=0; }); });
      sonuc.textContent=(SUZ?DURUM[SUZ]+': ':'')+L.length+' kişi'; daha.hidden=L.length<=SINIR;
      L.slice(0,SINIR).forEach(function(p){ U.kutu(g,{ad:p.x.ad||'(adsız)',alt:[F?p.x.gorev:p.yer,p.d.yazi].filter(Boolean).join(' · '),ton:p.d.k==='ok'?'':'uyari',tik:function(){ kisiAc(U,p); }}); });
      if(!L.length) g.appendChild(E('p','bilgi',hepsi.length?'Aramaya veya süzgece uyan kişi yok.':'Kayıtlı kişi yok.'));
    }
    q.addEventListener('input',function(){ ARA=q.value; SINIR=60; listele(); }); daha.addEventListener('click',function(){ SINIR+=60; listele(); }); listele();
    function ana(){ return document.getElementById('ana'); }
  }
  function say(U){ return topla(U).filter(function(p){ return !p.pasif; }).length; }
  return {sayfa:sayfa,say:say,ayristir:ayristir};
})();

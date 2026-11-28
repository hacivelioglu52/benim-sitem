/* Seçmeli rapor: PDF (yazdırma ekranı), Excel ve Word. Yalnız okur; hiçbir kaydı YAZMAZ, DEĞİŞTİRMEZ, SİLMEZ.
   Kurallar: Akkurtlar rapora girmez. TC kimlik no alanı alınmaz. Kayıtlardan yalnız aşağıda tek tek adı yazılan alanlar rapora girer;
   kişi listeleri (eğitime katılanlar vb.) girmez. İrtibat bilgisi ve uygunsuzluk "sorumlu" alanı yalnız irtibat seçilirse girer.
   Dosyaları üretmek için jszip.min.js gerekir (eski uygulamadaki JSZip 3.10.1'in aynen kopyası). */
window.Rapor=(function(){
  var H=window.Hesap, T=window.Teksen;
  var TEHLIKE={aztehlikeli:'Az tehlikeli',tehlikeli:'Tehlikeli',coktehlikeli:'Çok tehlikeli'};
  var GOREV=[['ilkyardimci','İlk yardımcı'],['destek_elemani','Destek elemanı'],['calisan_temsilcisi','Çalışan temsilcisi'],['yanginci','Yangıncı'],['arama_kurtarma','Arama kurtarma']];

  function akkurt(ad){ return /AKKURT/i.test(ad||''); }
  function tarih(s){ var g=T.gunOku(s); return g?H.vTr(g):String(s==null?'':s).trim(); }
  function sayi(s){ var n=parseInt(s,10); return isNaN(n)?'':n; }
  /* Serbest metinler: TC kimlik no biçimindeki sayılar (0 ile başlamayan 11 hane; bitişik ya da 3-3-3-2) her zaman gizlenir.
     İrtibat seçilmediyse e-posta adresleri ve telefon biçimindeki numaralar da gizlenir. */
  function temiz(s,irtibat){
    s=String(s==null?'':s).replace(/[\u0000-\u001F\u007F]+/g,' ').replace(/\s+/g,' ').trim();
    s=s.replace(/(^|\D)([1-9]\d{10}|[1-9]\d{2}[ \-]\d{3}[ \-]\d{3}[ \-]\d{2})(?!\d)/g,'$1[gizlendi]');
    if(!irtibat) s=s.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,'[gizlendi]').replace(/(^|[^\d])((?:\+?90[ .\-]?|0)?\(?0?5\d{2}\)?[ .\-]?\d{3}[ .\-]?\d{2}[ .\-]?\d{2}|(?:\+?90[ .\-]?|0)\(?\d{3}\)?[ .\-]?\d{3}[ .\-]?\d{2}[ .\-]?\d{2})(?!\d)/g,'$1[gizlendi]');
    return s;
  }

  /* Rapora girebilecek firma/şube kayıtları. Akkurtlar hiçbir koşulda listeye girmez. */
  function birimler(V,pasifDahil){
    var bizim=T.akkurtSiciller(V.firmalar,{firms:V.data.f,meta:V.data.meta}), fm={}, out=[], pasifAtlanan=0;
    V.firmalar.forEach(function(F){ fm[F.id]=F; });
    V.data.f.forEach(function(r){
      var l=V.lk.byRec[r.sicil], F=l?fm[l.fid]:null;
      if(akkurt(r.ad)||akkurt(r.sube)||bizim(r.sicil)||(F&&akkurt(F.name))) return;
      var p=!!(F&&(F.pasif||F.arsiv||(l.sube&&F.sbp&&F.sbp[l.sube])));
      if(p&&!pasifDahil){ pasifAtlanan++; return; }
      out.push({sicil:r.sicil,r:r,ad:r.ad||'(adsız)',sube:r.sube||(l&&l.sube)||'',pasif:p});
    });
    out.sort(function(a,b){ return H.trd(a.ad+' '+a.sube).localeCompare(H.trd(b.ad+' '+b.sube),'tr'); });
    return {liste:out,pasifAtlanan:pasifAtlanan};
  }

  /* secim = {firma,hizmet,uyg,belge,irtibat,pasif, siciller:{sicil:true}, donem:{bas,son}|null} */
  function hazirla(V,secim,bugun,simdi){
    if(V.hata&&V.hata.length) throw new Error('Veriler tam okunamadığı için rapor hazırlanmadı. '+V.hata.join(' '));
    if(!secim.firma&&!secim.hizmet&&!secim.uyg&&!secim.belge) throw new Error('En az bir bölüm seçin.');
    var B=birimler(V,secim.pasif), L=B.liste.filter(function(x){ return secim.siciller[x.sicil]; });
    if(!L.length) throw new Error('En az bir firma veya şube seçin.');
    var d=secim.donem, irt=!!secim.irtibat, bil={}, say={};
    L.forEach(function(x){ bil[x.sicil]=x; say[x.sicil]={h:0,hTarihsiz:0,u:0,uAcik:0,uKapali:0,uGec:0,dis:0,disGec:0,ts:0,tsAcik:0,silinen:0,belge:0,belgeBil:0,belgeYok:false}; });
    function icinde(g){ return !d||(g>=d.bas&&g<=d.son); }
    function adlar(s){ var x=bil[s]; return [x.ad,x.sube+(x.pasif?(x.sube?' ':'')+'(pasif/arşiv)':'')]; }
    function sirala(a,b){ return H.trd(a.k[0]+' '+a.k[1]).localeCompare(H.trd(b.k[0]+' '+b.k[1]),'tr')||String(b.t).localeCompare(String(a.t)); }
    var bolumler=[], genel=[];
    function bolum(ad,kisa,sutunlar,satirlar,bos){ bolumler.push({ad:ad,kisa:kisa,sutunlar:sutunlar,satirlar:satirlar,bos:bos||'Kayıt yok.'}); }
    function sut(ad,gen){ return {ad:ad,gen:gen}; }

    /* Firma / şube bilgisi */
    var firmaB=null;
    if(secim.firma){
      var s=[sut('Firma',32),sut('Şube',20),sut('SGK sicil no',28),sut('İl',12),sut('Adres',36),sut('Tehlike sınıfı',14),sut('Çalışan',9),sut('Ziyaret periyodu',14)];
      if(irt) s.push(sut('İrtibat',22),sut('Yetkili',20),sut('Telefon',16),sut('E-posta',24));
      firmaB={ad:'Firma ve şube bilgileri',kisa:'Firmalar',s:s,r:L.map(function(x){
        var r=x.r, sat=adlar(x.sicil).concat([String(r.sicil),r.il||'',temiz(r.adres,irt),TEHLIKE[r.tehlike]||r.tehlike||'',sayi(r.calisan),r.periyot||'']);
        if(irt) sat.push(temiz(r.irtibat,true),r.yetkili||'',r.yetkiliTel||'',r.yetkiliMail||'');
        return sat;
      })};
    }

    /* Hizmet kayıtları */
    var hizmetSatir=[];
    if(secim.hizmet){
      V.data.h.forEach(function(h){
        if(!bil[h.sicil]) return; var v=h.veri||{}, g=T.gunOku(h.tarih||v.hizmet_tarihi), n=say[h.sicil];
        if(g&&!icinde(g)) return;
        if(g) n.h++; else n.hTarihsiz++;
        var tat=String(v.tatbikat_yapildi)==='1';
        hizmetSatir.push({k:adlar(h.sicil),t:g,s:adlar(h.sicil).concat([g?H.vTr(g):(tarih(h.tarih||v.hizmet_tarihi)||'tarih yok')+' (tarih okunamadı)',tarih(v.egitim_tarih),sayi(v.egitimi_tamam_personel),sayi(v.egitimi_eksik_personel)]).concat(GOREV.map(function(p){ return sayi(v['gerekli_'+p[0]]); })).concat([tat?'Yapıldı'+(v.tatbikat_yapilma_tarih?' · '+tarih(v.tatbikat_yapilma_tarih):''):''])});
      });
      hizmetSatir.sort(sirala);
    }

    /* Uygunsuzluklar: dönem tespit tarihine göre. Dönem dışı açıklar ve tarihi okunamayanlar ayrı tutulur. */
    var ic=[], dis=[], tsz=[];
    if(secim.uyg){
      V.data.u.forEach(function(u){
        if(!bil[u.sicil]) return; var n=say[u.sicil];
        if(u.state==='silindi'){ n.silinen++; return; }
        var g=T.gunOku(u.tespit), acik=u.state==='acik', gec=!!(acik&&u.termin&&u.termin<bugun);
        var sat=adlar(u.sicil).concat([g?H.vTr(g):(String(u.tespit||'').trim()||'yok'),temiz(u.tanim,irt),temiz(u.oneri,irt),u.onem||'',tarih(u.termin),acik?(gec?'Açık, termini geçmiş':'Açık'):'Kapalı',acik?'':tarih(u.kapatma),temiz(u.aciklama,irt)]);
        if(irt) sat.push(temiz(u.sorumlu,true));
        if(u.gorunmuyor&&acik) sat[7]+=' (son alımda görünmedi)';
        var o={k:adlar(u.sicil),t:g,s:sat};
        if(d&&!g){ tsz.push(o); n.ts++; if(acik) n.tsAcik++; }
        else if(d&&!icinde(g)){ if(acik){ dis.push(o); n.dis++; if(gec) n.disGec++; } }
        else { ic.push(o); n.u++; if(acik){ n.uAcik++; if(gec) n.uGec++; } else n.uKapali++; }
      });
      ic.sort(sirala); dis.sort(sirala); tsz.sort(sirala);
    }

    /* Belge durumu: bugünkü durum; döneme bağlı değildir */
    var belgeSatir=[];
    if(secim.belge){
      var dM={}; V.data.d.forEach(function(x){ dM[x.sicil]=x.docs; });
      L.forEach(function(x){
        var dd=dM[x.sicil]; if(!dd||!Object.keys(dd).length){ say[x.sicil].belgeYok=true; return; }
        H.DTYPES.forEach(function(t){
          var e=H.docEval(t[0],dd[t[0]],x.r.tehlike,bugun); if(e.s==='ok') return;
          var durum=e.s==='yok'||e.s==='eski'?'Eksik veya yenilenecek':e.s==='yak'?'Yenileme yaklaşıyor':'Kontrol edilmeli';
          if(e.s==='bil') say[x.sicil].belgeBil++; else if(e.s!=='yak') say[x.sicil].belge++;
          belgeSatir.push(adlar(x.sicil).concat([t[1],durum,e.msg,e.last?H.vTr(e.last):'']));
        });
      });
    }

    function top(k){ return L.reduce(function(a,x){ return a+say[x.sicil][k]; },0); }
    genel.push(['Rapordaki firma/şube kaydı',L.length]);
    if(secim.hizmet){
      genel.push([d?'Dönemdeki hizmet kaydı':'Hizmet kaydı',top('h')]);
      if(top('hTarihsiz')) genel.push(['Tarihi okunamayan hizmet kaydı (ayrıca sayıldı)',top('hTarihsiz')]);
    }
    if(secim.uyg){
      genel.push([d?'Dönemde tespit edilen uygunsuzluk':'Uygunsuzluk (tümü)',top('u')],['— bunlardan açık',top('uAcik')],['— açıklardan termini geçmiş',top('uGec')],['— bunlardan kapalı',top('uKapali')]);
      if(d){
        genel.push(['Dönem dışında tespit edilip hâlâ açık (ayrı)',top('dis')],['— bunlardan termini geçmiş',top('disGec')],['Tespit tarihi okunamayan (ayrı)',top('ts')],['— bunlardan açık',top('tsAcik')]);
        genel.push(['Rapordaki tüm açık uygunsuzluk (dönem içi + dönem dışı + tarihsiz)',top('uAcik')+top('dis')+top('tsAcik')]);
      }
      if(top('silinen')) genel.push(['Teksen’de silinmiş görünen, rapora alınmayan',top('silinen')]);
    }
    if(secim.belge){
      genel.push(['Eksik veya yenilenecek belge',top('belge')],['Kontrol edilmeli (tarih okunamadı)',top('belgeBil')]);
      var by=L.filter(function(x){ return say[x.sicil].belgeYok; }).length; if(by) genel.push(['Belge bilgisi alınmamış kayıt (sayılmadı)',by]);
    }
    bolum('Genel özet','Özet',[sut('Başlık',62),sut('Sayı',10)],genel);

    if(secim.hizmet||secim.uyg||secim.belge){
      var os=[sut('Firma',32),sut('Şube',20)], al=[];
      function ek(ad,fn){ os.push(sut(ad,13)); al.push(fn); }
      if(secim.hizmet){ ek('Hizmet',function(n){ return n.h; }); if(top('hTarihsiz')) ek('Tarihsiz hizmet',function(n){ return n.hTarihsiz; }); }
      if(secim.uyg){
        ek(d?'Dönemde tespit':'Uygunsuzluk',function(n){ return n.u; }); ek('Açık',function(n){ return n.uAcik; }); ek('Termini geçmiş',function(n){ return n.uGec; }); ek('Kapalı',function(n){ return n.uKapali; });
        if(d){ ek('Dönem dışı açık',function(n){ return n.dis; }); ek('Tarihsiz',function(n){ return n.ts; }); }
      }
      if(secim.belge) ek('Eksik belge',function(n){ return n.belgeYok?'bilgi yok':n.belge; });
      bolum('Firma ve şube bazında sayılar','Sayılar',os,L.map(function(x){ return adlar(x.sicil).concat(al.map(function(f){ return f(say[x.sicil]); })); }));
    }
    if(firmaB) bolum(firmaB.ad,firmaB.kisa,firmaB.s,firmaB.r);
    if(secim.hizmet) bolum('Hizmet kayıtları','Hizmet',[sut('Firma',32),sut('Şube',20),sut('Hizmet tarihi',14),sut('Eğitim tarihi',13),sut('Eğitim alan',9),sut('Eğitim almayan',10)].concat(GOREV.map(function(p){ return sut('Görevli: '+p[1],12); })).concat([sut('Tatbikat',20)]),hizmetSatir.map(function(o){ return o.s; }),d?'Bu dönemde hizmet kaydı yok.':'Hizmet kaydı yok.');
    if(secim.uyg){
      var us=[sut('Firma',28),sut('Şube',18),sut('Tespit',15),sut('Uygunsuzluk',45),sut('Öneri',40),sut('Önem',10),sut('Termin',15),sut('Durum',18),sut('Kapatma',15),sut('Açıklama',30)];
      if(irt) us.push(sut('Sorumlu',18));
      function al2(a){ return a.map(function(o){ return o.s; }); }
      bolum(d?'Dönemde tespit edilen uygunsuzluklar':'Uygunsuzluklar',d?'Dönem uygunsuzluk':'Uygunsuzluk',us,al2(ic),d?'Bu dönemde tespit edilen uygunsuzluk yok.':'Uygunsuzluk yok.');
      if(d){
        bolum('Dönem dışında tespit edilmiş, hâlâ açık uygunsuzluklar','Dönem dışı açık',us,al2(dis),'Dönem dışında açık uygunsuzluk yok.');
        if(tsz.length) bolum('Tespit tarihi okunamayan uygunsuzluklar','Tarihsiz',us,al2(tsz));
      }
    }
    if(secim.belge) bolum('Belge durumu (bugün itibarıyla; döneme bağlı değil)','Belge durumu',[sut('Firma',32),sut('Şube',20),sut('Belge',24),sut('Durum',22),sut('Açıklama',45),sut('Son dosya tarihi',14)],belgeSatir,'Eksik, yaklaşan veya kontrol edilecek belge görünmüyor.');

    var an=simdi||new Date(), notlar=[];
    notlar.push('Rapor tarihi: '+an.toLocaleString('tr-TR'));
    notlar.push('Dönem: '+(d?H.vTr(d.bas)+' – '+H.vTr(d.son):'Tüm zamanlar')+(secim.hizmet||secim.uyg?(d?' (hizmette hizmet tarihine, uygunsuzlukta tespit tarihine göre; açık/kapalı durumu bugünkü kayda göredir)':''):''));
    var son=V.data.meta.filter(function(m){ return m.k==='son'; })[0], t=son&&son.t?new Date(son.t):null;
    notlar.push('Teksen verisinin son alınma tarihi: '+(t&&!isNaN(t)?t.toLocaleString('tr-TR'):'bilinmiyor'));
    if(son&&son.R&&son.R.kismi) notlar.push('DİKKAT: Son alım kısmiydi ('+son.R.kismi+'). Diğer bilgiler daha eski olabilir.');
    notlar.push('Sayılar bu cihazda kayıtlı Teksen verisinden hesaplanır.');
    if(!secim.pasif&&B.pasifAtlanan) notlar.push('Pasif veya arşivdeki '+B.pasifAtlanan+' kayıt rapora alınmadı.');
    if(L.length<B.liste.length) notlar.push((B.liste.length-L.length)+' firma/şube kaydı seçilmedi.');
    return {baslik:'İSG Raporu',notlar:notlar,bolumler:bolumler,genel:genel,dosyaAdi:'isg-raporu-'+bugun};
  }

  /* ---- Dosya üretimi ---- */
  function x(s){ return String(s==null?'':s).replace(/[^\u0009\u000A\u000D -퟿-�\uD800-\uDFFF]/g,'').replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g,'').replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g,'$1').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  var BAS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  var PR='http://schemas.openxmlformats.org/package/2006/relationships', OR='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  function iliskiler(l){ return BAS+'<Relationships xmlns="'+PR+'">'+l.map(function(r,i){ return '<Relationship Id="rId'+(i+1)+'" Type="'+OR+'/'+r[0]+'" Target="'+r[1]+'"/>'; }).join('')+'</Relationships>'; }
  function turler(l){ return BAS+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'+l.map(function(o){ return '<Override PartName="'+o[0]+'" ContentType="application/vnd.openxmlformats-officedocument.'+o[1]+'+xml"/>'; }).join('')+'</Types>'; }
  function harf(i){ var s=''; i++; while(i){ i--; s=String.fromCharCode(65+i%26)+s; i=Math.floor(i/26); } return s; }

  function excel(R,tur){
    var zip=new window.JSZip(), S='http://schemas.openxmlformats.org/spreadsheetml/2006/main', sayfalar=[];
    function hucre(ref,v,st){
      if(typeof v==='number') return '<c r="'+ref+'" s="'+st+'"><v>'+v+'</v></c>';
      return '<c r="'+ref+'" s="'+st+'" t="inlineStr"><is><t xml:space="preserve">'+x(String(v==null?'':v).slice(0,32000))+'</t></is></c>';
    }
    R.bolumler.forEach(function(b,i){
      var satirlar=[], no=0;
      function sat(h,st){ no++; satirlar.push('<row r="'+no+'">'+h.map(function(v,j){ return hucre(harf(j)+no,v,st); }).join('')+'</row>'); }
      if(i===0){ sat([R.baslik],3); R.notlar.forEach(function(n){ sat([n],0); }); sat([''],0); }
      sat(b.sutunlar.map(function(c){ return c.ad; }),1); var baslikNo=no;
      b.satirlar.forEach(function(r){ sat(r,2); });
      if(!b.satirlar.length) sat([b.bos],0);
      var xml=BAS+'<worksheet xmlns="'+S+'"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0">'+(i?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'')+'</sheetView></sheetViews><cols>'+b.sutunlar.map(function(c,j){ return '<col min="'+(j+1)+'" max="'+(j+1)+'" width="'+c.gen+'" customWidth="1"/>'; }).join('')+'</cols><sheetData>'+satirlar.join('')+'</sheetData>'
        +(i&&b.satirlar.length?'<autoFilter ref="A'+baslikNo+':'+harf(b.sutunlar.length-1)+no+'"/>':'')+'<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/></worksheet>';
      zip.file('xl/worksheets/sheet'+(i+1)+'.xml',xml); sayfalar.push(b.kisa.replace(/[\\\/?*\[\]:]/g,' ').slice(0,31));
    });
    zip.file('[Content_Types].xml',turler([['/xl/workbook.xml','spreadsheetml.sheet.main'],['/xl/styles.xml','spreadsheetml.styles']].concat(sayfalar.map(function(_,i){ return ['/xl/worksheets/sheet'+(i+1)+'.xml','spreadsheetml.worksheet']; }))));
    zip.file('_rels/.rels',iliskiler([['officeDocument','xl/workbook.xml']]));
    zip.file('xl/_rels/workbook.xml.rels',iliskiler(sayfalar.map(function(_,i){ return ['worksheet','worksheets/sheet'+(i+1)+'.xml']; }).concat([['styles','styles.xml']])));
    zip.file('xl/workbook.xml',BAS+'<workbook xmlns="'+S+'" xmlns:r="'+OR+'"><sheets>'+sayfalar.map(function(a,i){ return '<sheet name="'+x(a)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>'; }).join('')+'</sheets></workbook>');
    zip.file('xl/styles.xml',BAS+'<styleSheet xmlns="'+S+'"><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
    return zip.generateAsync({type:tur||'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }

  function word(R,tur){
    var zip=new window.JSZip(), GEN=15700; /* yatay A4, yazı alanı (twip) */
    function p(metin,o){
      o=o||{}; var rp=(o.kalin?'<w:b/>':'')+(o.boy?'<w:sz w:val="'+o.boy+'"/><w:szCs w:val="'+o.boy+'"/>':'');
      return '<w:p><w:pPr>'+(o.stil?'<w:pStyle w:val="'+o.stil+'"/>':'')+'<w:spacing w:before="0" w:after="'+(o.ara!=null?o.ara:60)+'"/></w:pPr><w:r>'+(rp?'<w:rPr>'+rp+'</w:rPr>':'')+'<w:t xml:space="preserve">'+x(metin)+'</w:t></w:r></w:p>';
    }
    function tablo(b){
      var top=b.sutunlar.reduce(function(a,c){ return a+c.gen; },0), gen=b.sutunlar.map(function(c){ return Math.floor(GEN*c.gen/Math.max(top,100)); });
      var boy=b.sutunlar.length>8?14:17;
      function satir(h,bas){ return '<w:tr>'+(bas?'<w:trPr><w:tblHeader/></w:trPr>':'')+h.map(function(v,j){ return '<w:tc><w:tcPr><w:tcW w:w="'+gen[j]+'" w:type="dxa"/>'+(bas?'<w:shd w:val="clear" w:color="auto" w:fill="DCE6F8"/>':'')+'</w:tcPr>'+p(String(v==null?'':v),{boy:boy,kalin:bas,ara:0})+'</w:tc>'; }).join('')+'</w:tr>'; }
      var kenar=['top','left','bottom','right','insideH','insideV'].map(function(k){ return '<w:'+k+' w:val="single" w:sz="4" w:space="0" w:color="9AA4B5"/>'; }).join('');
      return '<w:tbl><w:tblPr><w:tblW w:w="'+gen.reduce(function(a,c){ return a+c; },0)+'" w:type="dxa"/><w:tblBorders>'+kenar+'</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+gen.map(function(g){ return '<w:gridCol w:w="'+g+'"/>'; }).join('')+'</w:tblGrid>'+satir(b.sutunlar.map(function(c){ return c.ad; }),true)+b.satirlar.map(function(r){ return satir(r,false); }).join('')+'</w:tbl>';
    }
    var govde=p(R.baslik,{stil:'Title'})+R.notlar.map(function(n){ return p(n,{boy:18,ara:20}); }).join('')+R.bolumler.map(function(b){ return p(b.ad+(b.kisa==='Özet'?'':' ('+b.satirlar.length+' satır)'),{stil:'Heading1'})+(b.satirlar.length?tablo(b):p(b.bos,{boy:18})); }).join('');
    var W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    zip.file('[Content_Types].xml',turler([['/word/document.xml','wordprocessingml.document.main'],['/word/styles.xml','wordprocessingml.styles']]));
    zip.file('_rels/.rels',iliskiler([['officeDocument','word/document.xml']]));
    zip.file('word/_rels/document.xml.rels',iliskiler([['styles','styles.xml']]));
    zip.file('word/document.xml',BAS+'<w:document xmlns:w="'+W+'"><w:body>'+govde+'<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="567" w:right="567" w:bottom="567" w:left="567" w:header="284" w:footer="284" w:gutter="0"/></w:sectPr></w:body></w:document>');
    function stil(id,ad,boy,once){ return '<w:style w:type="paragraph" w:styleId="'+id+'"><w:name w:val="'+ad+'"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="'+once+'" w:after="100"/>'+(id==='Heading1'?'<w:outlineLvl w:val="0"/>':'')+'</w:pPr><w:rPr><w:b/><w:sz w:val="'+boy+'"/><w:szCs w:val="'+boy+'"/></w:rPr></w:style>'; }
    zip.file('word/styles.xml',BAS+'<w:styles xmlns:w="'+W+'"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'+stil('Title','Title',32,0)+stil('Heading1','heading 1',24,220)+'</w:styles>');
    return zip.generateAsync({type:tur||'blob',compression:'DEFLATE',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  }

  /* PDF: rapor yazdırma alanına çizilir, tarayıcının yazdırma ekranından "PDF olarak kaydet" seçilir */
  function yazdirAlani(R){
    var y=document.getElementById('yazdir');
    if(!y){ y=document.createElement('div'); y.id='yazdir'; document.body.appendChild(y); }
    y.textContent='';
    function el(t,v,yer){ var e=document.createElement(t); if(v!=null) e.textContent=String(v); (yer||y).appendChild(e); return e; }
    el('h1',R.baslik); R.notlar.forEach(function(n){ el('p',n); });
    R.bolumler.forEach(function(b){
      el('h2',b.ad+(b.kisa==='Özet'?'':' ('+b.satirlar.length+' satır)'));
      if(!b.satirlar.length){ el('p',b.bos); return; }
      var t=el('table'); if(b.sutunlar.length>8) t.className='sik';
      var top=b.sutunlar.reduce(function(a,c){ return a+c.gen; },0), cg=el('colgroup',null,t);
      b.sutunlar.forEach(function(c){ el('col',null,cg).style.width=(100*c.gen/Math.max(top,100))+'%'; });
      var th=el('tr',null,el('thead',null,t)); b.sutunlar.forEach(function(c){ el('th',c.ad,th); });
      var tb=el('tbody',null,t); b.satirlar.forEach(function(r){ var tr=el('tr',null,tb); r.forEach(function(v){ var td=el('td',v,tr); if(/^\d{2}\.\d{2}\.\d{4}$/.test(v)) td.className='gun'; }); });
    });
    return y;
  }
  var eskiBaslik=null;
  function yazdir(R){
    yazdirAlani(R);
    if(eskiBaslik===null) eskiBaslik=document.title;
    document.title=R.dosyaAdi; /* PDF dosyasının önerilen adı */
    window.print();
  }
  window.addEventListener('afterprint',function(){ if(eskiBaslik!==null){ document.title=eskiBaslik; eskiBaslik=null; } });

  function indir(blob,ad){
    var a=document.createElement('a'), u=URL.createObjectURL(blob); a.href=u; a.download=ad; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },60000);
  }

  function alanSil(){ var y=document.getElementById('yazdir'); if(y) y.remove(); }
  /* Başka sayfaya geçilince eski rapor yazdırılmasın */
  window.addEventListener('hashchange',alanSil);

  /* ---- Ekran ---- */
  /* Seçimler, sayfa yenilenince (ör. yazdırma ekranından dönünce) kaybolmasın */
  var S={firma:true,hizmet:true,uyg:true,belge:false,irtibat:false,pasif:false,cikarilan:{},tur:'tum',bas:'',son:'',acik:false,ara:''};

  function sayfa(UI){
    var E=UI.E, V=UI.veri(), ana=document.getElementById('ana');
    UI.sayfa('Raporlar','Kayıtlı Teksen verisinden seçtiğiniz bölümlerle PDF, Excel veya Word raporu alın.');
    if(!V.data.f.length){ ana.appendChild(E('p','bilgi','Bu tarayıcıda kayıtlı Teksen verisi yok. Önce Ana sayfadan “Teksen verisi al” işlemini yapın.')); return; }
    ana.appendChild(E('p','not','Rapor hiçbir kaydı değiştirmez. Akkurtlar rapora girmez.'));
    var kap=E('div','bilgi secimler'); ana.appendChild(kap);
    function kutucuk(yer,yazi,deger,degisti){ var l=E('label','secim kutucuk'), c=E('input'); c.type='checkbox'; c.checked=deger; l.appendChild(c); l.appendChild(document.createTextNode(' '+yazi)); yer.appendChild(l); c.addEventListener('change',function(){ degisti(c.checked); ciz(); }); return {l:l,c:c}; }
    function dugme(ad,fn,sinif){ var b=E('button',sinif||'dugme',ad); b.type='button'; b.addEventListener('click',fn); return b; }

    kap.appendChild(E('h3',null,'A. Raporda neler olsun?'));
    kutucuk(kap,'Firma/şube bilgileri',S.firma,function(v){ S.firma=v; });
    kutucuk(kap,'Hizmet kayıtları (ziyaret, eğitim, görevlendirme, tatbikat)',S.hizmet,function(v){ S.hizmet=v; });
    kutucuk(kap,'Uygunsuzluklar',S.uyg,function(v){ S.uyg=v; });
    kutucuk(kap,'Belge durumu (bugünkü durum; zaman dilimine bağlı değil)',S.belge,function(v){ S.belge=v; });
    kutucuk(kap,'İrtibat bilgileri de girsin (yetkili, telefon, e-posta, uygunsuzluk sorumlusu)',S.irtibat,function(v){ S.irtibat=v; });

    kap.appendChild(E('h3',null,'B. Hangi firma ve şubeler?'));
    var pasifVar=birimler(V,false).pasifAtlanan;
    if(pasifVar) kutucuk(kap,'Pasif / arşiv olanları da ekle ('+pasifVar+')',S.pasif,function(v){ S.pasif=v; listeCiz(); });
    var det=E('details'), ozet=E('summary'); det.open=S.acik; det.addEventListener('toggle',function(){ S.acik=det.open; }); det.appendChild(ozet); kap.appendChild(det);
    var ara=E('input','ara'); ara.type='search'; ara.placeholder='Firma veya şube ara'; ara.setAttribute('aria-label','Rapor listesinde ara'); ara.value=S.ara; det.appendChild(ara);
    var iki=E('div','islemler'); det.appendChild(iki);
    iki.appendChild(dugme('Listedekileri seç',function(){ toplu(true); })); iki.appendChild(dugme('Listedekileri kaldır',function(){ toplu(false); }));
    var liste=E('div','secim-liste'); det.appendChild(liste);
    var satirlar=[], L=[];
    function sade(s){ return H.trd(s).replace(/[çğıöşü]/g,function(c){ return 'cgiosu'['çğıöşü'.indexOf(c)]; }); }
    function suz(){ S.ara=ara.value; var s=sade(ara.value).trim(); satirlar.forEach(function(r){ r.k.l.hidden=!!s&&r.ara.indexOf(s)<0; }); }
    function toplu(a){ alanSil(); satirlar.forEach(function(r){ if(!r.k.l.hidden){ r.k.c.checked=a; if(a) delete S.cikarilan[r.x.sicil]; else S.cikarilan[r.x.sicil]=true; } }); ciz(); }
    function listeCiz(){
      liste.textContent=''; satirlar=[]; L=birimler(V,S.pasif).liste;
      L.forEach(function(o){ var yazi=o.ad+(o.sube?' · '+o.sube:'')+(o.pasif?' (pasif/arşiv)':''); var k=kutucuk(liste,yazi,!S.cikarilan[o.sicil],function(v){ if(v) delete S.cikarilan[o.sicil]; else S.cikarilan[o.sicil]=true; }); satirlar.push({x:o,k:k,ara:sade(yazi)}); });
      suz();
    }
    ara.addEventListener('input',suz);

    kap.appendChild(E('h3',null,'C. Zaman dilimi'));
    var f=E('div','form'); kap.appendChild(f);
    function alanEkle(ad,e){ var l=E('label'); l.appendChild(E('span',null,ad)); l.appendChild(e); f.appendChild(l); return l; }
    var sec=E('select'); [['tum','Tüm zamanlar'],['buyil','Bu yıl'],['gecenyil','Geçen yıl'],['son12','Son 12 ay'],['aralik','İki tarih arası']].forEach(function(o){ var op=E('option',null,o[1]); op.value=o[0]; sec.appendChild(op); }); sec.value=S.tur; alanEkle('Dönem',sec);
    var t1=E('input'), t2=E('input'); t1.type=t2.type='date'; t1.value=S.bas; t2.value=S.son;
    var l1=alanEkle('Başlangıç',t1), l2=alanEkle('Bitiş',t2); l1.hidden=l2.hidden=S.tur!=='aralik';
    kap.appendChild(E('p','not','Dönem hizmet kayıtlarına ve uygunsuzluklara uygulanır. Dönem dışında tespit edilip hâlâ açık olan uygunsuzluklar ayrı bölümde ve ayrı sayıyla gösterilir.'));
    sec.addEventListener('change',function(){ S.tur=sec.value; l1.hidden=l2.hidden=S.tur!=='aralik'; ciz(); });
    t1.addEventListener('change',function(){ S.bas=t1.value; ciz(); }); t2.addEventListener('change',function(){ S.son=t2.value; ciz(); });

    var onizleme=E('div'); ana.appendChild(onizleme);
    var dugmeler=E('div','islemler'); ana.appendChild(dugmeler);
    var durum=E('p','durum'); durum.setAttribute('role','status'); ana.appendChild(durum);
    ana.appendChild(E('p','not','PDF için açılan yazdırma ekranında yazıcı olarak “PDF olarak kaydet” seçin; sayfa yönünü yatay yapın. Excel ve Word dosyaları indirilenler klasörüne iner. Raporlar firma bilgisi içerir; paylaşırken dikkat edin.'));
    var son=null;
    function uret(){
      var sic={}; L.forEach(function(o){ if(!S.cikarilan[o.sicil]) sic[o.sicil]=true; });
      return hazirla(V,{firma:S.firma,hizmet:S.hizmet,uyg:S.uyg,belge:S.belge,irtibat:S.irtibat,pasif:S.pasif,siciller:sic,donem:T.donem(S.tur,T.today(),S.bas,S.son)},T.today());
    }
    function dosya(ad,uz,fn){
      var b=dugme(ad,function(){
        if(!son) return; durum.className='durum'; durum.textContent=ad+' hazırlanıyor…';
        var R; try{ R=uret(); }catch(e){ hata(e); return; }
        fn(R).then(function(blob){ indir(blob,R.dosyaAdi+uz); durum.textContent='İndirme başlatıldı: '+R.dosyaAdi+uz; },hata);
      },'dugme ana'); dugmeler.appendChild(b); return b;
    }
    function hata(e){ durum.className='durum hata'; durum.textContent='Rapor hazırlanamadı: '+(e&&e.message||e); }
    var bP=dugme('PDF (yazdır)',function(){ if(!son) return; durum.className='durum'; durum.textContent=''; try{ yazdir(uret()); }catch(e){ hata(e); } },'dugme ana'); dugmeler.appendChild(bP);
    var bE=dosya('Excel indir','.xlsx',excel), bW=dosya('Word indir','.docx',word);
    function ciz(){
      ozet.textContent=L.filter(function(o){ return !S.cikarilan[o.sicil]; }).length+' / '+L.length+' firma/şube seçili (listeyi aç)';
      onizleme.textContent=''; durum.textContent=''; son=null;
      onizleme.appendChild(E('h2',null,'Rapor özeti'));
      try{ son=uret(); }catch(e){ onizleme.appendChild(E('p','durum hata',e.message||String(e))); }
      if(son){
        var k=E('div','bilgi'); son.genel.forEach(function(r){ k.appendChild(E('p','ozet-satir',r[0]+': '+r[1])); }); onizleme.appendChild(k);
        son.notlar.slice(1).forEach(function(n){ onizleme.appendChild(E('p',n.indexOf('DİKKAT')===0?'dikkat':'not',n)); });
      }
      bP.disabled=bE.disabled=bW.disabled=!son;
    }
    /* Seçim değişince hazırlanmış yazdırma alanı silinir. Sayfa kendiliğinden yenilenirse silinmez:
       telefonda yazdırma ekranı açıkken silinirse PDF boş çıkabilir. */
    kap.addEventListener('change',alanSil);
    listeCiz(); ciz();
  }

  return {sayfa:sayfa,birimler:birimler,hazirla:hazirla,excel:excel,word:word,yazdirAlani:yazdirAlani,temiz:temiz};
})();

/* DİKKAT: Bu dosyadaki kurallar eski uygulamadan (index.html v234) aynen kopyalanmıştır.
   Amaç: "Bugün" sayılarının iki uygulamada aynı çıkması. Eskide bir kural değişirse burada da değişmeli. */
window.Hesap=(function(){
    /* summaryData'nın eski uygulamada dışarıdan aldığı bağlantılar */
    var DATA=null, LK={byRec:{}}, buildLinks=function(){};
    function today(){ return new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10); }
    function trd(s){ return String(s==null?'':s).replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase(); }
    function gunFark(a,b){ return Math.floor((Date.parse(a)-Date.parse(b))/864e5); }
    function vDate(s){ s=String(s==null?'':s).trim(); var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1]+'-'+m[2]+'-'+m[3]; m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/); if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2); return ''; }
    function vTr(iso){ return iso.slice(8)+'.'+iso.slice(5,7)+'.'+iso.slice(0,4); }
    function visitStats(DATAx,bugun){
      var byS={}; (DATAx.h||[]).forEach(function(h){ var d=vDate(h.tarih||(h.veri&&h.veri.hizmet_tarihi)); if(!d) return; (byS[h.sicil]||(byS[h.sicil]=[])).push(d); });
      return DATAx.f.map(function(f){
        var all=(byS[f.sicil]||[]).slice().sort().reverse(), past=all.filter(function(d){ return d<=bugun; }), fut=all.filter(function(d){ return d>bugun; }).reverse();
        var last=past[0]||'', days=last?gunFark(bugun,last):null, per=f.periyotGun||null, grace=per&&per>=28?7:0, state, late=0;
        if(!last) state='yok'; else if(!per) state='bil';
        else if(days>per+grace){ state='gec'; late=days-per-grace; }
        else if(days>=per*0.8) state='yak'; else state='ok';
        return {f:f,past:past,fut:fut,last:last,days:days,per:per,state:state,late:late};
      });
    }
    var DTYPES=[['risk_analizi_dosya','Risk Analizi'],['acil_durum_dosya','Acil Durum Planı'],['calisma_plani_dosya','Çalışma Planı'],['degerlendirme_plani_dosya','Değerlendirme Planı'],['egitim_plani_dosya','Eğitim Planı'],['tatbikat_plani_dosya','Tatbikat Planı'],['sozlesme_dosya','İSG Katip Sözleşmesi']];
    var TEHY={aztehlikeli:6,tehlikeli:4,coktehlikeli:2};
    function dayNum(iso){ return Math.floor(Date.UTC(+iso.slice(0,4),+iso.slice(5,7)-1,+iso.slice(8,10))/864e5); }
    function docEval(key,files,tehlike,bugun){
      if(!files||!files.length) return {s:'yok',msg:'Dosya yüklenmemiş',last:'',ad:''};
      var best=null; files.forEach(function(f){ var d=vDate(f&&f.tarih); if(d&&(!best||d>=best.d)) best={d:d,ad:(f&&f.ad)||''}; });
      if(!best) return {s:'bil',msg:'Dosya tarihi okunamadı',last:'',ad:''};
      var last=best.d, y=+bugun.slice(0,4), m=+bugun.slice(5,7), ly=+last.slice(0,4), lm=+last.slice(5,7), r={last:last,ad:best.ad,s:'ok',msg:'Güncel'};
      if(key==='risk_analizi_dosya'||key==='acil_durum_dosya'){
        var yil=TEHY[tehlike]||2, due=(ly+yil)+last.slice(4,10), kalan=dayNum(due)-dayNum(bugun);
        r.due=due;
        if(bugun>=due){ r.s='eski'; r.msg='Yenilenmeli (her '+yil+' yılda bir); yenileme tarihi '+vTr(due); }
        else if(kalan<=90){ r.s='yak'; r.msg=kalan+' gün sonra yenilenmeli ('+vTr(due)+')'; }
        else r.msg='Yenileme tarihi '+vTr(due);
      } else if(key==='calisma_plani_dosya'||key==='degerlendirme_plani_dosya'||key==='egitim_plani_dosya'){
        if(ly!==y){ r.s='eski'; r.msg='Bu yıl için güncellenmeli'; }
      } else if(key==='sozlesme_dosya'){
        if(ly!==y||lm!==m){ r.s='eski'; r.msg='Sözleşme dosyası aylık yenilenmeli'; }
      } else if(key==='tatbikat_plani_dosya'){
        if(y-ly>=1){ r.s='eski'; r.msg='Tatbikat yıllık yenilenmeli'; }
      }
      return r;
    }
    function reqP(calisan,tehlike){
      var c=parseInt(calisan,10)||0, t=0; if(c>=2001) t=6; else if(c>=1001) t=5; else if(c>=501) t=4; else if(c>=101) t=3; else if(c>=51) t=2; else if(c>=2) t=1;
      var dO=50, iO=20; if(tehlike==='coktehlikeli'){ dO=30; iO=10; } else if(tehlike==='tehlikeli'){ dO=40; iO=15; }
      var d=Math.ceil(c/dO); return {ilkyardimci:Math.ceil(c/iO), destek_elemani:d, calisan_temsilcisi:t, yanginci:d, arama_kurtarma:d};
    }
    var PERS=[['ilkyardimci','İlk yardımcı'],['destek_elemani','Destek elemanı'],['calisan_temsilcisi','Çalışan temsilcisi'],['yanginci','Yangıncı'],['arama_kurtarma','Arama kurtarma']];
    var EGY={aztehlikeli:3,tehlikeli:2,coktehlikeli:1};
    function staffStats(DATAx,bugun){
      var byS={}; (DATAx.h||[]).forEach(function(h){ var v=h.veri||{}, d=vDate(h.tarih||v.hizmet_tarihi); if(!d||d>bugun) return; (byS[h.sicil]||(byS[h.sicil]=[])).push({d:d,v:v}); });
      return DATAx.f.map(function(f){
        var hs=(byS[f.sicil]||[]).sort(function(a,b){ return a.d<b.d?1:(a.d>b.d?-1:0); }), r={f:f,n:hs.length,son:hs[0]||null,egitim:null,pers:[],tatbikat:'',persVar:false};
        hs.forEach(function(x){ var e=vDate(x.v.egitim_tarih); if(e&&(!r.egitim||e>r.egitim.d)) r.egitim={d:e,tamam:parseInt(x.v.egitimi_tamam_personel,10)||0,eksik:parseInt(x.v.egitimi_eksik_personel,10)||0,kisiler:x.v.egitim_alan_kisiler||''};
          if(String(x.v.tatbikat_yapildi)==='1'){ var t=vDate(x.v.tatbikat_yapilma_tarih)||x.d; if(t>r.tatbikat) r.tatbikat=t; } });
        if(r.son){ r.persVar=true; var need=reqP(f.calisan,f.tehlike); PERS.forEach(function(p){ var mev=parseInt(r.son.v['gerekli_'+p[0]],10)||0; if(mev<need[p[0]]) r.pers.push({t:p[1],k:p[0],mev:mev,gerekli:need[p[0]]}); }); }
        var yy=EGY[f.tehlike]; if(r.egitim&&yy){ r.egYil=yy; r.egDue=(+r.egitim.d.slice(0,4)+yy)+r.egitim.d.slice(4,10); r.egKalan=dayNum(r.egDue)-dayNum(bugun); r.egEski=bugun>=r.egDue; }
        return r;
      });
    }
    var CORE=['risk_analizi_dosya','acil_durum_dosya','calisma_plani_dosya','egitim_plani_dosya','sozlesme_dosya'];
    function summaryData(DATAx,bugun){
      var vs=visitStats(DATAx,bugun), ss=staffStats(DATAx,bugun), dM={}, uM={}, M={};
      (DATAx.d||[]).forEach(function(x){ dM[x.sicil]=x.docs; });
      DATAx.u.forEach(function(u){ if(u.state!=='acik') return; var g=uM[u.sicil]||(uM[u.sicil]={gec:0,yk:0}); if(u.termin&&u.termin<bugun){ g.gec++; var r=trd(u.onem); if(r==='kritik'||r==='yüksek') g.yk++; } });
      vs.forEach(function(v){ M[v.f.sicil]={f:v.f,v:v,pts:0,why:[],docBad:0}; });
      ss.forEach(function(x){ M[x.f.sicil].st=x; });
      Object.keys(M).forEach(function(k){
        var m=M[k], u=uM[k]||{gec:0,yk:0}, dd=dM[k], v=m.v, st=m.st;
        if(v.state==='gec'){ m.pts+=3; m.why.push('ziyaret '+v.late+' gün gecikmiş'); } else if(v.state==='yok'){ m.pts+=2; m.why.push('ziyaret kaydı yok'); }
        m.ug=u.gec; m.ugy=u.yk; if(u.yk){ m.pts+=2; m.why.push(u.yk+' yüksek/kritik uygunsuzluğun termini geçmiş'); } if(u.gec){ m.pts+=1; m.why.push(u.gec+' uygunsuzluğun termini geçmiş'); }
        if(dd&&Object.keys(dd).length){ CORE.forEach(function(key){ var e=docEval(key,dd[key],m.f.tehlike,bugun); if(e.s==='yok'||e.s==='eski') m.docBad++; }); if(m.docBad){ m.pts+=Math.min(m.docBad,3); m.why.push(m.docBad+' doküman eksik/yenilenmeli'); } }
        if(st){ if(st.pers.length){ m.pts+=1; m.why.push('personel görevlendirmesi eksik'); } if(!st.egitim){ m.eyok=true; m.pts+=1; m.why.push('eğitim kaydı yok'); } else if(st.egitim.eksik>0){ m.why.push(st.egitim.eksik+' kişi eğitim almadı'); } if(st.egitim&&st.egEski){ m.pts+=1; m.eyen=true; m.why.push('eğitim yenilenmeli ('+st.egYil+' yılda bir; son eğitim '+vTr(st.egitim.d)+')'); } }
      });
      var arr=Object.keys(M).map(function(k){ return M[k]; });
      try{ if(DATAx===DATA&&window.__evpApi){ buildLinks(); var seenU={}; arr.forEach(function(m){ var lk=LK.byRec[m.f.sicil]; if(!lk) return; var key=lk.fid+'|'+(lk.sube||''); if(seenU[key]) return; seenU[key]=1;
        var yy=EGY[m.f.tehlike], L=window.__evpApi.get(lk.fid,lk.sube||''), c={n:L.length,yok:0,eski:0,yakin:0}; if(!L.length) return;
        L.forEach(function(x){ var g=(x.egt||[]).filter(function(y){ return y&&y.t; }); if(!g.length){ c.yok++; return; } if(!yy) return; var last=g.map(function(y){ return y.t; }).sort().pop(), due=(+last.slice(0,4)+yy)+last.slice(4,10), kal=dayNum(due)-dayNum(bugun); if(kal<=0) c.eski++; else if(kal<=60) c.yakin++; });
        m.pk=c; if(c.eski){ m.kyen=true; m.pts+=1; m.why.push(c.eski+' kişinin eğitimi yenilenmeli (kişi kayıtları)'); } if(c.yakin) m.why.push(c.yakin+' kişide eğitim yenilemesi yaklaşıyor (60 gün içinde)'); if(c.yok) m.why.push(c.yok+' kişide eğitim kaydı girilmemiş'); }); } }catch(e){}
      return {rows:arr, c:{kyen:arr.filter(function(m){return m.kyen;}).length, gec:arr.filter(function(m){return m.v.state==='gec';}).length, yok:arr.filter(function(m){return m.v.state==='yok';}).length, ug:arr.filter(function(m){return m.ug>0;}).length, doc:arr.filter(function(m){return m.docBad>0;}).length, pers:arr.filter(function(m){return m.st&&m.st.pers.length;}).length, egy:arr.filter(function(m){return m.eyok;}).length, eyen:arr.filter(function(m){return m.eyen;}).length}};
    }
    function ozet(data,baglanti,bugun){ DATA=data; LK=baglanti; return summaryData(data,bugun); }
    return {ozet:ozet,today:today,trd:trd,vTr:vTr,visitStats:visitStats,docEval:docEval,staffStats:staffStats,DTYPES:DTYPES,CORE:CORE,EGY:EGY,dayNum:dayNum};
})();

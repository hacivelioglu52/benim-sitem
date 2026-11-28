# DEVİR NOTU (26.11.2026 gece)

## Kişi / kurallar
Kerem, İSG uzmanı, teknik değil: sade Türkçe. Önce açıkla, onay al, sonra yap, sonra rapor. Mesaj sonunda numaralı onay soruları.
Akkurtlar ayarları/şablonu, RD/sertifika akışı, "ADE" kısaltması: onaysız dokunma. Koton mağaza sayfalarına dokunma.
GitHub'a otomatik yükleme izni var (hacivelioglu52/benim-sitem). Her push öncesi `git pull --rebase`. Başka otomatik oturum da depoyu düzenleyebilir.
Her sürümde #appver ve sw.js CACHE artır. Teksen belirsiz = "yapılmamış". Doküman No/Revizyon yeni belgelerde boş.

## Eski uygulama (Kerem Sertifika)
index.html v234 (canlı). Yedek: dal `yedek-v234`, GERI_DON.md. Veri: localStorage isg-firms-v1, isg-evrak-v1, isg-evrakp-v1; IndexedDB teksen-takip (firms,hizmet,uyg,docs,meta), kerem-trash.

## Yeni uygulama kararı (Kerem onayladı)
1. Eskinin yanında ayrı klasör `/yeni/` (aynı tarayıcı verisini okur; eski çalışmaya devam eder).
2. Koton'dan haber gelene kadar yeni uygulamayı geliştir: önce iskelet (Bugün, Firmalar→Şube→Pano), sonra Personel, Evrak, Raporlar.
3. Yeni bir isim bulunacak (Kerem isim seçecek; çalışma adı "Yeni").
Her sayfa aynı şablon: başlık + tek cümle açıklama + yan yana küçük kutular, ayrıntı açılır pencerede. Akkurtlar RD/sertifika en sona.

## Koton 2026 Yıl Sonu Raporu (bitiş Aralık sonu)
Mağaza başına Koton şablonu, başlıklar değişmez, "Sağlık" boş (hekim). Dosyalar çalışma dizininde yoksa Kerem'den yeniden iste. Mağaza adı=Teksen adresi; uygunsuzluk sayıları 2026. Kerem periyodik kontrol, ölçüm vb. belgeleri yükleyecek; eksikleri raporla, genel değerlendirme taslağı yaz.

## Durum (27.11.2026)
- `/yeni/` yayına yüklendi: ad geçici olarak "Kerem İGU". Yeni sürüm 3. Eski uygulama v235.
- Hazır: Bugün, Firmalar → Şube → Pano; Teksen'e göre otomatik firma/şube kaydı (yalnız eksikler eklenir, yedek onayından sonra); elle firma/şube/personel ekleme ve düzenleme; internetsiz kullanım.
- Yeni uygulamada yok: silme, şube adı değiştirme, Teksen verisi alma (eski uygulamada). Akkurtlar kaydı yalnız görüntülenir.
- Sürüm kuralı: `yeni/index.html` içinde #appver ve `?v=`; `yeni/sw.js` içinde CACHE ve `?v=` birlikte artar.
- `yeni/hesap.js` eski uygulamadaki uyarı kurallarının kopyasıdır; biri değişirse diğeri de değişmeli. `yeni/kayit.js` otomatik kayıt kuralı eskideki ile aynı olmalı.
- v235: eski uygulama, firma listesi başka sekmede değiştiyse üzerine yazmaz. `isg-firms-v1` yazan yeni kod `firmaYaz()` / `saveFirms()` kullanmalı.
- Tespit (değiştirilmedi): index.html içinde `window.__PWA=false` olduğu için eski uygulama sw.js'yi yeni cihazda kaydetmiyor.
- GERI_DON.md'de yazan `yedek-v234-2026-11-26` etiketi uzak depoda görünmüyor; `yedek-v234` dalı var.
- Sonraki aşama: Personel, Evrak, Raporlar.

## Yeni sürüm 4 ve çalışma sırası (27.11.2026)
- Öncelik yeni uygulamayı tamamlamak. Eski uygulamada yalnız gerekirse ve önce onay alarak çalışılır.
- Yapıldı: yeni ana sayfa; Ayarlar altında yedek alma / geri yükleme (`yeni/yedek.js`, eski yedek biçimiyle iki yönlü uyumlu). Eskideki BK yedek listesine anahtar eklenirse `yedek.js` de güncellenmeli.
- Onaylanan sıra: (2) Personel: tüm kişiler, arama, toplu ekleme, eğitim tarihleri, geri alınabilir silme; (3) Teksen verisi alma ve kalan firma/şube işlemleri; (4) Evrak; (5) Eğitim; (6) Raporlar, Teksen OSGB, araçlar, kalan ayarlar; en son Akkurtlar RD/sertifika.
- Koton belgeleri erken gelirse Koton raporu öne alınır.
- Onay: her adım testten geçince ayrıca sormadan yüklenebilir. Eski uygulama, Akkurtlar veya veri silme riski taşıyan işlerde yine önce onay alınır.
- Kaşe görselleri yeni uygulamanın koduna eklenmeyecek.

## Yeni sürüm 5: Personel (27.11.2026)
- Yapıldı: tüm kişiler / şube personeli, arama, eğitim durumu süzgeçleri, tekli ve yapıştırarak toplu ekleme (önizlemeli), tekli ve toplu eğitim tarihi girme, kişi silme ve geri alma (`yeni/personel.js`).
- Silinenler eski uygulamayla ortak (`kerem-trash`, tür `kisi`, 30 gün). Yeni uygulama kopya kaydedilemezse silmez.
- Kişi eğitim durumu kuralı eskideki `egState` ile aynı; biri değişirse diğeri de değişmeli.
- Henüz yok: dosyadan (Excel/PDF/resim) toplu ekleme, Teksen'deki eğitim tarihlerini kişilere işleme, eğitim kaydı silme (eski uygulamada).
- Sıradaki: (3) Teksen verisi alma ve kalan firma/şube işlemleri.

## Yeni sohbete devir (27.11.2026, 14.02)
- **Yeni sohbet kuralı (Kerem):** Sohbet uzarsa yeni sohbete geçilir. Bunun için: (1) bu not güncellenir ve yüklenir, (2) yeni sohbete yazılacak mesaj kopyalanabilir tek bir kutu içinde hazırlanır, (3) o mesaja bu kural da eklenir. Sohbeti asistan kendisi açamıyorsa bunu söyler; Kerem açar.
- Güncel durum: `/yeni/` sürüm 5, eski uygulama v235. Adım 3'ün incelemesi bitti; uygulama dosyaları ve kayıtlar değiştirilmedi. **Aşağıdaki plan henüz onaylanmadı.**
- Yeni uygulama kuralları: Akkurtlar yalnız görüntülenir (personeli ve Teksen kayıtları dahil). TC kimlik no gösterilmez ve istenmez; düzenlemede mevcut değer korunur. Kullanıcıdan yedek dosyasını GitHub'a ya da sohbete yüklemesi istenmez.

### Adım 3 inceleme bulguları (eski index.html, "Takip merkezi" bölümü)
- Teksen alma: `parse`, `plan`, `periyot`, `importText`. `plan` kayıt yazmaz, yalnız yazılacakları ve raporu hesaplar. Alma silme yapmaz; aynı kimlikli kayıtları günceller. Tek işlemde yazılır; meta `son` ve `gunluk`. İrtibat bilgisi seçeneği varsayılan kapalı.
- Teksen kaydı silme (`askDel`): silinenler kopyası alınamazsa da siliyor.
- Firma silmek Teksen kayıtlarını silmez; kayıtlar boşta kalır ve otomatik kayıt (eskide `autoBind`, yenide `Kayit.otomatik`) firmayı yeniden oluşturabilir.
- Şube adı değiştirme (incelenen satır) yalnız sb/sbi/sbp günceller; personel (`fid|sube`) ve `link:` kayıtları taşınmaz.

### Adım 3 planı (onay bekliyor)
- 3a (sürüm 6): Teksen verisi alma. Kurallar eskiden birebir kopyalanır (hesap.js yöntemi); yazmadan önce özet gösterilir; onaydan önce yedek indirilir; tek işlemde yazılır; irtibat kapalı; sonra otomatik kayıt çalışır. Akkurtlar'ın mevcut Teksen kayıtlarının güncellenip güncellenmeyeceği Kerem'e soruldu (öneri: yeni uygulama güncellemesin).
- 3b (sürüm 7): firma/şube pasife alma, arşivleme, geri açma. Silme yalnız Teksen kaydı bağlı olmayan firma/şubede; silinenler kopyası kaydedilemezse silinmez. Şube adı değiştirme, toplu silme ve Teksen verisi silme şimdilik eski uygulamada.
- 3b'de karar verilmedi / sonraya: firma kopyalama ve listede elle sıralama.

### Testler
- Önceki testler çalışma ortamındaki geçici klasördeydi, depoda yok; yeni sohbette gerekirse yeniden yazılmalı. `yeni/hesap.js` üreten betik de (eski index.html'den işlevleri birebir kopyalar) aynı durumda.
- Gerçek telefonda ve gerçek veriyle deneme yapılmadı. Kerem, yeni "Bugün" sayılarının eskiyle aynı olduğunu henüz doğrulamadı.

## Yeni sürüm 6: Teksen verisi alma (27.11.2026)
- Kerem onayladı: sürüm 6 planı, Akkurtlar'ın mevcut Teksen kayıtlarının değişmemesi, silme sınırlamalı sürüm 7 planı. (Yukarıdaki "plan onay bekliyor" notu geçersiz.)
- Yapıldı: `yeni/teksen.js` + Ana sayfa / Bugün / Ayarlar'da "Teksen verisi al". Özet → yedek indirme → onay → tek işlemde yazma → otomatik firma/şube kaydı. İrtibat varsayılan kapalı.
- teksen.js içindeki "KOPYA" bölümü eski index.html'den harfi harfine alındı; eskide değişirse burada da değişmeli.
- Akkurtlar: ada, SGK numarasına veya elle bağa göre Akkurtlar'a ait girdiler hiç yazılmaz (yeni kayıtlar da). Güncelleme eski uygulamadan.
- Uydurma veriyle tarayıcı testi geçti (eski/yeni kayıt karşılaştırması dahil). Gerçek veriyle ve telefonda denenmedi.
- Sürüm 7 için ayrıca onay istendi (aşağıda).

## Yeni sürüm 7: firma/şube işlemleri (27.11.2026, Kerem onayıyla yüklendi)
- Pasife alma, arşivleme, geri açma; Teksen kaydı bağlı olmayan firma/şubede silme; "Silinenler"den geri alma (eskiyle ortak `kerem-trash`, tür `firm` / `sube`). Kopya kaydedilemezse silinmez. Akkurtlar kapalı.
- Yeni uygulamada yok: şube adı değiştirme, toplu silme, Teksen verisi silme, firma kopyalama, elle sıralama.
- Adım 3 tamamlandı. Sıradaki: (4) Evrak.
- Şimdi: Kerem kendi cihazında gerçek veriyle ilk denemeyi yapacak (yedek, Bugün sayılarını eskiyle karşılaştırma, Teksen alma özeti). Sonuç henüz bilinmiyor. Canlı sitenin sürümü asistan tarafından doğrulanamadı.
- Test betikleri ve `yeni/teksen.js` üreten betik depoda değil (çalışma ortamında).

## Yeni sohbete devir (28.11.2026, 00.52)
- Güncel durum: `/yeni/` sürüm 7, eski uygulama v235. Kerem sayfada "sürüm 7" yazısını gördüğünü bildirdi.
- Yeni uygulama adresi (Kerem'e verildi): https://hacivelioglu52.github.io/benim-sitem/yeni/
- Sıradaki iş: Kerem'in cihazında gerçek veriyle ilk deneme. A, B, C adımlarının sonucu **henüz bildirilmedi**; kayıtlarının bu adreste göründüğü de doğrulanmadı.
  - A: eski uygulamada "Sürüm 235", yedek indir, diğer sekmeleri kapat (karşılaştırma için bir tane kalsın).
  - B: yenide "Yedek aldım, kayıtları başlat" görünüyorsa bas (basınca eksik firma/şube otomatik eklenir).
  - C: yeni veri almadan önce eski ve yeni "Bugün" sayılarını karşılaştır. Fark varsa dur. Aynıysa eski sekmeyi kapat.
  - D: "Teksen'den al" yer imi → yenide "Teksen verisi al" → "Özeti göster". **Kaydetmeden önce** sayıları ve uyarıları birlikte kontrol et.
- Kerem'den firma adı, kişi bilgisi, yedek dosyası veya Teksen çıktısı istenmez; sayılar yeterli.
- Bu denemeden sonra: adım (4) Evrak (önce inceleme ve plan, onayla).

### Sohbet kuralları (her yeni sohbette geçerli)
- Sade Türkçe. Önce açıkla, onay al, sonra yap, sonra rapor ver. Mesaj sonunda onay soruları numaralı.
- Cevabı boş olan onay sorusu varsa o işe başlamadan önce sor.
- Yeni sohbet kuralı: yukarıdaki "Yeni sohbet kuralı (Kerem)" maddesi.

## Gerçek veriyle ilk deneme + yeni sürüm 8 (28.11.2026)
- Kerem'in bildirdiği sonuç: A yapıldı. B: "Yedek aldım, kayıtları başlat" düğmesine basılmış; firma ve şubeler doğru görünüyor. C: "Bugün"deki tüm veriler eskiyle aynı.
- D **beklemede**: Kerem sorunun Teksen tarafında olduğunu bildirdi. Teksen düzelince: yer imi → yenide "Teksen verisi al" → "Özeti göster"; kaydetmeden önce sayı ve uyarılar birlikte kontrol edilecek.
- Sürüm 8 (Kerem onayladı): "Belge uyarısı" penceresinde Risk Analizi, Acil Durum Planı (Kerem: "ADEP"), Çalışma Planı, Eğitim Planı listeleri. Her listede "Eksik veya yenilenecek" ve ayrı "Kontrol edilmeli (tarih okunamadı)". "Tüm belge uyarıları" listesi de duruyor. Yalnız görüntüleme; `yeni/hesap.js` ve Bugün sayıları değişmedi.
- Uydurma veriyle tarayıcı testi geçti (sürüm 7 ile Bugün kutuları aynı, kayıtlar değişmedi). Gerçek veriyle ve telefonda henüz denenmedi.
- Bilinen sınır: Ana sayfada "Belge uyarısı" kutusu yalnız sayısı sıfırdan büyükse görünür; Bugün sayfasında hep görünür.
- **Açık soru:** Kerem "ayrıca toplu veri almada olsun" dedi; ne kastettiği netleşmedi. Netleşmeden yapılmayacak.

## Yeni sürüm 9: seçmeli Teksen alma (28.11.2026, Kerem onayıyla)
- Veri türü (firma/şube, hizmet, uygunsuzluk), 8 belge türü, firma/şube seçimi; tümünü seç/kaldır. İrtibat kapalı başlar ve yalnız firma/şube bilgisiyle alınır.
- Dönem: tüm zamanlar / bu yıl / geçen yıl / son 12 ay / iki tarih arası. Yalnız hizmet ve uygunsuzluğa uygulanır. Açık ve kayıtta açık görünüp kapanan uygunsuzluklar her dönemde alınır. Tarihi okunamayanlar alınır ve sayılır.
- Seçilmeyen veri yazılmaz. Zorunlu istisnalar: yeni kayıtta temel firma bilgisi; belge geçmişi olmayan kayıtta bir belge türü bile seçilirse tüm belge bilgileri.
- Kısmi alma `meta son R.kismi` içine yazılır; yeni uygulamada gösterilir, eski uygulama bu notu göstermez. Veri türü/dönem kısıtlıysa ayrıntılı değişiklik listesi tutulmaz.
- Kod: `yeni/teksen.js` içinde `secimUygula` (KOPYA bölümünün dışında; kopya değişmedi). teksen.js artık elle düzenleniyor, üreten betikle ezilmemeli.
- Uydurma veriyle tarayıcı testi geçti (tam seçimde kayıtlar, meta hariç, sürüm 8 ile aynı). Gerçek veri, gerçek yer imi çıktısı ve telefonda denenmedi. Betikler depoda değil.
- Kerem: yer iminden ek veri istemiyor. Sürüm 8 belge listelerine henüz bakmadı. D hâlâ beklemede (Teksen).

### Onaylı sıradaki iş: sürüm 10, rapor
- Uygulamada kayıtlı veriden, veri türü + firma/şube kutularıyla seçmeli rapor; **PDF, Excel ve Word** seçenekleri. Zaman dilimi seçilebilir. Akkurtlar rapora girmez. İrtibat seçilmedikçe girmez, TC no hiç yazılmaz. Rapor kayıt değiştirmez; verinin alınma tarihi ve kısmi alma notu yazılır.
- Önceki planda PDF için yazdırma ekranı ("PDF olarak kaydet") önerilip onaylandı. Telefonda denenmeli.
- PDF'den veri aktarma: Kerem "zaten yapılıyor" dedi; yeni iş açılmadı.

### Netleşmemiş (cevap gelmeden başlanmayacak)
- Kerem: uygunsuzluk kapanışı Teksen'i izlesin ("Teksen'de kapandıktan sonra kapanacak, burada işlem yapmayacağım") "yine de burada da işlem yapabileyim". Elle işlemin kapsamı belirsiz. Yeni uygulamada elle kapatma yok.
- Teksen'e yüklü belge dosyalarını indirme: cevap "b şuan için gerek gibi" ("gerek yok" mu "gerekli" mi belirsiz).
- Daha eski "toplu veri alma" sorusu netleşti: seçmeli alma (sürüm 9) ve rapor (sürüm 10).

## Yeni sürüm 10: seçmeli rapor (28.11.2026, Kerem onayıyla)
- Kerem'in onayları: dönem dışı açık uygunsuzluklar ayrı bölüm ve ayrı sayı; belge durumu seçmeli bölüm; pasif/arşiv normalde dışarıda, kutuyla eklenir; elle kapatma sonraya; Teksen'deki belge dosyalarını indirme **gerekmiyor**.
- Yapıldı: Ana sayfa "Raporlar" → `#raporlar` (`yeni/rapor.js`). PDF (yazdırma ekranı), Excel (.xlsx), Word (.docx). `yeni/jszip.min.js` eski index.html'deki JSZip 3.10.1'in aynen kopyası. Eski uygulama değişmedi.
- Dönem: hizmette hizmet tarihi, uygunsuzlukta tespit tarihi. Dönem dışında tespit edilip dönem içinde kapananlar rapora girmez. Açık/kapalı durumu bugünkü kayda göredir. Tarihi okunamayan hizmet kaydı alınır ve ayrı sayılır; tespit tarihi okunamayan uygunsuzluk ayrı bölümdedir. Teksen'de "silindi" olanlar rapora girmez, sayısı yazılır.
- Gizlilik: Akkurtlar girmez; yalnız kodda adı yazılan alanlar girer (kişi listeleri girmez); irtibat ve uygunsuzluk "sorumlu" alanı yalnız irtibat seçilirse; serbest metinde TC biçimli sayılar gizlenir, irtibat kapalıyken telefon ve e-posta da gizlenir. Ad soyad gibi metin içindeki bilgiler otomatik ayıklanamaz.
- Rapor yalnız Teksen kaydı olan firma/şubeleri kapsar (elle eklenip Teksen kaydı olmayanlar girmez).
- Belge durumu 7 belge türünü gösterir (eksik veya yenilenecek / yaklaşıyor / kontrol edilmeli).
- Uydurma veriyle tarayıcı testi geçti; Excel/Word LibreOffice'te açıldı. **Gerçek veri, telefon ve telefonda PDF kaydetme denenmedi.** Test betikleri depoda değil.

### Sonraki işler / bekleyenler
- D (gerçek Teksen alımı) beklemede (Teksen). Kerem sürüm 9'u sayfada henüz kontrol etmemişti.
- Elle uygunsuzluk kapatma (sürüm 10'dan sonra, ayrıca plan ve onay): öncelik Teksen'de, elle işlem isteğe bağlı. Öneri: yalnız bu uygulamada "kapatıldı" işareti; Teksen'e bir şey gönderilmez. Teksen'le çelişme durumu başlamadan sorulacak. Kerem: elle kapatma sonrası oluşan sayı farklarında karışıklık olursa yeniden düzenleme isteyebilir.

## Yeni istek (28.11.2026, 08.17): ziyaret akışlarını destekleyen uygulama — PLAN ONAY BEKLİYOR
Kerem: "yaptığım bu iş ve işlemlere yardımcı olacak destek verecek uygulama istiyorum". Henüz kod yazılmadı.

### A. İlk (yeni) firma/şube ziyareti
1. Yasal atama ve süre: İSG-KATİP sözleşme onayı; tehlike sınıfına göre aylık zorunlu süre.
2. Veri temini: NACE kodu/tehlike sınıfı, güncel SGK hizmet listesi, çalışan görev tanımları.
3. Saha gezisi ve analiz: tüm bölümler, tehlike fotoğrafları; makine, ekipman, kimyasal, çalışma yöntemi.
4. Temel dokümanlar: Risk Değerlendirmesi; ADEP ve tahliye krokileri; Yıllık Çalışma ve Eğitim Planı; Çalışan Temsilcisi ve Destek Elemanı (arama-kurtarma, yangın, ilk yardım) atama yazıları; alt işveren ve ziyaretçi İSG prosedürleri.
5. Temel İSG eğitimleri; KKD zimmet tutanakları; personel İSG dosyaları.
6. İşyeri hekimiyle EK-2 muayene planı; periyodik teknik kontroller (basınçlı kap, kaldırma, topraklama) ve ortam ölçümü takvimi.
7. İlk tespit ve öneriler İSG Onaylı Defteri'ne; işveren/vekiline imza.

### B. Periyodik ziyaret
1. Yetkiliyle görüşme: personel hareketi, iş kazası/ramak kala, ortam değişikliği (makine, proses, tadilat).
2. Yeni giriş: eğitim, KKD zimmeti, özlük evrakı; özel politika gerektiren gruplar için ek belge/önlem. Çıkış: temsilci, destek elemanı, ekip listeleri ve atamalar güncellenir.
3. Kaza/meslek hastalığı şüphesi: yasal bildirim süresi, kök neden analizi; ramak kala kaydı ve önleyici faaliyet.
4. Evrak, sağlık, teknik takip: İSG klasöründe eksikler; EK-2 geçerlilik; periyodik muayene ve ölçüm güncelliği; taşeron/bakım ekibi evrakı (SGK, eğitim, KKD).
5. Önceki uygunsuzlukların yerinde kontrolü ve saha denetimi.
6. 50 ve üzeri çalışanda İSG Kurulu; yeni tespit ve öneriler Onaylı Defter'e.

### Önerilen sıra (onaylanmadı)
- 11: "Ziyaret" ekranı: şube seç → İlk / Periyodik → adım listesi (yapıldı / eksik / gerekmiyor + not); uygulamadaki veriden hatırlatma; eksikler sonraki ziyarete taşınır; ziyaret özeti ve Onaylı Defter taslak metni (Kerem düzenler). Yedeğe dahil edilir (yedek.js; eski uygulamanın yeni anahtarı geri yükleyip yüklemediği kontrol edilmeli).
- 12: Takvim: periyodik teknik kontrol, ölçüm, EK-2 (yalnız tarih; sağlık sonucu/tanı tutulmaz).
- 13: Atama yazıları, KKD zimmeti (Kerem'in kendi şablonlarıyla).
- Sonra: kaza/ramak kala, taşeron evrakı, kurul, fotoğraf (cihaz alanı ve yedek boyutu incelenmeli).
- Yasal süre ve eşikler uygulamaya yazılmadan önce güncel mevzuattan doğrulanacak.
- Elle uygunsuzluk kapatma işi de bekliyor; sırası Kerem'e sorulacak.
- Akkurtlar'da ziyaret kaydı tutulup tutulmayacağı sorulacak (şimdiye kadar yeni uygulamada yalnız görüntüleme).

## Yeni sürüm 11: Ziyaret ekranı (28.11.2026, Kerem onayıyla)
- Kerem'in cevapları: Ziyaret ekranı sıradaki iş; Yapıldı/Eksik/Gerekmiyor + not + eksik taşıma uygun; cihazlar **telefon ve bilgisayar**; Akkurtlar için ziyaret notu tutulabilir (mevcut kayıt/şablon değişmez); Onaylı Defter için belli yazım biçimi **yok**. (Yukarıdaki "plan onay bekliyor" notu bu iş için geçersiz.)
- Yapıldı: `yeni/ziyaret.js`, `#ziyaret`, `#zform/<id>`, ana sayfa ve pano kutuları. İlk ziyaret 20, periyodik 16 iş. Adım kodları kayıtlarda saklanır, değiştirilmemeli. Adımlar Kerem'in akışıdır, mevzuat doğrulaması yapılmadı.
- Kayıt: localStorage `kigu-ziyaret-v1` (yalnız yeni uygulama). Yazdıkça kaydedilir. Silme geri alınabilir (süresiz, aynı kayıtta `silindi`).
- Taşıma: "Eksik" olanlar ve önceden kalıp işaretlenmeyenler yeni ziyarete geçer. Aynı yerde tek tamamlanmamış ziyaret olur. Liste ziyaret açılırken sabitlenir.
- Yedek: `yedek.js` içinde `ziyaret` bölümü; geri yüklemede ziyaretler **birleştirilir** (son değiştirilen kalır). Eski uygulamanın yedeğinde bu bölüm yok ve eski uygulama bu kayda dokunmaz.
- Akkurtlar ziyaret kayıtları raporlara girmez (raporda ziyaret formu verisi hiç yok).
- Uydurma veriyle tarayıcı testi geçti (telefon ve bilgisayar genişliği; firma/personel/Teksen kayıtları değişmedi). Gerçek veri ve gerçek telefonda denenmedi. Test betikleri depoda değil.

### Açık konu: iki cihaz (onay bekliyor)
- Şu an ziyaretleri diğer cihaza geçirmenin tek yolu tam yedek yüklemek; bu, firma/personel/Teksen kayıtlarını da yedektekiyle değiştirir.
- Firma kimlikleri cihazlarda ayrı ayrı oluşturulduysa farklıdır; aktarılan ziyaret listede görünür ama oradaki firmaya bağlanmaz (hatırlatma ve eksik taşıma çalışmaz).
- Öneri (sürüm 12): "Yalnız ziyaretleri aktar" (dışa/içe), birleştirmeli; firma eşleştirme SGK sicil no ile, gerekirse ad+şube ile ve onaylatarak.

## İki cihaz: kendiliğinden eşitleme isteği (28.11.2026, 08.28) — ONAY BEKLİYOR, kod yazılmadı
Kerem: "ikisi de aynı olmalı, ayrıca iş yükü olmamalı". Elle dosya aktarma önerisi (sürüm 12) bu yüzden geçersiz. Aktarım iki yönlü olacak.
- Öneri: ayrı, **gizli (private)** bir GitHub deposu; veri cihazda parola ile şifrelenip yüklenir. Her cihazda bir kez erişim anahtarı (yalnız o depo, içerik oku/yaz) + parola; sonrası kendiliğinden. İnternet yoksa sonra eşitlenir. Herkese açık benim-sitem deposuna veri yazılmaz.
- Aşama 1: yalnız ziyaretler (firma eşleştirme SGK no ile; emin olunmayan sorulur). Aşama 2: firma/şube ve personel (silme ve çakışma kuralları ayrıca planlanacak; eski uygulamadaki değişiklikler dahil). Teksen verisi ayrıca değerlendirilecek.
- Riskler: veri yurt dışı sunucuya gider (KVKK yurt dışı aktarım; şifreleme hukuki yükümlülüğü kaldırır diye söylenemez, uzmana/OSGB'ye sorulmalı). Parola unutulursa buluttaki kopya açılamaz. Anahtar cihazda saklanır; aynı github.io adresindeki sayfalar aynı depolamayı görür. Git geçmişi eski şifreli sürümleri tutar. TC alanı eşitlemeye alınmamalı.
- Akkurtlar eşitlemeye girip girmeyeceği sorulacak.
- Cevapsız: Kerem iki cihazda kullanmaya başladı mı; bilgisayardaki kayıtlar telefon yedeğinden mi, ayrı mı oluştu?

## Yeni sürüm 12: ziyaret eşitleme, 1. aşama (28.11.2026, Kerem onayıyla)
(Yukarıdaki "Açık konu: iki cihaz" ve "ONAY BEKLİYOR" eşitleme notları bu iş için geçersiz.)
- Kerem'in cevapları: eşitleme onaylı, **gerçek veriyle**; "KVKK bilgilendirmesi mevcut personelde"; Akkurtlar ziyaretleri eşitlensin; bilgisayar kayıtları "yedekle diye hatırlıyorum" (kesin değil); denemeyi en sonda Kerem yapacak.
- KVKK: yurt dışına aktarım dayanağı (m.9) doğrulanmadı / hukuki görüş alınmadı. Aydınlatmanın tek başına yeterli sayılacağı söylenmemeli.
- Yapıldı: `yeni/esitle.js`, `#esitle` (Ayarlar → İki cihaz eşitleme). Gizli GitHub deposunda `ziyaretler.sifreli.json`; PBKDF2-SHA256 600.000 + AES-GCM. Parola saklanmaz; erişim anahtarı ve dışa çıkarılamayan şifre anahtarı IndexedDB `kigu-esit`; yedeğe girmez. Depo herkese açıksa veya `benim-sitem` ise gönderilmez.
- Eşitleme zamanı: açılışta, yazdıktan ~10 sn sonra, sekmeye dönünce/ayrılınca, internet gelince, açıkken 2 dakikada bir. Uygulama kapalıyken çalışmaz.
- Birleştirme alan alan (üç yönlü). İki cihaz aynı yazıyı değiştirirse ikisi de tutulur ("[Diğer cihazda yazılan]:"). Aynı işin Yapıldı/Eksik seçimi iki cihazda farklıysa son değiştirilen kayıt kazanır. İki cihazda internetsiz ayrı ayrı açılan iki ziyaret ikisi de kalır.
- Firma eşleştirme: aynı kimlik → SGK sicil no → firma adı + şube (tek aday); emin değilse ziyaret formunda kullanıcı seçer. Firma/personel/Teksen kayıtları yazılmaz.
- Uydurma veri + taklit GitHub ile iki cihaz tarayıcı testi geçti. **Gerçek GitHub, gerçek veri ve gerçek telefonda denenmedi.** Test betikleri depoda değil.
- Not: eski uygulama bazı işlerde dış kaynaktan (jsdelivr, cdnjs) kütüphane yüklüyor; aynı adresteki kod cihaz kayıtlarına erişebilir. Anahtar yalnız eşitleme deposuna izinli olmalı.
- Kerem'den erişim anahtarı veya parola **sohbette istenmez**.

### Bekleyenler
- Kerem: gizli depo + erişim anahtarı + iki cihazda kurulum. Sonra sürüm 10, 11, 12 denemesi.
- TC kimlik no: Kerem "tc kuralı olmasın. kişi izin vermedikçe yazmıyorum" dedi. Eski "TC gösterilmez/istenmez" kuralı kalkıyor; öneri: personel ekle/düzenle ekranına isteğe bağlı, boş TC alanı (raporlara girmez). Kapsam onayı bekliyor, kod yazılmadı.
- Eşitleme 2. aşama (firma/şube, personel) ayrıca planlanacak. D (Teksen) beklemede. Elle uygunsuzluk kapatma bekliyor.

## 28.11.2026 öğleden sonra: kurulum ve çalışma şekli
- Kerem iki cihazda eşitlemeyi kurdu ("eşitlendi" / "telefon eşitlendi"). Gerçek cihazlar arasında kayıt geçişi **denenmedi**.
- Kerem'in çalışma şekli: ziyarette veriyi **önce Teksen'e** girer, sonra bu uygulamaya alır; Teksen'e girmeden burada işlem yapmaz. Genelde **bilgisayardan** alır. Teksen sayfası hâlâ çalışmıyor (hafta sonu).
- Ziyaret ekranı kalsın.

## Yeni sürüm 13: isteğe bağlı TC (28.11.2026, Kerem onayıyla)
- Eski "TC gösterilmez/istenmez" kuralı değişti. Tekli ekleme, düzenleme ve toplu eklemede "Ekle / Ekleme", varsayılan **Ekleme**. Toplu eklemede satır bazında boşaltılabilir.
- Numara listelerde, kişi penceresinde, aramada, raporlarda gösterilmez. Düzenlemede eski numara gösterilmez; değiştirme ve silme seçeneği var. Yalnız 11 rakam ve ilk hane 0 değil kontrolü (doğrulama algoritması yok). Zaten kayıtlı kişinin numarası toplu eklemeyle değişmez.
- TC yedek dosyasına girer; ziyaret eşitlemesine girmez (personel eşitlenmiyor).
- Uydurma veriyle tarayıcı testi geçti (eşitleme testi de yeniden geçti). Gerçek veri ve telefonda denenmedi.

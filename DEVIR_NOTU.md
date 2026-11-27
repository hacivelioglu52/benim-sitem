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

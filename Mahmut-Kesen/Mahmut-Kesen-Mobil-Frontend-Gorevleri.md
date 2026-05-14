# Mahmut Kesen'in Mobil Frontend Görevleri
**Mobile Front-end Demo Videosu:** [Link buraya eklenecek](https://example.com)

## 1. İçerik Detaylarını Görüntüleme Ekranı
- **Görev:** Film veya dizi detaylarının tüm bilgilerini (özet, tür, oyuncular) gösteren ekranın tasarımı
- **UI Bileşenleri:**
  - Backdrop ve Poster görselleri (Image components)
  - Film başlığı, vizyon tarihi ve süresi (ThemedText)
  - Tür etiketleri (Custom Chips/Badges)
  - Oyuncu listesi (Horizontal FlatList)
- **Kullanıcı Deneyimi:**
  - Veri yüklenirken ActivityIndicator gösterimi
  - Smooth scroll için Parallax efektleri

## 2. İçeriğe Puan Verme (Rating) Arayüzü
- **Görev:** Kullanıcının içeriğe 1-5 arası yıldız puanı vermesini sağlayan görsel modül
- **UI Bileşenleri:**
  - İnteraktif Yıldız Barı (Touchable icons)
  - Puan onay butonu (Custom Button)
- **Kullanıcı Deneyimi:**
  - Yıldızlara tıklandığında anlık renk değişimi ve animasyon

## 3. Favorilere Ekleme (Like) Fonksiyonu
- **Görev:** İçeriği kullanıcının "Favorilerim" listesine ekleme/çıkarma buton tasarımı
- **UI Bileşenleri:**
  - Kalp ikonu (Ionicons: heart vs heart-outline)
- **Kullanıcı Deneyimi:**
  - Tıklandığında kalbin dolması/boşalması (Haptic feedback)

## 4. İzlenecekler Listesine Ekleme (Watchlist) Butonu
- **Görev:** İçeriğin "İzleyeceklerim" listesine kaydedilmesi için UI bileşeni
- **UI Bileşenleri:**
  - "İzleneceklere Ekle" (Bookmark) butonu
- **Kullanıcı Deneyimi:**
  - Başarılı ekleme sonrası Toast/Alert mesajı

## 5. İzlenecekler Listesinden Çıkarma Aksiyonu
- **Görev:** Watchlist'ten içerik kaldırma işlemi için kullanıcı arayüzü
- **UI Bileşenleri:**
  - Liste ekranında silme butonu veya Long-press (basılı tutma) menüsü
- **Kullanıcı Deneyimi:**
  - Silme öncesi onay dialog'u (Confirm Alert)

## 6. İnceleme/Yorum Yazma (Review) Formu
- **Görev:** Film hakkında metin tabanlı yorum yapma arayüzü tasarımı
- **UI Bileşenleri:**
  - Multiline TextInput (Klavye yönetimi ile birlikte)
  - Gönder (Submit) butonu
- **Validasyon:**
  - Boş yorum girilirse görsel hata uyarısı

## 7. İnceleme Silme Arayüzü
- **Görev:** Kullanıcının kendi yaptığı yorumu silmesi için gerekli UI elemanları
- **UI Bileşenleri:**
  - Yorum kartı üzerinde "Sil" (Trash) ikonu
- **Kullanıcı Deneyimi:**
  - Silme işlemi biter bitmez yorumun listeden kaybolması (Optimistic UI)

## 8. İzlediklerim Listesine Ekleme (Log) İkonu
- **Görev:** İzlenen filmlerin geçmişe ("İzlediklerim") kaydedilmesi arayüzü
- **UI Bileşenleri:**
  - "İzledim" (Checkmark) ikonu veya butonu
- **Kullanıcı Deneyimi:**
  - İkonun aktif/pasif durumuna göre renk değişimi

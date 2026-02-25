# Ali Tutar'ın Mobil Frontend Görevleri
**Mobile Front-end Demo Videosu:** [Link buraya eklenecek](https://example.com)

## 1. Üye Olma (Kayıt) Ekranı
- **API Endpoint:** `POST /auth/register`
- **Görev:** Kullanıcı kayıt işlemi için mobil ekran tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - Email input alanı (keyboard type: email)
  - Şifre input alanı (secure text entry, şifre gücü göstergesi)
  - Şifre tekrar input alanı (doğrulama için)
  - Ad (firstName) input alanı
  - Soyad (lastName) input alanı
  - "Kayıt Ol" butonu
  - "Zaten hesabınız var mı? Giriş Yap" linki
  - Loading indicator (kayıt işlemi sırasında)
- **Form Validasyonu:**
  - Email format kontrolü (real-time validation)
  - Şifre güvenlik kuralları (min 8 karakter, büyük/küçük harf, rakam)
  - Şifre eşleşme kontrolü
  - Ad ve soyad boş olamaz kontrolü
  - Tüm alanlar doldurulmadan buton disabled
- **Kullanıcı Deneyimi:**
  - Form hatalarını alan altında gösterilmesi
  - Başarılı kayıt sonrası success mesajı ve otomatik giriş ekranına yönlendirme
  - Hata durumlarında kullanıcı dostu mesajlar (409 Conflict: "Bu email zaten kullanılıyor")
  - Keyboard dismiss işlevi
  - ScrollView kullanımı (klavye açıldığında içerik kaybolmasın)
- **Teknik Detaylar:**
  - Platform: Android (Jetpack Compose/XML) veya iOS (SwiftUI/UIKit)
  - State management (form state, loading state, error state)
  - Navigation (kayıt ekranından giriş ekranına geçiş)
  - Accessibility desteği (content descriptions, labels)

## 2. Kullanıcı Profil Görüntüleme Ekranı
- **API Endpoint:** `GET /users/{userId}`
- **Görev:** Kullanıcı profil bilgilerini görüntüleme ekranı tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - Profil fotoğrafı alanı (placeholder veya gerçek fotoğraf)
  - Kullanıcı adı ve soyadı (büyük başlık)
  - Email adresi (ikonlu)
  - Telefon numarası (ikonlu, varsa)
  - Hesap oluşturulma tarihi
  - "Profili Düzenle" butonu
  - "Hesabı Sil" butonu (kırmızı, alt kısımda)
  - Pull-to-refresh özelliği
- **Kullanıcı Deneyimi:**
  - Loading skeleton screen (veri yüklenirken)
  - Empty state (veri yoksa)
  - Error state (yükleme hatası durumunda retry butonu)
  - Smooth scroll animasyonları
  - Profil fotoğrafı için placeholder avatar
- **Teknik Detaylar:**
  - Lazy loading (büyük profil fotoğrafları için)
  - Image caching
  - State management (user data, loading, error states)
  - Navigation (profil düzenleme ekranına geçiş)
  - Deep linking desteği (profil paylaşımı için)

## 3. Kullanıcı Profil Düzenleme Ekranı
- **API Endpoint:** `PUT /users/{userId}`
- **Görev:** Kullanıcı profil bilgilerini düzenleme ekranı tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - Profil fotoğrafı düzenleme (seçme/değiştirme butonu)
  - Ad (firstName) input alanı (mevcut değerle dolu)
  - Soyad (lastName) input alanı (mevcut değerle dolu)
  - Email input alanı (mevcut değerle dolu, düzenlenebilir)
  - Telefon numarası input alanı (mevcut değerle dolu, format maskesi)
  - "Kaydet" butonu (sağ üst köşe veya alt kısımda)
  - "İptal" butonu (sol üst köşe)
  - Değişiklik yapıldığında "Kaydet" butonu aktif olur
- **Form Validasyonu:**
  - Email format kontrolü
  - Telefon numarası format kontrolü (ülke kodu desteği)
  - Real-time validation feedback
  - Değişiklik yoksa "Kaydet" butonu disabled
- **Kullanıcı Deneyimi:**
  - Optimistic update (kaydet butonuna basıldığında UI anında güncellenir)
  - Başarılı güncelleme sonrası success snackbar/toast
  - Hata durumunda error mesajı ve değişiklikler geri alınır
  - "İptal" butonuna basıldığında değişiklik kaybı için onay dialog'u
  - Keyboard dismiss işlevi
- **Teknik Detaylar:**
  - Form state management (initial values, edited values)
  - Image picker entegrasyonu (galeri/kamera)
  - Image compression (upload için)
  - Navigation (geri dönüş, kaydetme sonrası profil ekranına dönüş)
  - Unsaved changes warning

## 4. Hesap Silme Akışı
- **API Endpoint:** `DELETE /users/{userId}`
- **Görev:** Kullanıcı hesabını silme işlemi için UI akışı tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - "Hesabı Sil" butonu (profil ekranında, kırmızı renkli)
  - Onay dialog'u (destructive action için)
  - Şifre doğrulama ekranı (güvenlik için opsiyonel)
  - Son onay ekranı (uyarı mesajları ile)
  - "Emin misiniz?" dialog'u (çift onay mekanizması)
- **Kullanıcı Deneyimi:**
  - Destructive action için görsel uyarılar (kırmızı renk, ikonlar)
  - Açık ve net uyarı mesajları ("Bu işlem geri alınamaz")
  - İptal seçeneği her zaman mevcut
  - Silme işlemi sırasında loading indicator
  - Başarılı silme sonrası logout ve login ekranına yönlendirme
- **Akış Adımları:**
  1. Profil ekranında "Hesabı Sil" butonuna tıklama
  2. İlk uyarı dialog'u gösterilmesi
  3. Onaylandığında şifre doğrulama (opsiyonel)
  4. Son onay ekranı (detaylı uyarılar)
  5. Silme işlemi gerçekleştirme
  6. Başarılı silme sonrası logout ve login ekranına yönlendirme
- **Teknik Detaylar:**
  - Dialog/Modal component kullanımı
  - Multi-step flow yönetimi
  - Error handling (silme başarısız olursa)
  - Logout işlemi entegrasyonu
  - Navigation reset (login ekranına dönüş)

# Ali Tutar'ın Web Frontend Görevleri
**Front-end Test Videosu:** [Link buraya eklenecek](https://example.com)

## 1. Üye Olma (Kayıt) Sayfası
- **API Endpoint:** `POST /auth/register`
- **Görev:** Kullanıcı kayıt işlemi için web sayfası tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - Responsive kayıt formu (desktop ve mobile uyumlu)
  - Email input alanı (type="email", autocomplete="email")
  - Şifre input alanı (type="password", şifre gücü göstergesi)
  - Şifre tekrar input alanı (doğrulama için)
  - Ad (firstName) input alanı (autocomplete="given-name")
  - Soyad (lastName) input alanı (autocomplete="family-name")
  - "Kayıt Ol" butonu (primary button style)
  - "Zaten hesabınız var mı? Giriş Yap" linki
  - Loading spinner (kayıt işlemi sırasında)
  - Form container (card veya centered layout)
- **Form Validasyonu:**
  - HTML5 form validation (required, pattern attributes)
  - JavaScript real-time validation
  - Email format kontrolü (regex pattern)
  - Şifre güvenlik kuralları (min 8 karakter, büyük/küçük harf, rakam)
  - Şifre eşleşme kontrolü
  - Ad ve soyad boş olamaz kontrolü
  - Tüm alanlar geçerli olmadan buton disabled
  - Client-side ve server-side validation
- **Kullanıcı Deneyimi:**
  - Form hatalarını input altında gösterilmesi (inline validation)
  - Başarılı kayıt sonrası success notification ve otomatik giriş sayfasına yönlendirme
  - Hata durumlarında kullanıcı dostu mesajlar (409 Conflict: "Bu email zaten kullanılıyor")
  - Form submission prevention (double-click koruması)
  - Accessible form labels ve ARIA attributes
  - Keyboard navigation desteği (Tab, Enter)
- **Teknik Detaylar:**
  - Framework: React/Vue/Angular veya Vanilla JS
  - Form library: React Hook Form, Formik, veya native HTML5
  - State management (form state, loading state, error state)
  - Routing (kayıt sayfasından giriş sayfasına geçiş)
  - SEO optimization (meta tags, structured data)
  - Accessibility (WCAG 2.1 AA compliance)

## 2. Kullanıcı Profil Görüntüleme Sayfası
- **API Endpoint:** `GET /users/{userId}`
- **Görev:** Kullanıcı profil bilgilerini görüntüleme sayfası tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - Responsive profil layout (desktop: sidebar + content, mobile: stacked)
  - Profil fotoğrafı alanı (circular avatar, placeholder veya gerçek fotoğraf)
  - Kullanıcı adı ve soyadı (H1 heading)
  - Email adresi (icon + text, copy to clipboard özelliği)
  - Telefon numarası (icon + text, varsa)
  - Hesap oluşturulma tarihi (formatted date)
  - "Profili Düzenle" butonu (secondary button)
  - "Hesabı Sil" butonu (danger button, alt kısımda)
  - Refresh butonu veya auto-refresh
  - Breadcrumb navigation (opsiyonel)
- **Kullanıcı Deneyimi:**
  - Loading skeleton screen (veri yüklenirken)
  - Empty state (veri yoksa)
  - Error state (yükleme hatası durumunda retry butonu)
  - Smooth page transitions
  - Profil fotoğrafı için placeholder avatar (initials)
  - Responsive grid layout
  - Print-friendly styles
- **Teknik Detaylar:**
  - Lazy loading images (profil fotoğrafları için)
  - Image optimization (WebP format, responsive images)
  - Client-side caching (localStorage/sessionStorage)
  - State management (user data, loading, error states)
  - Routing (profil düzenleme sayfasına geçiş)
  - Deep linking desteği (profil paylaşımı için)
  - Meta tags (Open Graph, Twitter Cards)

## 3. Kullanıcı Profil Düzenleme Sayfası
- **API Endpoint:** `PUT /users/{userId}`
- **Görev:** Kullanıcı profil bilgilerini düzenleme sayfası tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - Responsive düzenleme formu
  - Profil fotoğrafı düzenleme alanı (drag & drop upload, preview)
  - Ad (firstName) input alanı (mevcut değerle dolu)
  - Soyad (lastName) input alanı (mevcut değerle dolu)
  - Email input alanı (mevcut değerle dolu, düzenlenebilir)
  - Telefon numarası input alanı (mevcut değerle dolu, format maskesi)
  - "Kaydet" butonu (primary button, sağ üst veya form altında)
  - "İptal" butonu (secondary button, sol üst veya form altında)
  - Değişiklik yapıldığında "Kaydet" butonu aktif olur
  - Unsaved changes indicator
- **Form Validasyonu:**
  - Email format kontrolü (real-time)
  - Telefon numarası format kontrolü (ülke kodu desteği, input masking)
  - Real-time validation feedback
  - Değişiklik yoksa "Kaydet" butonu disabled
  - File upload validation (image type, size limits)
- **Kullanıcı Deneyimi:**
  - Optimistic update (kaydet butonuna basıldığında UI anında güncellenir)
  - Başarılı güncelleme sonrası success notification (toast/snackbar)
  - Hata durumunda error mesajı ve değişiklikler geri alınır
  - "İptal" butonuna basıldığında değişiklik kaybı için browser confirmation dialog
  - Beforeunload event (sayfa kapatılırken uyarı)
  - Image preview (upload öncesi)
  - Progress indicator (image upload için)
- **Teknik Detaylar:**
  - Form state management (initial values, edited values, dirty state)
  - File upload component (drag & drop, file picker)
  - Image compression (client-side, before upload)
  - Image preview functionality
  - Routing (geri dönüş, kaydetme sonrası profil sayfasına dönüş)
  - Unsaved changes warning (browser navigation)
  - Form persistence (localStorage, draft saving)

## 4. Hesap Silme Akışı
- **API Endpoint:** `DELETE /users/{userId}`
- **Görev:** Kullanıcı hesabını silme işlemi için web UI akışı tasarımı ve implementasyonu
- **UI Bileşenleri:**
  - "Hesabı Sil" butonu (profil sayfasında, danger button style)
  - Modal dialog (destructive action için)
  - Şifre doğrulama alanı (güvenlik için opsiyonel)
  - Son onay ekranı (uyarı mesajları ile)
  - "Emin misiniz?" confirmation dialog (çift onay mekanizması)
  - Warning icons ve visual cues
- **Kullanıcı Deneyimi:**
  - Destructive action için görsel uyarılar (kırmızı renk, warning icons)
  - Açık ve net uyarı mesajları ("Bu işlem geri alınamaz")
  - İptal seçeneği her zaman mevcut (modal close, cancel button)
  - Silme işlemi sırasında loading indicator
  - Başarılı silme sonrası logout ve login sayfasına yönlendirme
  - Success message gösterilmesi
- **Akış Adımları:**
  1. Profil sayfasında "Hesabı Sil" butonuna tıklama
  2. İlk uyarı modal dialog'u gösterilmesi
  3. Onaylandığında şifre doğrulama (opsiyonel)
  4. Son onay ekranı (detaylı uyarılar, checkbox confirmation)
  5. Silme işlemi gerçekleştirme
  6. Başarılı silme sonrası logout ve login sayfasına yönlendirme
- **Teknik Detaylar:**
  - Modal/Dialog component kullanımı
  - Multi-step flow yönetimi (state machine veya step-based)
  - Error handling (silme başarısız olursa)
  - Logout işlemi entegrasyonu
  - Session storage ve localStorage temizleme
  - Redirect handling (login sayfasına dönüş)
  - Browser history management

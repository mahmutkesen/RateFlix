# Ali Tutar'ın Mobil Backend Görevleri
**Mobil Front-end ile Back-end Bağlanmış Test Videosu:** [Link buraya eklenecek](https://example.com)

## 1. Üye Olma (Kayıt) Servisi
- **API Endpoint:** `POST /auth/register`
- **Görev:** Mobil uygulamada kullanıcı kayıt işlemini gerçekleştiren servis entegrasyonu
- **İşlevler:**
  - Kullanıcı bilgilerini (email, password, firstName, lastName) toplama
  - Form validasyonu (email formatı, şifre güvenliği kontrolü)
  - API'ye POST isteği gönderme
  - Başarılı kayıt durumunda kullanıcıyı giriş ekranına yönlendirme
  - Hata durumlarını yakalama ve kullanıcıya gösterilmesi (409 Conflict, 400 Bad Request)
- **Teknik Detaylar:**
  - HTTP Client kullanımı (Retrofit/OkHttp - Android, URLSession/Alamofire - iOS)
  - Request/Response model sınıfları oluşturma
  - Error handling ve retry mekanizması
  - Loading state yönetimi

## 2. Kullanıcı Bilgilerini Görüntüleme Servisi
- **API Endpoint:** `GET /users/{userId}`
- **Görev:** Kullanıcı profil bilgilerini API'den çekip mobil uygulamada gösterme
- **İşlevler:**
  - JWT token ile kimlik doğrulama
  - Kullanıcı ID'sini kullanarak profil bilgilerini getirme
  - Gelen veriyi parse edip UI'da gösterme
  - Token süresi dolmuşsa refresh token ile yenileme
  - Offline durumda cache'den veri gösterme
- **Teknik Detaylar:**
  - Authentication header ekleme (Bearer Token)
  - Response caching stratejisi
  - Token refresh mekanizması
  - Error handling (401 Unauthorized, 403 Forbidden, 404 Not Found)

## 3. Kullanıcı Bilgilerini Güncelleme Servisi
- **API Endpoint:** `PUT /users/{userId}`
- **Görev:** Kullanıcı profil bilgilerini güncelleme işlemini gerçekleştirme
- **İşlevler:**
  - Profil düzenleme ekranından gelen verileri toplama
  - Form validasyonu (email formatı, telefon formatı vb.)
  - API'ye PUT isteği gönderme
  - Başarılı güncelleme sonrası cache'i güncelleme
  - Optimistic UI update (kullanıcı deneyimini iyileştirme)
- **Teknik Detaylar:**
  - Request body oluşturma (firstName, lastName, email, phone)
  - Partial update desteği (yalnızca değişen alanları gönderme)
  - Conflict resolution (eşzamanlı güncelleme durumları)
  - Error handling ve kullanıcı bildirimleri

## 4. Kullanıcı Silme Servisi
- **API Endpoint:** `DELETE /users/{userId}`
- **Görev:** Kullanıcı hesabını silme işlemini gerçekleştirme
- **İşlevler:**
  - Kullanıcıya silme işlemi için onay dialog'u gösterme
  - API'ye DELETE isteği gönderme
  - Başarılı silme sonrası local storage ve cache'i temizleme
  - Kullanıcıyı login ekranına yönlendirme
  - Token'ı geçersiz kılma
- **Teknik Detaylar:**
  - Destructive action için confirmation dialog
  - Local data cleanup (SharedPreferences/UserDefaults, cache, database)
  - Logout işlemi entegrasyonu
  - Error handling (401, 403, 404)

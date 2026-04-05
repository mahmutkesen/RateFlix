# Aytuğ Akay'ın Web Frontend Görevleri
**Front-end Test Videosu:** [Youtube](https://youtu.be/GaK-3ZdZjmQ)

# 🎬 Movie App - Functional Requirements

---

## 1. Kullanıcı Kayıt (Sign Up)

**API Endpoint:** `POST /api/auth/register`  
**Görev:** Kullanıcının sisteme kayıt olmasını sağlamak

### UI Bileşenleri
- Email input alanı
- Kullanıcı adı input alanı
- Şifre input alanı
- "Kayıt Ol" butonu
- Hata ve başarı mesaj alanı

### Form / Input
- email
- username
- password

### Kullanıcı Deneyimi
- Form validasyonu (boş alan kontrolü)
- Email format kontrolü
- Şifre kuralları (min uzunluk vb.)
- Başarılı kayıt sonrası yönlendirme
- Hata durumunda kullanıcıya mesaj gösterimi

### Teknik Detaylar
- API entegrasyonu
- Form state yönetimi
- Validation işlemleri

---

## 2. Kullanıcı Girişi (Login)

**API Endpoint:** `POST /api/auth/login`  
**Görev:** Kullanıcının sisteme giriş yapmasını sağlamak

### UI Bileşenleri
- Email / username input
- Şifre input
- "Giriş Yap" butonu
- Hata mesaj alanı

### Form / Input
- email veya username
- password

### Kullanıcı Deneyimi
- Hatalı girişte uyarı mesajı
- Başarılı giriş sonrası yönlendirme
- Loading state gösterimi

### Teknik Detaylar
- JWT / session yönetimi
- API entegrasyonu
- Token saklama (localStorage/cookie)

---

## 3. Film / Dizi Arama

**API Endpoint:** `GET /api/movies/search?q={query}`  
**Görev:** Kullanıcının arama yapabilmesini sağlamak

### UI Bileşenleri
- Arama input alanı
- Arama butonu (opsiyonel)
- Sonuç listesi (film kartları)

### Form / Input
- query (arama metni)

### Kullanıcı Deneyimi
- Anlık arama (debounce opsiyonel)
- Sonuçların liste halinde gösterimi
- Boş sonuç durumunda mesaj

### Teknik Detaylar
- API entegrasyonu
- State management
- Debounce / optimize arama

---

## 4. Şifre Sıfırlama (Password Reset)

**API Endpoint:** `POST /api/auth/forgot-password`  
**Görev:** Kullanıcının şifresini sıfırlayabilmesini sağlamak

### UI Bileşenleri
- Email input alanı
- "Şifre Sıfırla" butonu
- Bilgilendirme mesajı

### Form / Input
- email

### Kullanıcı Deneyimi
- Email girildiğinde geri bildirim
- Başarılı işlem sonrası bilgilendirme
- Hata durumunda mesaj

### Teknik Detaylar
- API entegrasyonu
- Email gönderim süreci (backend)
- Form state yönetimi

---

## 5. Kategori / Tür Bazlı Filtreleme

**API Endpoint:** `GET /api/movies?genre={genreId}`  
**Görev:** Filmleri türe göre filtrelemek

### UI Bileşenleri
- Kategori dropdown / filter menü
- Film listeleme alanı

### Form / Input
- genreId

### Kullanıcı Deneyimi
- Filtre seçildiğinde liste güncellenir
- Aktif filtre gösterimi

### Teknik Detaylar
- API entegrasyonu
- Query param yönetimi
- State güncelleme

---

## 6. Popüler İçerikleri Listeleme (Trending)

**API Endpoint:** `GET /api/movies/popular`  
**Görev:** Popüler içerikleri listelemek

### UI Bileşenleri
- Film listeleme (grid / slider)
- Başlık alanı (Trending)

### Kullanıcı Deneyimi
- Otomatik yükleme
- Kaydırılabilir liste (carousel opsiyonel)

### Teknik Detaylar
- API entegrasyonu
- State management

---

## 7. En Yüksek Puan Alanları Listeleme (Top Rated)

**API Endpoint:** `GET /api/movies/top-rated`  
**Görev:** En yüksek puanlı içerikleri listelemek

### UI Bileşenleri
- Film listeleme alanı
- Puan gösterimi

### Kullanıcı Deneyimi
- Azalan sıralama
- Kullanıcıya net puan bilgisi

### Teknik Detaylar
- API entegrasyonu
- Sorting (backend kaynaklı)

---

## 8. Admin Kullanıcı Silme (Delete User)

**API Endpoint:** `DELETE /api/admin/users/{userId}`  
**Görev:** Adminin bir kullanıcıyı sistemden silmesi

### UI Bileşenleri
- "Kullanıcıyı Sil" butonu
- Onay modalı (confirmation dialog)

### Kullanıcı Deneyimi
- Yanlışlıkla silmeyi önlemek için onay
- Başarılı işlem sonrası geri bildirim
- Hata durumunda mesaj

### Teknik Detaylar
- Admin yetkilendirme kontrolü
- API entegrasyonu
- State güncelleme

---

## ⚙️ Genel Notlar
- Tüm işlemler rol bazlı yetkilendirme gerektirebilir  
- API çağrıları sonrası UI state güncellenmelidir  
- Responsive tasarım desteklenmelidir  
- Kullanıcı deneyimi ön planda tutulmalıdır
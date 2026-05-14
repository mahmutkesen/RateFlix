# Aytuğ Akay'ın Mobil Backend Görevleri
**Mobil Front-end ile Back-end Bağlanmış Test Videosu:** [Link buraya eklenecek](https://example.com)

## 1. Kullanıcı Kayıt (Sign Up) Servis Entegrasyonu
- **API Endpoint:** `POST /auth/register`
- **Görev:** Yeni kullanıcı verilerinin veritabanına işlenmesi
- **Teknik İşlemler:**
  - Şifrelerin Bcrypt ile tek yönlü hashlenmesi
  - Benzersiz email ve username kontrolü
  - Veritabanı (MongoDB) kayıt işlemi

## 2. Kullanıcı Giriş (Login) Servis Entegrasyonu
- **API Endpoint:** `POST /auth/login`
- **Görev:** JWT tabanlı oturum açma ve yetkilendirme
- **Teknik İşlemler:**
  - Şifre doğrulaması
  - 24 saat geçerli JWT (JSON Web Token) üretimi
  - Başarılı girişte kullanıcı objesinin döndürülmesi

## 3. Yorum Beğenme (Review Like) Servis Entegrasyonu
- **API Endpoint:** `POST /reviews/:id/like`
- **Görev:** Sosyal etkileşim verisinin backend tarafında yönetilmesi
- **Teknik İşlemler:**
  - Yorumun beğeni sayısının atomik olarak artırılması
  - İşlemin RabbitMQ bildirim kuyruğuna iletilmesi

## 4. Film/Dizi Arama Servis Entegrasyonu
- **API Endpoint:** `GET /movies/search`
- **Görev:** Arama sonuçlarının Redis desteğiyle sunulması
- **Teknik İşlemler:**
  - TMDB search endpoint entegrasyonu
  - Arama sonuçlarının Redis'te 1 saatlik (TTL) önbelleğe alınması

## 5. Kategori/Tür Filtreleme Servis Entegrasyonu
- **API Endpoint:** `GET /movies/discover`
- **Görev:** Tür bazlı veri çekme logic'i
- **Teknik İşlemler:**
  - Genre ID'lerine göre TMDB API filtreleme
  - Verinin mobil için optimize edilmesi

## 6. Popüler İçerik (Trending) Servis Entegrasyonu
- **API Endpoint:** `GET /movies/trending`
- **Görev:** Trend verilerinin sunucu tarafında çekilmesi
- **Teknik İşlemler:**
  - TMDB `/trending/all/day` endpoint'inin kullanılması
  - Caching (Redis) ile sunucu yükünün azaltılması

## 7. En Yüksek Puanlılar (Top Rated) Servis Entegrasyonu
- **API Endpoint:** `GET /movies/top_rated`
- **Görev:** En iyi puanlı içeriklerin listelenmesi
- **Teknik İşlemler:**
  - Puan sıralı verinin TMDB'den çekilmesi
  - Hızlı erişim için veritabanı veya önbellek optimizasyonu

## 8. Admin Kullanıcı Silme Servis Entegrasyonu
- **API Endpoint:** `DELETE /admin/users/:id`
- **Görev:** Yönetici yetkisiyle kullanıcı verisi silme
- **Teknik İşlemler:**
  - Role-based Access Control (Sadece 'admin' yetkisi kontrolü)
  - Kullanıcının ilişkili verilerinin (liste, yorum) temizlenmesi

### 1. Kullanıcı Girişi (Login)
**API Metodu:** `POST /api/auth/login`  
**Açıklama:** Kayıtlı kullanıcıların sisteme erişmesini sağlar. Başarılı girişte bir JWT (JSON Web Token) veya session anahtarı döner.

---

### 2. İçerik Detaylarını Görüntüleme
**API Metodu:** `GET /api/movies/{movieId}`  
**Açıklama:** Filmin adı, afişi, konusu, oyuncu kadrosu, ortalama puanı ve toplam oy veren kişi sayısı gibi detayları getirir.

---

### 3. İnceleme/Yorum Yazma (Review)
**API Metodu:** `POST /api/reviews`  
**Açıklama:** Kullanıcının bir film hakkında metin tabanlı bir yazı paylaşmasını sağlar. Puanlama ile ilişkilendirilebilir.

---

### 4. Şifre Sıfırlama (Password Reset)
**API Metodu:** `POST /api/auth/forgot-password`  
**Açıklama:** Şifresini unutan kullanıcıların e-posta yoluyla geçici bir kod veya link alarak şifrelerini yenilemelerini sağlar.

---

### 5. İnceleme Silme
**API Metodu:** `DELETE /api/reviews/{reviewId}`  
**Açıklama:** Kullanıcının kendi yorumunu veya bir yöneticinin kurallara aykırı bir yorumu sistemden kaldırmasını sağlar.

---

### 6. İzlediklerim Listesine Ekleme (Log)
**API Metodu:** `PUT /api/users/{userId}/watched`  
**Açıklama:** Bir içeriği kullanıcının "İzlediklerim" (Watched) geçmişine ekler. İzlenme tarihi opsiyonel olarak tutulur.

---

### 7. Kategori/Tür Bazlı Filtreleme
**API Metodu:** `GET /api/movies?genre={genreId}`  
**Açıklama:** Filmlerin "Korku", "Bilim Kurgu", "Komedi" gibi türlere göre filtrelenerek getirilmesini sağlar.

---

### 8. Popüler İçerikleri Listeleme (Trending)
**API Metodu:** `GET /api/movies/popular`  
**Açıklama:** Belirli bir zaman diliminde (günlük/haftalık) en çok izlenen veya en çok puanlanan filmleri listeler.
### 1. Kullanıcı Kayıt (Sign Up)  
**API Metodu:** `POST /api/auth/register`  
**Açıklama:** Kullanıcıların e-posta, kullanıcı adı ve şifre ile sisteme dahil olmasını sağlar. Veritabanında yeni bir kullanıcı nesnesi oluşturulur.

---

### 2. Kullanıcı Girişi (Login)
**API Metodu:** `POST /api/auth/login`  
**Açıklama:** Kayıtlı kullanıcıların sisteme erişmesini sağlar. Başarılı girişte bir JWT (JSON Web Token) veya session anahtarı döner.


---

### 3. Film/Dizi Arama  
**API Metodu:** `GET /api/movies/search?q={query}`  
**Açıklama:** Kullanıcının girdiği anahtar kelimeye göre başlık, yönetmen veya oyuncu bazlı arama sonuçlarını listeler.

---

### 4. Yorum Beğenme (Review Like)
**API Metodu:** `POST /api/reviews/{reviewId}/like`  
**Açıklama:** Kullanıcıların diğer kişilerin yaptığı yorumları beğenmesini sağlar. Aynı isteğin tekrar atılması beğeniyi geri alacaktır.

---

### 5. Kategori/Tür Bazlı Filtreleme
**API Metodu:** `GET /api/movies?genre={genreId}`  
**Açıklama:** Filmlerin "Korku", "Bilim Kurgu", "Komedi" gibi türlere göre filtrelenerek getirilmesini sağlar.

---

### 6. Popüler İçerikleri Listeleme (Trending)
**API Metodu:** `GET /api/movies/popular`  
**Açıklama:** Belirli bir zaman diliminde (günlük/haftalık) en çok izlenen veya en çok puanlanan filmleri listeler.

---

### 7. En Yüksek Puan Alanları Listeleme (Top Rated)  
**API Metodu:** `GET /api/movies/top-rated`  
**Açıklama:** Kullanıcı oylarının aritmetik ortalamasına göre en yüksek puanlı filmleri azalan sırada getirir.

---

### 8. Admin Kullanıcı Silme (Delete User)
**API Metodu:** `DELETE /api/admin/users/{userId}`

**Açıklama:** Admin yetkisine sahip hesabın, bir kullanıcıyı sistemden tamamen silmesini sağlar.

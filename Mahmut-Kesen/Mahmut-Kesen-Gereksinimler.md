
### 1. Kullanıcı Kayıt (Sign Up)  
**API Metodu:** `POST /api/auth/register`  
**Açıklama:** Kullanıcıların e-posta, kullanıcı adı ve şifre ile sisteme dahil olmasını sağlar. Veritabanında yeni bir kullanıcı nesnesi oluşturulur.

---

### 2. Film/Dizi Arama  
**API Metodu:** `GET /api/movies/search?q={query}`  
**Açıklama:** Kullanıcının girdiği anahtar kelimeye göre başlık, yönetmen veya oyuncu bazlı arama sonuçlarını listeler.

---

### 3. İçeriğe Puan Verme (Rating)  
**API Metodu:** `POST /api/movies/{movieId}/rate`  
**Açıklama:** Kullanıcının bir filme 1 ile 5 yıldız (0.5 hassasiyetli olabilir) arasında puan vermesini sağlar.

---

### 4. İzlenecekler Listesine Ekleme (Watchlist)  
**API Metodu:** `PUT /api/users/{userId}/watchlist`  
**Açıklama:** Kullanıcının gelecekte izlemek istediği filmleri kaydettiği listeye içerik ekler.

---

### 5. İzlenecekler Listesinden Çıkarma  
**API Metodu:** `DELETE /api/users/{userId}/watchlist/{movieId}`  
**Açıklama:** Bir film izlendiğinde veya vazgeçildiğinde Watchlist'ten kaldırılmasını sağlar.

---

### 6. En Yüksek Puan Alanları Listeleme (Top Rated)  
**API Metodu:** `GET /api/movies/top-rated`  
**Açıklama:** Kullanıcı oylarının aritmetik ortalamasına göre en yüksek puanlı filmleri azalan sırada getirir.

---

### 7. Favorilere Ekleme (Like)  
**API Metodu:** `POST /api/movies/{movieId}/like`  
**Açıklama:** Kullanıcının bir filmi "Favori" olarak işaretlemesini sağlar (Letterboxd'daki kalp butonu).

---

### 8. Özel Liste Oluşturma (Custom Lists)  
**API Metodu:** `POST /api/lists`  
**Açıklama:** Kullanıcının "2024 Favorilerim" veya "Hafta Sonu Filmleri" gibi isimlerle özel film listeleri oluşturmasını sağlar.
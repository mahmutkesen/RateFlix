
### 1. İçeriğe Puan Verme (Rating)  
*API Metodu:* POST /api/movies/{movieId}/rate  
*Açıklama:* Kullanıcının bir filme 1 ile 5 yıldız (0.5 hassasiyetli olabilir) arasında puan vermesini sağlar.

---

### 2. İzlenecekler Listesine Ekleme (Watchlist)  
API Metodu: PUT /api/users/{userId}/watchlist  
Açıklama: Kullanıcının gelecekte izlemek istediği filmleri kaydettiği listeye içerik ekler.

---
### 3. İzlenecekler Listesinden Çıkarma  
*API Metodu:* DELETE /api/users/{userId}/watchlist/{movieId}  
*Açıklama:* Bir film izlendiğinde veya vazgeçildiğinde Watchlist'ten kaldırılmasını sağlar.

---
### 4. Favorilere Ekleme (Like)  
*API Metodu:* POST /api/movies/{movieId}/like  
*Açıklama:* Kullanıcının bir filmi "Favori" olarak işaretlemesini sağlar (Letterboxd'daki kalp butonu).

---

### 5. İçerik Detaylarını Görüntüleme
*API Metodu:* GET /api/movies/{movieId}  
*Açıklama:* Filmin adı, afişi, konusu, oyuncu kadrosu, ortalama puanı ve toplam oy veren kişi sayısı gibi detayları getirir.

---

### 6. İnceleme/Yorum Yazma (Review)
*API Metodu:* POST /api/reviews  
*Açıklama:* Kullanıcının bir film hakkında metin tabanlı bir yazı paylaşmasını sağlar. Puanlama ile ilişkilendirilebilir.

---

### 7. İnceleme Silme
*API Metodu:* DELETE /api/reviews/{reviewId}  
*Açıklama:* Kullanıcının kendi yorumunu veya bir yöneticinin kurallara aykırı bir yorumu sistemden kaldırmasını sağlar.

---

### 8. İzlediklerim Listesine Ekleme (Log)
*API Metodu:* PUT /api/users/{userId}/watched  
*Açıklama:* Bir içeriği kullanıcının "İzlediklerim" (Watched) geçmişine ekler. İzlenme tarihi opsiyonel olarak tutulur.

---
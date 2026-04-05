# Mahmut Kesen'in Web Frontend Görevleri
**Front-end Test Videosu:** [Youtube](https://youtu.be/PHR6K7M1KrQ)

# 🎬 Movie App - Functional Requirements

---

## 1. İçeriğe Puan Verme (Rating)

**API Endpoint:** `POST /api/movies/{movieId}/rate`  
**Görev:** Kullanıcının bir filme puan verebilmesini sağlamak

### UI Bileşenleri
- Yıldız bazlı puanlama komponenti (1–5 arası)
- 0.5 hassasiyetli seçim (yarım yıldız)
- "Puan Ver" butonu (opsiyonel, anlık da olabilir)
- Ortalama puanı gösteren alan
- Kullanıcının verdiği mevcut puanı gösterme

### Form / Input
- Rating değeri (1–5 arası, 0.5 artışlarla)

### Kullanıcı Deneyimi
- Anlık geri bildirim (hover efekti)
- Seçim sonrası UI güncellenmesi
- Daha önce verilen puanın güncellenebilmesi
- Hata durumunda mesaj gösterimi

### Teknik Detaylar
- State management (kullanıcı puanı)
- API entegrasyonu
- Optimistic update (opsiyonel)

---

## 2. İzlenecekler Listesine Ekleme (Watchlist)

**API Endpoint:** `PUT /api/users/{userId}/watchlist`  
**Görev:** Kullanıcının izlemek istediği filmleri listeye eklemesi

### UI Bileşenleri
- "Watchlist'e Ekle" butonu
- Durum göstergesi (ekli / ekli değil)
- Liste ikonları (bookmark vb.)

### Kullanıcı Deneyimi
- Tek tıkla ekleme
- Eklendiğinde görsel geri bildirim
- Aynı içeriğin tekrar eklenmesini engelleme

### Teknik Detaylar
- Kullanıcıya özel veri yönetimi
- API entegrasyonu
- State güncelleme

---

## 3. İzlenecekler Listesinden Çıkarma

**API Endpoint:** `DELETE /api/users/{userId}/watchlist/{movieId}`  
**Görev:** Kullanıcının watchlist’ten içerik kaldırabilmesi

### UI Bileşenleri
- "Listeden Çıkar" butonu
- Toggle (ekle/çıkar)

### Kullanıcı Deneyimi
- Tek tıkla kaldırma
- UI anında güncellenir
- Geri alma (undo) opsiyonu (opsiyonel)

### Teknik Detaylar
- API entegrasyonu
- State güncelleme

---

## 4. Favorilere Ekleme (Like)

**API Endpoint:** `POST /api/movies/{movieId}/like`  
**Görev:** Kullanıcının filmi favorilere eklemesi

### UI Bileşenleri
- Kalp (❤️) butonu
- Aktif/pasif state (dolu/boş kalp)

### Kullanıcı Deneyimi
- Tek tıkla favorileme
- Animasyonlu geri bildirim (opsiyonel)
- Durumun anlık değişmesi

### Teknik Detaylar
- API entegrasyonu
- Kullanıcı bazlı state yönetimi

---

## 5. İçerik Detaylarını Görüntüleme

**API Endpoint:** `GET /api/movies/{movieId}`  
**Görev:** Film detaylarını kullanıcıya göstermek

### UI Bileşenleri
- Film afişi
- Film adı
- Açıklama (overview)
- Oyuncu listesi
- Ortalama puan
- Toplam oy sayısı

### Kullanıcı Deneyimi
- Responsive detay sayfası
- Loading state (skeleton)
- Error state

### Teknik Detaylar
- API veri çekme
- State management
- Lazy loading (opsiyonel)

---

## 6. İnceleme / Yorum Yazma (Review)

**API Endpoint:** `POST /api/reviews`  
**Görev:** Kullanıcının film hakkında yorum yapabilmesi

### UI Bileşenleri
- Yorum input alanı (textarea)
- Puanlama alanı (opsiyonel)
- "Gönder" butonu

### Form / Input
- Yorum metni
- (Opsiyonel) rating

### Kullanıcı Deneyimi
- Anlık validation
- Başarılı gönderimde temizleme
- Yorum listesine anında ekleme

### Teknik Detaylar
- API entegrasyonu
- Form state yönetimi

---

## 7. İnceleme Silme

**API Endpoint:** `DELETE /api/reviews/{reviewId}`  
**Görev:** Kullanıcının kendi yorumunu silmesi

### UI Bileşenleri
- "Sil" butonu
- Onay dialog (opsiyonel)

### Kullanıcı Deneyimi
- Yanlışlıkla silmeyi önlemek için onay
- Silme sonrası UI güncelleme

### Teknik Detaylar
- API entegrasyonu
- State güncelleme

---

## 8. İzlediklerim Listesine Ekleme (Watched / Log)

**API Endpoint:** `PUT /api/users/{userId}/watched`  
**Görev:** Kullanıcının izlediği içerikleri kaydetmesi

### UI Bileşenleri
- "İzledim" butonu
- İzlenme tarihi seçici (opsiyonel)

### Form / Input
- movieId
- watchedDate (opsiyonel)

### Kullanıcı Deneyimi
- Tek tıkla ekleme
- Tarih seçimi opsiyonu
- Listeye anında yansıma

### Teknik Detaylar
- API entegrasyonu
- Kullanıcı geçmişi yönetimi

---

# ⚙️ Genel Notlar
- Tüm işlemler kullanıcıya özeldir  
- API çağrıları sonrası UI state güncellenmelidir  
- Responsive tasarım desteklenmelidir  
- Kullanıcı deneyimi ön planda tutulmalıdır  
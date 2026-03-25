# Mahmut Kesen'in REST API Metotları

**API Test Videosu:** [Link buraya eklenecek](https://example.com)

# 🎬 Movie App API Documentation

## 🎥 Movie Operations

### 1. Get Movie Details (İçerik Detaylarını Görüntüleme)
**Endpoint:** `GET /api/movies/{movieId}`

**Response:**
- `200 OK`

**Açıklama:**  
Filmin adı, afişi, konusu, oyuncu kadrosu, ortalama puanı ve toplam oy sayısı gibi bilgileri getirir.

---

### 2. Rate Movie (İçeriğe Puan Verme)
**Endpoint:** `POST /api/movies/{movieId}/rate`

**Request Body:**
    {
      "rating": 4.5
    }

**Açıklama:**
- 1 ile 5 arasında puan verilir  
- 0.5 hassasiyet desteklenir  

**Response:**
- `200 OK`

---

### 3. Like Movie (Favorilere Ekleme)
**Endpoint:** `POST /api/movies/{movieId}/like`

**Response:**
- `200 OK`

---

## 📌 Watchlist Operations

### 4. Add to Watchlist (İzlenecekler Listesine Ekleme)
**Endpoint:** `PUT /api/users/{userId}/watchlist`

**Request Body:**
    {
      "movieId": "string"
    }

**Response:**
- `200 OK`

---

### 5. Remove from Watchlist (İzlenecekler Listesinden Çıkarma)
**Endpoint:** `DELETE /api/users/{userId}/watchlist/{movieId}`

**Response:**
- `204 No Content`

---

## 📝 Review Operations

### 6. Add Review (Yorum Yazma)
**Endpoint:** `POST /api/reviews`

**Request Body:**
    {
      "movieId": "string",
      "content": "Harika bir filmdi!",
      "rating": 4.5
    }

**Response:**
- `201 Created`

---

### 7. Delete Review (Yorum Silme)
**Endpoint:** `DELETE /api/reviews/{reviewId}`

**Response:**
- `204 No Content`

---

## 🎞️ Watched List

### 8. Add to Watched (İzlediklerim Listesine Ekleme)
**Endpoint:** `PUT /api/users/{userId}/watched`

**Request Body:**
    {
      "movieId": "string",
      "watchedDate": "2026-03-25"
    }

**Response:**
- `200 OK`

---

## ⚙️ Notlar
- Puanlama 1–5 arasıdır (0.5 hassasiyetli)  
- Aynı filme tekrar puan verilirse güncellenir  
- Yorum ve puan birlikte kullanılabilir  
- Watchlist ve Watched listeleri kullanıcıya özeldir  
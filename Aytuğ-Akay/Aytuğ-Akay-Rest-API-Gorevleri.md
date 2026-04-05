# Aytuğ Akay'ın REST API Metotları

**API Test Videosu:** [Youtube](https://youtu.be/kWfPcJinwZY)

# 🎬 Movie App API Documentation

## 🔐 Authentication

### 1. Register (Kullanıcı Kayıt)
**Endpoint:** `POST /api/auth/register`

**Request Body:**
    {
      "email": "string",
      "username": "string",
      "password": "string"
    }

**Response:**
- `201 Created`

**Açıklama:**  
Kullanıcıların e-posta, kullanıcı adı ve şifre ile sisteme dahil olmasını sağlar.

---

### 2. Login (Kullanıcı Girişi)
**Endpoint:** `POST /api/auth/login`

**Request Body:**
    {
      "email": "string",
      "password": "string"
    }

**Response:**
- `200 OK`

**Açıklama:**  
Başarılı girişte JWT veya session anahtarı döner.

---

### 3. Like Review (Yorum Beğenme)
**Endpoint:** `POST /api/reviews/{reviewId}/like`

**Response:**
- `200 OK`

**Açıklama:**  
Kullanıcıların paylaşılan yorumları beğenmesini veya beğenisini geri çekmesini (toggle) sağlar.

---

## 🎥 Movie Operations

### 4. Search Movies (Film/Dizi Arama)
**Endpoint:** `GET /api/movies/search?q={query}`

**Response:**
- `200 OK`

**Açıklama:**  
Başlık, yönetmen veya oyuncuya göre arama yapar.

---

### 5. Filter by Genre (Kategori/Tür Filtreleme)
**Endpoint:** `GET /api/movies?genre={genreId}`

**Response:**
- `200 OK`

**Açıklama:**  
Filmleri türlerine göre filtreler.

---

### 6. Popular Movies (Trending)
**Endpoint:** `GET /api/movies/popular`

**Response:**
- `200 OK`

**Açıklama:**  
En popüler içerikleri listeler.

---

### 7. Top Rated Movies
**Endpoint:** `GET /api/movies/top-rated`

**Response:**
- `200 OK`

**Açıklama:**  
En yüksek puanlı filmleri listeler.

---

## 🛠️ Admin Operations

### 8. Delete User (Admin Kullanıcı Silme)
**Endpoint:** `DELETE /api/admin/users/{userId}`

**Response:**
- `204 No Content`

**Açıklama:**  
Admin yetkisi ile kullanıcı sistemden silinir.

---

## ⚙️ Notlar
- Authentication işlemleri JWT veya session ile yönetilir  
- Arama ve filtreleme işlemleri query parametreleri ile yapılır  
- Admin işlemleri yetki kontrolü gerektirir  
- Tüm endpointler RESTful standartlara uygundur
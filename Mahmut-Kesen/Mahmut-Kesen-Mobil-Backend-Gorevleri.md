# Mahmut Kesen'in Mobil Backend Görevleri
**Mobil Front-end ile Back-end Bağlanmış Test Videosu:** [Link buraya eklenecek](https://example.com)

## 1. İçerik Detay Servisi Entegrasyonu
- **API Endpoint:** `GET /movies/:id`
- **Görev:** Mobil uygulamaya TMDB'den çekilen veriyi JSON formatında sunma
- **Teknik İşlemler:**
  - TMDB API'ye istek atılması (Axios)
  - Gelen ham verinin mobil uygulama için sadeleştirilmesi (Mapping)
  - Hata yönetimi (404 Not Found)

## 2. Puanlama (Rating) Servis Entegrasyonu
- **API Endpoint:** `POST /reviews` (rating field)
- **Görev:** Kullanıcının verdiği puanı backend tarafında işleme
- **Teknik İşlemler:**
  - Puanın 1-5 arasında olduğunun kontrolü
  - Veritabanına (MongoDB) kayıt işlemi
  - Kullanıcının daha önce puan verip vermediğinin kontrolü

## 3. Favori Yönetim Servis Entegrasyonu
- **API Endpoint:** `POST /lists/favorites`
- **Görev:** Favori listesine ekleme/çıkarma logic'i
- **Teknik İşlemler:**
  - MongoDB `$addToSet` ile mükerrer kaydı önleme
  - JWT Token ile kullanıcı ID tespiti

## 4. Watchlist Ekleme Servis Entegrasyonu
- **API Endpoint:** `POST /lists/watchlist`
- **Görev:** İzlenecekler listesi için backend kaydı
- **Teknik İşlemler:**
  - "watchlist" tipindeki listenin bulunması veya oluşturulması
  - Yeni içerik ID'sinin listeye eklenmesi

## 5. Watchlist Çıkarma Servis Entegrasyonu
- **API Endpoint:** `DELETE /lists/:id/items/:tmdbId`
- **Görev:** Listeden ürün silme işleminin backend tarafında yönetilmesi
- **Teknik İşlemler:**
  - MongoDB `$pull` operatörü ile diziden eleman silme
  - Silme sonrası güncel listenin döndürülmesi

## 6. İnceleme Yazma Servis Entegrasyonu
- **API Endpoint:** `POST /reviews`
- **Görev:** Metin tabanlı yorumların backend'e iletilmesi
- **Teknik İşlemler:**
  - Yorum metninin sunucu tarafında temizlenmesi (Sanitization)
  - Yorumun RabbitMQ kuyruğuna (bildirimler için) fırlatılması

## 7. İnceleme Silme Servis Entegrasyonu
- **API Endpoint:** `DELETE /reviews/:id`
- **Görev:** Kullanıcının kendi yorumunu silme yetkisinin kontrolü
- **Teknik İşlemler:**
  - `req.user.id` ile yorumun sahibinin eşleştiğinin doğrulanması
  - Veritabanından (MongoDB) kalıcı silme

## 8. İzlediklerim (Log) Kayıt Servis Entegrasyonu
- **API Endpoint:** `POST /lists/watched`
- **Görev:** İzleme geçmişi (watched) verisinin backend'de yönetilmesi
- **Teknik İşlemler:**
  - İzleme tarihinin kaydedilmesi
  - "watched" listesinin güncellenmesi

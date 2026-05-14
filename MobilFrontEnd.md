# Mobil Frontend Görev Dağılımı

Bu dokümanda, mobil uygulamanın kullanıcı arayüzü (UI) ve kullanıcı deneyimi (UX) görevleri listelenmektedir. Her grup üyesi, kendisine atanan ekranların tasarımı, implementasyonu ve kullanıcı etkileşimlerinden sorumludur.

---

## Grup Üyelerinin Mobil Frontend Görevleri

1. [Mahmut Kesen'in Mobil Frontend Görevleri](Mahmut-Kesen/Mahmut-Kesen-Mobil-Frontend-Gorevleri.md)
2. [Aytuğ Akay'ın Mobil Frontend Görevleri](Aytuğ-Akay/Aytuğ-Akay-Mobil-Frontend-Gorevleri.md)

---

## Genel Mobil Frontend Prensipleri

### 1. Tasarım Sistemi
- **Renk Paleti:** Tutarlı renk kullanımı (primary, secondary, error, success)
- **Tipografi:** Okunabilir font boyutları ve ağırlıkları
- **Spacing:** Tutarlı padding ve margin değerleri (8dp/8pt grid sistemi)
- **Iconography:** Standart icon seti kullanımı (Ionicons / Material Icons)

### 2. Responsive Tasarım
- Farklı ekran boyutlarına uyum (phone, tablet)
- Landscape ve portrait mod desteği
- Safe area desteği (notch, status bar)

### 3. Kullanıcı Deneyimi (UX)
- **Loading States:** Skeleton screens, progress indicators
- **Error Handling:** Kullanıcı dostu hata mesajları
- **Empty States:** Boş durumlar için bilgilendirici mesajlar
- **Feedback:** Kullanıcı aksiyonlarına anında geri bildirim (toast, snackbar)

### 4. Erişilebilirlik (Accessibility)
- Content descriptions ve labels
- Touch target boyutları (min 44x44dp/pt)
- Screen reader desteği
- Yüksek kontrast modu desteği
- Font scaling desteği

### 5. Performans
- Lazy loading (liste görünümleri için)
- Image optimization ve caching
- Smooth animations (60 FPS hedefi)
- Memory management

### 6. Navigasyon
- Tutarlı navigation pattern (bottom navigation, tabs)
- Deep linking desteği
- Back button handling
- Navigation state yönetimi

### 7. Form Yönetimi
- Real-time validation
- Error mesajları alan altında gösterilmesi
- Keyboard handling (dismiss, next field focus)
- Form state persistence (opsiyonel)

### 8. Platform Özellikleri
- **Android:** Material Design 3 guidelines
- **iOS:** Human Interface Guidelines
- Platform-specific UI patterns kullanımı
- Native feel sağlanması
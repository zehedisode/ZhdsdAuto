# 🌊 ZhdsdAuto - Chrome Otomasyon Eklentisi

ZhdsdAuto, Chrome tarayıcısında sürükle-bırak yöntemiyle görsel otomasyon akışları oluşturmanızı sağlayan modern bir eklentidir.

## 📂 Proje Yapısı

Proje modüler bir mimariye sahiptir. Aşağıda temel klasörlerin ve dosyaların görevleri açıklanmıştır:

```text
/chrome-eklentisi
├── 📁 background/           # Arka plan işlemleri (Backend) (ES Modules)
│   ├── 📄 service-worker.js # Giriş noktası. Mesajlaşma ve pencere yönetimi.
│   ├── 📄 engine.js         # Ana otomasyon motoru (FlowEngine sınıfı).
│   └── 📁 modules/          # Engine'in alt parçaları
│       ├── 📄 actions.js    # Sayfa içi etkileşimler (Tıkla, Yaz, Oku).
│       ├── 📄 tabs.js       # Sekme yönetimi (Aç, Kapat, Değiştir).
│       └── 📄 utils.js      # Yardımcı fonksiyonlar (Bekleme, Interpolation).
│
├── 📁 dashboard/            # Kullanıcı Arayüzü (Frontend)
│   ├── 📄 index.html        # Ana panel HTML yapısı.
│   ├── 📄 dashboard.js      # UI mantığı ve olay dinleyicileri.
│   ├── 📄 dashboard.css     # Ana stil dosyası (Modülleri import eder).
│   ├── 📁 styles/           # Modüler CSS dosyaları (builder, layout, vb.).
│   └── 📁 modules/          # UI Modülleri
│       ├── 📄 constants.js  # Blok tanımları (JSON yapısı).
│       ├── 📄 ui-render.js  # HTML oluşturma ve çizim fonksiyonları.
│       ├── 📄 storage.js    # Kayıt/Yükleme işlemleri (Chrome Storage).
│       └── 📄 utils.js      # UI yardımcıları (ID oluşturma vb.).
│
├── 📁 content/              # Web sayfasına enjekte edilen scriptler
│   ├── 📄 visual-picker.js  # Element seçici mantığı.
│   └── 📄 picker.css        # Element seçici stili.
│
└── 📄 manifest.json         # Eklenti yapılandırma dosyası (V3).
```

## 🚀 Geliştirici Rehberi

### 1. Yeni Bir Blok Ekleme
Yeni bir otomasyon bloğu (örneğin "Mouse Tekerleği") eklemek için **iki dosyada** değişiklik yapmanız gerekir:

1.  **Tanımlama (`dashboard/modules/constants.js`):**
    *   Bloğun adını, iconunu, rengini ve parametrelerini (inputlar) burada tanımlayın.
    *   `type` anahtarı benzersiz olmalıdır (örn: `scrollWheel`).

2.  **Mantık (`background/engine.js`):**
    *   `executeBlock` metodundaki `switch` yapısına yeni `case` ekleyin.
    *   Eğer sayfa içi işlemse `background/modules/actions.js` dosyasındaki `switch` yapısına da ekleme yapın.

### 2. Modüler Yapı Hakkında
*   **CSS:** Tek bir devasa CSS yerine `dashboard/styles/` altındaki küçük dosyaları düzenleyin.
*   **Background:** `engine.js` dosyasını karmaşıklaştırmamak için yeni özellikleri `modules/` altına ekleyin.

### 3. Hata Ayıklama (Debugging)
*   **UI Hataları:** Dashboard penceresinde sağ tık -> "İncele" (Inspect) diyerek konsolu kontrol edin.
*   **Motor Hataları:** `chrome://extensions` sayfasında eklentinin "Hizmet Çalışanı" (Service Worker) linkine tıklayarak arka plan konsolunu açın.

## ⚠️ Kritik Noktalar
*   **Manifest V3:** Bu eklenti Manifest V3 kullanır. `activeTab` ve `scripting` izinleri kritiktir.
*   **ES Modules:** Background scriptleri `type: "module"` olarak çalışır. `require` yerine `import` kullanın.
*   **Güvenlik:** Kullanıcıdan alınan veriler (CSS Selector vb.) `executeScript` içinde kullanılmadan önce doğrulanmalıdır.

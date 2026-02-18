// ===================================================================
// BLOCK DEFINITIONS — TEK KAYNAK (Single Source of Truth)
// ===================================================================
/**
 * Tüm blok tanımları bu dosyadadır. Dashboard UI ve background engine
 * bu dosyayı referans alır. Yeni blok eklerken:
 * 
 * 1. `BLOCK_TYPES` objesine yeni bloğu ekleyin.
 * 2. `background/engine.js` → `executeBlock` switch-case'e `case` ekleyin.
 * 3. DOM etkileşimi gerekiyorsa: `background/modules/actions.js` → `execInContent`'e ekleyin.
 */
export const BLOCK_TYPES = {
    // INTERACTION
    click: {
        id: 'click',
        category: 'interaction',
        icon: '🖱️',
        name: 'Tıkla',
        color: '#3b82f6',
        description: 'Bir elemente tıklar',
        details: 'Belirtilen elemente sol tıklar. Eğer element görünmüyorsa önce kaydırır.\n• Seçici: Tıklanacak buton veya linkin CSS seçicisi.\n• İpucu: Tıklama gerçekleşmezse "Bekle" bloğu eklemeyi deneyin.',
        params: [
            { key: 'selector', label: 'Element', type: 'selector', required: true }
        ]
    },
    type: {
        id: 'type',
        category: 'interaction',
        icon: '⌨️',
        name: 'Yaz',
        color: '#3b82f6',
        description: 'Bir alana metin yazar',
        details: 'Input veya metin alanlarına yazı yazar.\n• Metin: Yazılacak içerik. Değişken kullanmak için *isim formatını kullanın.\n• Önce Temizle: Yazmadan önce içeriği siler.\n• İpucu: React/Vue sitelerinde de çalışır.',
        params: [
            { key: 'selector', label: 'Element', type: 'selector', required: true },
            { key: 'text', label: 'Metin', type: 'text', required: true, placeholder: 'örn: Merhaba *isim' },
            { key: 'clear', label: 'Önce Temizle', type: 'checkbox', default: false }
        ]
    },
    select: {
        id: 'select',
        category: 'interaction',
        icon: '📋',
        name: 'Seç',
        color: '#3b82f6',
        description: 'Açılır menüden seçim yapar',
        details: 'Dropdown (select) menülerinden seçim yapar.\n• Değer: Seçilecek opsiyonun "value" değeri veya görünen metni.',
        params: [
            { key: 'selector', label: 'Element', type: 'selector', required: true },
            { key: 'value', label: 'Değer', type: 'text', required: true }
        ]
    },
    scroll: {
        id: 'scroll',
        category: 'interaction',
        icon: '📜',
        name: 'Kaydır',
        color: '#3b82f6',
        description: 'Sayfayı aşağı/yukarı kaydırır',
        details: 'Sayfayı belirli piksel kadar kaydırır.',
        params: [
            { key: 'amount', label: 'Miktar (px)', type: 'number', default: 500 },
            { key: 'direction', label: 'Yön', type: 'select', options: ['aşağı', 'yukarı'], default: 'aşağı' }
        ]
    },
    hover: {
        id: 'hover',
        category: 'interaction',
        icon: '👆',
        name: 'Üzerine Gel',
        color: '#3b82f6',
        description: 'Mouse ile elementin üzerine gelir',
        details: 'Bir menünün açılması veya butonun renk değiştirmesi için mouse\'u elementin üzerinde gibi gösterir.',
        params: [
            { key: 'selector', label: 'Element', type: 'selector', required: true }
        ]
    },
    keyboard: {
        id: 'keyboard',
        category: 'interaction',
        icon: '⌨️',
        name: 'Tuş Gönder',
        color: '#3b82f6',
        description: 'Özel tuş kombinasyonu gönderir',
        details: 'Enter, ESC, Tab gibi özel tuşları simüle eder.\n• Seçici: Tuşun gönderileceği alan (boş bırakılırsa tüm sayfaya gönderir).',
        params: [
            { key: 'key', label: 'Tuş', type: 'select', options: ['Enter', 'Escape', 'Tab', 'Space', 'Backspace', 'ArrowDown', 'ArrowUp'], default: 'Enter' },
            { key: 'modifier', label: 'Kombinasyon', type: 'select', options: ['yok', 'Ctrl', 'Alt', 'Shift'], default: 'yok' },
            { key: 'selector', label: 'Hedef Element (Opsiyonel)', type: 'selector' }
        ]
    },

    // PAGE
    navigate: {
        id: 'navigate',
        category: 'page',
        icon: '🌐',
        name: 'Sayfaya Git',
        color: '#10b981',
        description: 'Belirtilen URL\'ye gider',
        details: 'Tarayıcıyı belirtilen adrese yönlendirir.\n• URL: Tam adres girin (https://...). Değişken kullanabilirsiniz (örn: *link).',
        params: [
            { key: 'url', label: 'URL Adresi', type: 'text', placeholder: 'https://...', required: true }
        ]
    },
    newTab: {
        id: 'newTab',
        category: 'page',
        icon: '📑',
        name: 'Yeni Sekme',
        color: '#10b981',
        description: 'Yeni bir sekme açar',
        details: 'Yeni bir tarayıcı sekmesi açar.\n• URL: Boş bırakılırsa boş sayfa açılır.',
        params: [
            { key: 'url', label: 'URL (Opsiyonel)', type: 'text', placeholder: 'https://...' },
            { key: 'active', label: 'Öne Getir', type: 'checkbox', default: true }
        ]
    },
    activateTab: {
        id: 'activateTab',
        category: 'page',
        icon: '🔝',
        name: 'Sekmeyi Aktif Yap',
        color: '#10b981',
        description: 'URL veya Başlık içeren sekmeyi bulup öne getirir',
        details: 'Açık sekmeler arasında arama yapar ve bulduğuna geçer.\n• Örn: "google" yazarsanız Google sekmesine geçer.',
        params: [
            { key: 'query', label: 'Arama Metni (URL/Başlık)', type: 'text', required: true },
            { key: 'matchType', label: 'Eşleşme', type: 'select', options: ['içerir', 'tam eşleşme'], default: 'içerir' }
        ]
    },
    switchTab: {
        id: 'switchTab',
        category: 'page',
        icon: '🔁',
        name: 'Sekme Değiştir',
        color: '#10b981',
        description: 'Sıradaki veya önceki sekmeye geçer',
        details: 'Sekmeler arasında sırayla dolaşmanızı sağlar.',
        params: [
            { key: 'direction', label: 'Yön', type: 'select', options: ['sonraki', 'önceki'], default: 'sonraki' }
        ]
    },
    closeTab: {
        id: 'closeTab',
        category: 'page',
        icon: '❌',
        name: 'Sekmeyi Kapat',
        color: '#10b981',
        description: 'Mevcut veya belirtilen sekmeyi kapatır',
        details: 'Sekmeleri temizlemek için kullanılır.',
        params: [
            { key: 'target', label: 'Hedef', type: 'select', options: ['aktif', 'diğerleri'], default: 'aktif' }
        ]
    },

    getTabInfo: {
        id: 'getTabInfo',
        category: 'data',
        icon: 'ℹ️',
        name: 'Sekme Bilgisi Al',
        color: '#f59e0b',
        description: 'Aktif sekmenin URL veya başlığını değişkene atar',
        details: 'Şu anki sayfanın adresini veya başlığını okur.\n• Değişken Adı: Örn "adres" yazın. Sonra *adres olarak kullanın.',
        params: [
            { key: 'infoType', label: 'Bilgi', type: 'select', options: ['url', 'title', 'id'], default: 'url' },
            { key: 'variable', label: 'Değişken Adı', type: 'text', required: true }
        ]
    },
    wait: {
        id: 'wait',
        category: 'page',
        icon: '⏳',
        name: 'Bekle',
        color: '#10b981',
        description: 'Belirtilen süre kadar bekler',
        details: 'Akışı duraklatır. Sayfa yüklenmeleri için "Element Bekle" daha iyidir.',
        params: [
            { key: 'duration', label: 'Süre (ms)', type: 'number', default: 1000 }
        ]
    },
    waitForElement: {
        id: 'waitForElement',
        category: 'page',
        icon: '👁️',
        name: 'Element Bekle',
        color: '#10b981',
        description: 'Element görünene kadar bekler',
        details: 'Sayfa yüklenmesini veya bir modal açılmasını beklemek için en güvenli yöntemdir.',
        params: [
            { key: 'selector', label: 'Selector', type: 'text', placeholder: '.btn-success', required: true },
            { key: 'timeout', label: 'Zaman Aşımı (ms)', type: 'number', default: 10000 }
        ]
    },
    refresh: {
        id: 'refresh',
        category: 'page',
        icon: '🔄',
        name: 'Yenile',
        color: '#10b981',
        description: 'Sayfayı yeniler',
        details: 'F5 tuşu ile aynı işi yapar.',
        params: []
    },


    // DATA
    readText: {
        id: 'readText',
        category: 'data',
        icon: '📖',
        name: 'Metin Oku',
        color: '#f59e0b',
        description: 'Bir elementin metnini okur ve değişkene atar',
        details: 'Bir elementin içindeki metni okur.\n\n✂️ KELİME SEÇİMİ (İsteğe Bağlı):\nMetnin tamamını almak için boş bırakın.\n• Tek Kelime: Kaçıncı kelimeyi istiyorsanız o sayıyı yazın. (Örn: 2)\n• Aralık: Başlangıç ve bitiş sırasını tire ile yazın. (Örn: 1-3)',
        params: [
            { key: 'selector', label: 'Element', type: 'selector', required: true },
            { key: 'variable', label: 'Değişken Adı', type: 'text', required: true, placeholder: 'örn: fiyat' },
            { key: 'wordIndex', label: 'Kelime Sırası (Opsiyonel)', type: 'text', placeholder: 'Örn: 2 veya 1-3' }
        ]
    },
    readAttribute: {
        id: 'readAttribute',
        category: 'data',
        icon: '🔍',
        name: 'Özellik Oku',
        color: '#f59e0b',
        description: 'Elementin özelliğini (href, src, class) okur',
        details: 'Örneğin bir linkin adresini (href) veya resmin kaynağını (src) almak için kullanılır.\n• Değişken Adı: Örn "link". Kullanırken *link.',
        params: [
            { key: 'selector', label: 'Element', type: 'selector', required: true },
            { key: 'attribute', label: 'Özellik', type: 'text', required: true, placeholder: 'href' },
            { key: 'variable', label: 'Değişken Adı', type: 'text', required: true }
        ]
    },
    setVariable: {
        id: 'setVariable',
        category: 'data',
        icon: '📝',
        name: 'Değişken Ata',
        color: '#f59e0b',
        description: 'Manuel bir değer veya metin atar (*isim formatında kullanılabilir)',
        details: 'Sabit bir veri tanımlamak için kullanılır.\n• Örn: Değişken="sayac", Değer="1".',
        params: [
            { key: 'variable', label: 'Değişken Adı', type: 'text', required: true, placeholder: 'örn: sayac' },
            { key: 'value', label: 'Değer', type: 'text', required: true, placeholder: 'örn: 1' }
        ]
    },
    readTable: {
        id: 'readTable',
        category: 'data',
        icon: '📊',
        name: 'Tablo Oku',
        color: '#06b6d4',
        description: 'HTML tablosundaki verileri okur ve değişkene kaydeder',
        details: 'Bir <table> elementini JSON dizisine çevirir.\n• Her satır bir obje olur, sütun başlıkları anahtar olarak kullanılır.\n• Başlık yoksa "col1", "col2" gibi isimler atanır.',
        params: [
            { key: 'selector', label: 'Tablo Selector', type: 'selector', required: true, placeholder: 'table, .data-table' },
            { key: 'variable', label: 'Değişken Adı', type: 'text', required: true, placeholder: 'örn: tablo_verisi' }
        ]
    },


    // LOGIC
    condition: {
        id: 'condition',
        category: 'logic',
        icon: '🔀',
        name: 'Koşul',
        color: '#ef4444',
        description: 'Eğer X ise çalıştır',
        details: 'Akışın devam edip etmeyeceğine karar verir.\n• "Dur": Koşul sağlanmazsa akış durur.\n• "Atla": Koşul sağlanmazsa sonraki N bloğu atlar.',
        params: [
            { key: 'selector', label: 'Element (Opsiyonel)', type: 'selector' },
            { key: 'check', label: 'Kontrol', type: 'select', options: ['var (görünür)', 'yok (gizli)', 'metin içerir', 'metin eşittir'], default: 'var (görünür)' },
            { key: 'value', label: 'Değer (Metin ise)', type: 'text' },
            { key: 'onFail', label: 'Başarısız ise', type: 'select', options: ['dur', 'sonraki 1 bloğu atla', 'sonraki 2 bloğu atla', 'sonraki 3 bloğu atla', 'sonraki 5 bloğu atla'], default: 'dur' }
        ]
    },
    loop: {
        id: 'loop',
        category: 'logic',
        icon: '🔁',
        name: 'Döngü (Beta)',
        color: '#ef4444',
        description: 'Blokları tekrar eder',
        details: 'Henüz tam aktif değildir. İleride eklenecektir.',
        params: [
            { key: 'count', label: 'Tekrar Sayısı', type: 'number', default: 3 }
        ]
    },
    forEach: {
        id: 'forEach',
        category: 'logic',
        icon: '🔄',
        name: 'Her Biri İçin',
        color: '#8b5cf6',
        description: 'Listedeki her element için altındaki blokları çalıştırır',
        params: [
            { key: 'selector', label: 'Liste Elementi', type: 'selector', placeholder: 'Listeyi seç (ul, ol, div)', required: true },
            { key: 'childSelector', label: 'Çocuk Selector', type: 'text', placeholder: 'li, .item', default: 'li' }
        ]
    }
};

export const CATEGORIES = {
    interaction: { label: '🖱️ Etkileşim', containerId: 'interactionBlocks' },
    page: { label: '🌐 Sayfa', containerId: 'pageBlocks' },
    data: { label: '📄 Veri', containerId: 'dataBlocks' },
    logic: { label: '🔀 Mantık', containerId: 'logicBlocks' }
};

export const TEMPLATES = [
    {
        id: 'google-search',
        icon: '🔍',
        name: 'Google Arama',
        description: 'Google\'da arama yap ve sonuçları gör',
        blocks: [
            { type: 'navigate', params: { url: 'https://www.google.com' } },
            { type: 'wait', params: { duration: 1000 } },
            { type: 'type', params: { selector: 'textarea[name="q"]', text: 'ZhdsdAuto otomasyon', clear: true } },
            { type: 'keyboard', params: { key: 'Enter', modifier: 'yok' } },
            { type: 'wait', params: { duration: 2000 } }
        ],
        blockCount: 5
    },
    {
        id: 'youtube-search',
        icon: '🎬',
        name: 'YouTube Video Ara',
        description: 'YouTube\'da video arayın',
        blocks: [
            { type: 'navigate', params: { url: 'https://www.youtube.com' } },
            { type: 'wait', params: { duration: 2000 } },
            { type: 'type', params: { selector: 'input#search', text: 'otomasyon tutorial', clear: true } },
            { type: 'click', params: { selector: 'button#search-icon-legacy' } },
            { type: 'wait', params: { duration: 2000 } }
        ],
        blockCount: 5
    },
    {
        id: 'page-scroll',
        icon: '📜',
        name: 'Sayfa Tarama',
        description: 'Bir sayfayı otomatik olarak aşağı kaydır',
        blocks: [
            { type: 'navigate', params: { url: 'https://example.com' } },
            { type: 'wait', params: { duration: 1000 } },
            { type: 'scroll', params: { direction: 'aşağı', amount: 500 } },
            { type: 'wait', params: { duration: 1000 } },
            { type: 'scroll', params: { direction: 'aşağı', amount: 500 } },
            { type: 'wait', params: { duration: 1000 } },
            { type: 'scroll', params: { direction: 'en üst', amount: 0 } }
        ],
        blockCount: 7
    },
    {
        id: 'form-fill',
        icon: '📝',
        name: 'Form Doldur',
        description: 'Bir formu otomatik olarak doldurun',
        blocks: [
            { type: 'navigate', params: { url: 'https://example.com/form' } },
            { type: 'wait', params: { duration: 1000 } },
            { type: 'type', params: { selector: 'input[name="name"]', text: 'Ad Soyad', clear: true } },
            { type: 'type', params: { selector: 'input[name="email"]', text: 'ornek@email.com', clear: true } },
            { type: 'click', params: { selector: 'button[type="submit"]' } }
        ],
        blockCount: 5
    },
    {
        id: 'data-scrape',
        icon: '📊',
        name: 'Veri Çekme',
        description: 'Bir sayfadan metin verilerini çekin',
        blocks: [
            { type: 'navigate', params: { url: 'https://example.com' } },
            { type: 'wait', params: { duration: 1500 } },
            { type: 'readText', params: { selector: 'h1', variable: 'baslik' } },
            { type: 'readText', params: { selector: 'p', variable: 'paragraf' } }
        ],
        blockCount: 4
    },
    {
        id: 'multi-tab',
        icon: '📑',
        name: 'Çoklu Sekme',
        description: 'Birden fazla sayfayı aynı anda açın',
        blocks: [
            { type: 'newTab', params: { url: 'https://www.google.com' } },
            { type: 'wait', params: { duration: 1000 } },
            { type: 'newTab', params: { url: 'https://www.youtube.com' } },
            { type: 'wait', params: { duration: 1000 } },
            { type: 'newTab', params: { url: 'https://github.com' } }
        ],
        blockCount: 5
    }
];

/**
 * FlowMate — Visual Element Picker
 * Sayfaya overlay ekler, hover'da element highlight, tıklama ile CSS selector döndürür.
 * chrome.scripting.executeScript ile enjekte edilir.
 */

(function () {
    // Zaten aktifse tekrar ekleme
    if (document.getElementById('flowmate-picker-overlay')) {
        return;
    }

    // ===== Overlay oluştur =====
    const overlay = document.createElement('div');
    overlay.id = 'flowmate-picker-overlay';

    const highlight = document.createElement('div');
    highlight.id = 'flowmate-picker-highlight';

    const tooltip = document.createElement('div');
    tooltip.id = 'flowmate-picker-tooltip';

    const instructions = document.createElement('div');
    instructions.id = 'flowmate-picker-instructions';
    instructions.innerHTML = `
    <div class="flowmate-instructions-content">
      <span class="flowmate-instructions-icon">🎯</span>
      <span>Element seçmek için tıklayın</span>
      <span class="flowmate-instructions-sep">|</span>
      <span><kbd>ESC</kbd> ile iptal</span>
    </div>
  `;

    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(tooltip);
    document.body.appendChild(instructions);

    let currentElement = null;

    // ===== Element hover =====
    function onMouseMove(e) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el === overlay || el === highlight || el === tooltip || el === instructions
            || el.closest('#flowmate-picker-instructions')) {
            return;
        }

        currentElement = el;
        const rect = el.getBoundingClientRect();

        highlight.style.top = (rect.top + window.scrollY) + 'px';
        highlight.style.left = (rect.left + window.scrollX) + 'px';
        highlight.style.width = rect.width + 'px';
        highlight.style.height = rect.height + 'px';
        highlight.style.display = 'block';

        // Tooltip
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : '';
        const text = (el.textContent || '').trim().slice(0, 30);

        tooltip.textContent = `${tag}${id}${cls}${text ? ' — "' + text + '"' : ''}`;
        tooltip.style.top = Math.max(0, rect.top + window.scrollY - 32) + 'px';
        tooltip.style.left = (rect.left + window.scrollX) + 'px';
        tooltip.style.display = 'block';
    }

    // ===== Element tıklama =====
    function onClick(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!currentElement) return;

        const selector = generateSelector(currentElement);
        const tagName = currentElement.tagName.toLowerCase();
        const text = (currentElement.textContent || '').trim().slice(0, 50);

        // Sonucu background'a gönder
        chrome.runtime.sendMessage({
            type: 'ELEMENT_PICKED',
            selector,
            tagName,
            text
        });

        cleanup();
        return false;
    }

    // ===== ESC ile iptal =====
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED' });
            cleanup();
        }
    }

    // ===== Temizle =====
    function cleanup() {
        document.removeEventListener('mousemove', onMouseMove, true);
        document.removeEventListener('click', onClick, true);
        document.removeEventListener('keydown', onKeyDown, true);

        overlay.remove();
        highlight.remove();
        tooltip.remove();
        instructions.remove();
    }

    // ===== CSS Selector Üretici =====
    // Strateji: En kısa ve en güvenilir seçiciyi bulmaya çalışır.
    // Öncelik Sırası:
    // 1. ID (#my-id) - En benzersiz
    // 2. Test ID'leri (data-testid) - Test otomasyonları için standart
    // 3. Hiyerarşik Yol (div > ul > li:nth-child(2)) - Son çare
    function generateSelector(el) {
        // 1. ID varsa direkt kullan
        if (el.id) {
            return `#${CSS.escape(el.id)}`;
        }

        // 2. data-testid varsa kullan
        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test');
        if (testId) {
            return `[data-testid="${testId}"]`;
        }

        // 3. Path oluştur
        const path = [];
        let current = el;

        while (current && current !== document.body && current !== document.documentElement) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
                path.unshift(`#${CSS.escape(current.id)}`);
                break;
            }

            // nth-child ile benzersizleştir
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(
                    c => c.tagName === current.tagName
                );
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-child(${Array.from(parent.children).indexOf(current) + 1})`;
                }
            }

            // Önemli class varsa ekle
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/)
                    .filter(c => !c.match(/^(active|hover|focus|open|show|hide|visible|hidden|ng-|jsx-|css-)/))
                    .slice(0, 1);
                if (classes.length) {
                    selector += '.' + classes.map(c => CSS.escape(c)).join('.');
                }
            }

            path.unshift(selector);
            current = current.parentElement;
        }

        const fullSelector = path.join(' > ');

        // Doğrulama
        try {
            const matched = document.querySelector(fullSelector);
            if (matched === el) return fullSelector;
        } catch (e) {
            // nestedden selector hatası olabilir
        }

        // Fallback: basit path
        return path.join(' > ');
    }

    // ===== Event listener'ları bağla =====
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

})();

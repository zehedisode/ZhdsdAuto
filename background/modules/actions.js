import { smartWait } from './utils.js';

/**
 * Execute interactions within the content script
 */
export async function execInContent(engine, tabId, action, params) {
    if (!tabId) throw new Error(`Geçersiz sekme ID (action: ${action})`);

    // 1. Akıllı Bekleme
    if (params.selector) {
        await smartWait(tabId, params.selector);
    }

    const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (act, p) => {
            const el = document.querySelector(p.selector);

            if (!el && act !== 'WAITFORELEMENT') return { error: `Element bulunamadı: ${p.selector}` };

            // Görünürlük kontrolü
            if (el && act !== 'WAITFORELEMENT' && act !== 'READATTRIBUTE') {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
                if (!isVisible) return { error: 'Element görünür değil (hidden)' };
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            try {
                switch (act) {
                    case 'CLICK':
                        // 🟢 Tıklama Simülasyonu
                        // Modern framework'ler (React, Vue, Angular) sadece .click() metodunu dinlemeyebilir.
                        // Bu yüzden gerçek bir kullanıcı gibi mouse olaylarını sırayla tetikliyoruz.
                        ['mousedown', 'mouseup', 'click'].forEach(evtType => {
                            el.dispatchEvent(new MouseEvent(evtType, {
                                bubbles: true, cancelable: true, view: window, buttons: 1
                            }));
                        });
                        try { el.click(); } catch (e) { }
                        return { success: true };

                    case 'TYPE':
                        // 🟢 Yazma Simülasyonu
                        // 1. Önce alana odaklanıp tıklıyoruz
                        ['mousedown', 'mouseup', 'click'].forEach(evtType => {
                            el.dispatchEvent(new MouseEvent(evtType, {
                                bubbles: true, cancelable: true, view: window, buttons: 1
                            }));
                        });
                        el.focus();

                        if (p.clear) {
                            document.execCommand('selectAll', false, null);
                            document.execCommand('delete', false, null);
                        } else {
                            // Temizle seçili değilse imleci sona taşı (Append modu)
                            try {
                                // Input/Textarea için
                                if (typeof el.selectionStart === 'number') {
                                    el.selectionStart = el.selectionEnd = el.value.length;
                                }
                                // ContentEditable divler için
                                else if (el.isContentEditable) {
                                    const range = document.createRange();
                                    range.selectNodeContents(el);
                                    range.collapse(false);
                                    const sel = window.getSelection();
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                }
                            } catch (e) { /* ignore cursor error */ }
                        }

                        // 2. Ana Yöntem: insertText
                        // Başarılı olup olmadığını anlamak için önceki değeri sakla
                        const preVal = el.value || el.innerText || '';

                        document.execCommand('insertText', false, p.text);

                        const postVal = el.value || el.innerText || '';
                        const changeHappened = preVal !== postVal && postVal.includes(p.text);

                        // 3. Fallback (Yedek Plan)
                        // Eğer insertText çalışmadıysa (değer değişmediyse), manuel atama yap.
                        if (!changeHappened) {
                            const newValue = p.clear ? p.text : (preVal + p.text);

                            try {
                                const isContentEditable = el.isContentEditable || el.getAttribute('contenteditable') === 'true';
                                if (isContentEditable) {
                                    el.innerText = newValue;
                                } else {
                                    let proto = window.HTMLInputElement.prototype;
                                    if (el instanceof HTMLTextAreaElement) proto = window.HTMLTextAreaElement.prototype;

                                    // React hack: Native value setter çağır
                                    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
                                    if (setter) {
                                        setter.call(el, newValue);
                                    } else {
                                        el.value = newValue;
                                    }
                                }
                            } catch (e) {
                                // En kötü ihtimalle direkt ata
                                if (el.value !== undefined) el.value = newValue;
                                else el.innerText = newValue;
                            }

                            // Event'leri tetikle ki framework'ler (React/Vue) değişikliği algılasın
                            ['keydown', 'keypress', 'input', 'keyup', 'change'].forEach(evt => {
                                el.dispatchEvent(new Event(evt, { bubbles: true }));
                            });
                        }
                        return { success: true, verified: true };

                    case 'SELECT':
                        const oldVal = el.value;
                        el.value = p.value;
                        if (el.tagName === 'SELECT') {
                            Array.from(el.options).forEach(opt => {
                                if (opt.value === p.value || opt.text === p.value) {
                                    opt.selected = true;
                                    el.value = opt.value;
                                }
                            });
                        }
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        return { success: true };

                    case 'HOVER':
                        ['mouseenter', 'mouseover', 'mousemove'].forEach(evt => {
                            el.dispatchEvent(new MouseEvent(evt, {
                                bubbles: true, cancelable: true, view: window
                            }));
                        });
                        return { success: true };

                    case 'SCROLL':
                        window.scrollBy({ top: p.amount || 500, behavior: 'smooth' });
                        return { success: true };
                    case 'READTEXT':
                        let rawText = (el.innerText || el.textContent || el.value || '').trim();

                        // ✂️ Kelime Bazlı Seçim (Kullanıcı İsteği: 1-3 veya 2 vb.)
                        if (p.wordIndex) {
                            const words = rawText.split(/\s+/).filter(w => w.length > 0);
                            const input = p.wordIndex.toString().trim();

                            // Aralık Kontrolü (1-3 veya 1 3)
                            const rangeMatch = input.match(/^(\d+)[\s-]+(\d+)$/);

                            if (rangeMatch) {
                                const start = parseInt(rangeMatch[1], 10);
                                const end = parseInt(rangeMatch[2], 10);

                                if (start > 0 && end >= start) {
                                    // 1-based index -> 0,1,2 (slice(0, 3))
                                    const selected = words.slice(start - 1, end);
                                    rawText = selected.join(' ');
                                }
                            }
                            // Tekil Kontrolü (Sadece sayı)
                            else if (input.match(/^\d+$/)) {
                                const index = parseInt(input, 10);
                                if (index > 0 && index <= words.length) {
                                    rawText = words[index - 1]; // 1-based to 0-based
                                } else {
                                    // Geçersiz sayı -> boş dön
                                    rawText = '';
                                }
                            }
                        }

                        return { success: true, data: rawText };
                    case 'READATTRIBUTE':
                        return { success: true, data: el.getAttribute(p.attribute) };
                    case 'WAITFORELEMENT':
                        return { success: !!el };
                    case 'KEYBOARD':
                        const kEvent = new KeyboardEvent('keydown', {
                            key: p.key, code: p.key,
                            ctrlKey: p.modifier === 'ctrl',
                            shiftKey: p.modifier === 'shift',
                            altKey: p.modifier === 'alt',
                            bubbles: true
                        });
                        (el || document).dispatchEvent(kEvent);
                        return { success: true };
                    default:
                        return { success: false, error: 'Bilinmeyen işlem' };
                }
            } catch (e) {
                return { error: e.message };
            }
        },
        args: [action, params]
    });

    const res = result[0]?.result;
    if (!res) throw new Error('Komut çalıştırılamadı (Script hatası)');
    if (res.error) throw new Error(res.error);

    if (action === 'TYPE' && res.verified === false) {
        console.warn(`Yazma işlemi doğrulanamadı: ${params.selector}`);
    }

    if (res.data !== undefined) {
        // Değişken adının başındaki * işaretini temizle
        const varName = params.variable ? params.variable.replace(/^\*/, '') : null;
        if (varName) {
            engine.variables[varName] = res.data;
            console.log(`Değişken kaydedildi: ${varName} = ${res.data}`);
        }
    }



    return tabId;
}

import { smartWait } from './utils.js';

const MAX_RETRIES = 2;
const RETRY_DELAY = 500;

/**
 * Execute interactions within the content script
 * Retry mekanizması: Script inject hatalarında (sayfa yüklenme vb.) 
 * otomatik olarak 2 kez daha dener.
 */
export async function execInContent(engine, tabId, action, params) {
    if (!tabId) throw new Error(`Geçersiz sekme ID (action: ${action})`);

    // 1. Akıllı Bekleme
    if (params.selector) {
        await smartWait(tabId, params.selector);
    }

    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
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
                                ['mousedown', 'mouseup', 'click'].forEach(evtType => {
                                    el.dispatchEvent(new MouseEvent(evtType, {
                                        bubbles: true, cancelable: true, view: window, buttons: 1
                                    }));
                                });
                                try { el.click(); } catch (e) { }
                                return { success: true };

                            case 'TYPE':
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
                                    try {
                                        if (typeof el.selectionStart === 'number') {
                                            el.selectionStart = el.selectionEnd = el.value.length;
                                        }
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

                                const preVal = el.value || el.innerText || '';
                                document.execCommand('insertText', false, p.text);
                                const postVal = el.value || el.innerText || '';
                                const changeHappened = preVal !== postVal && postVal.includes(p.text);

                                if (!changeHappened) {
                                    const newValue = p.clear ? p.text : (preVal + p.text);
                                    try {
                                        const isContentEditable = el.isContentEditable || el.getAttribute('contenteditable') === 'true';
                                        if (isContentEditable) {
                                            el.innerText = newValue;
                                        } else {
                                            let proto = window.HTMLInputElement.prototype;
                                            if (el instanceof HTMLTextAreaElement) proto = window.HTMLTextAreaElement.prototype;
                                            const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
                                            if (setter) {
                                                setter.call(el, newValue);
                                            } else {
                                                el.value = newValue;
                                            }
                                        }
                                    } catch (e) {
                                        if (el.value !== undefined) el.value = newValue;
                                        else el.innerText = newValue;
                                    }
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
                                if (p.wordIndex) {
                                    const words = rawText.split(/\s+/).filter(w => w.length > 0);
                                    const input = p.wordIndex.toString().trim();
                                    const rangeMatch = input.match(/^(\d+)[\s-]+(\d+)$/);
                                    if (rangeMatch) {
                                        const start = parseInt(rangeMatch[1], 10);
                                        const end = parseInt(rangeMatch[2], 10);
                                        if (start > 0 && end >= start) {
                                            rawText = words.slice(start - 1, end).join(' ');
                                        }
                                    } else if (input.match(/^\d+$/)) {
                                        const index = parseInt(input, 10);
                                        rawText = (index > 0 && index <= words.length) ? words[index - 1] : '';
                                    }
                                }
                                return { success: true, data: rawText };
                            case 'READATTRIBUTE':
                                return { success: true, data: el.getAttribute(p.attribute) };
                            case 'READTABLE': {
                                const rows = el.querySelectorAll('tr');
                                if (!rows.length) return { success: true, data: '[]' };
                                // Başlıkları al (thead veya ilk satır)
                                const headerRow = el.querySelector('thead tr') || rows[0];
                                const headers = Array.from(headerRow.querySelectorAll('th, td'))
                                    .map((cell, i) => cell.innerText.trim() || `col${i + 1}`);
                                const startIdx = el.querySelector('thead') ? 0 : 1;
                                const data = [];
                                const bodyRows = el.querySelectorAll('tbody tr');
                                const dataRows = bodyRows.length ? bodyRows : Array.from(rows).slice(startIdx);
                                dataRows.forEach(row => {
                                    const cells = row.querySelectorAll('td, th');
                                    const obj = {};
                                    headers.forEach((h, i) => { obj[h] = cells[i] ? cells[i].innerText.trim() : ''; });
                                    data.push(obj);
                                });
                                return { success: true, data: JSON.stringify(data) };
                            }
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
                const varName = params.variable ? params.variable.replace(/^\*/, '') : null;
                if (varName) {
                    engine.variables[varName] = res.data;
                    console.log(`Değişken kaydedildi: ${varName} = ${res.data}`);
                }
            }

            return tabId;

        } catch (error) {
            lastError = error;
            // DOM hataları (element bulunamadı vb.) retry'a gerek yok
            if (error.message.includes('bulunamadı') || error.message.includes('görünür değil')) {
                throw error;
            }
            // Script inject hatalarında retry
            if (attempt < MAX_RETRIES) {
                console.warn(`execInContent retry ${attempt + 1}/${MAX_RETRIES}: ${error.message}`);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
            }
        }
    }

    throw lastError || new Error('Komut çalıştırılamadı (tüm denemeler başarısız)');
}


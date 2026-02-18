/**
 * FlowMate — Content Script (Injector)
 * Background'dan gelen DOM komutlarını çalıştırır.
 * Not: MVP'de çoğu DOM aksiyonu chrome.scripting.executeScript ile 
 * doğrudan inject ediliyor (background/modules/actions.js içinde). 
 * Bu dosya gelecekte daha karmaşık senaryolar için kullanılacak.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DOM_ACTION') {
        const result = executeDOMAction(message.action, message.params);
        sendResponse(result);
    }
    return true;
});

function executeDOMAction(action, params) {
    try {
        switch (action) {
            case 'CLICK': {
                const el = document.querySelector(params.selector);
                if (!el) return { error: `Element bulunamadı: ${params.selector}` };
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => el.click(), 300);
                return { success: true };
            }

            case 'TYPE': {
                const el = document.querySelector(params.selector);
                if (!el) return { error: `Element bulunamadı: ${params.selector}` };
                el.focus();
                if (params.clearFirst) {
                    el.value = '';
                }
                el.value = params.text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                return { success: true };
            }

            case 'READ_TEXT': {
                const el = document.querySelector(params.selector);
                if (!el) return { error: `Element bulunamadı: ${params.selector}` };
                return { success: true, data: el.innerText || el.textContent };
            }

            case 'WAIT_FOR_ELEMENT': {
                // Bu asenkron, sendResponse ile çalışmaz — gelecekte port kullanılacak
                return { success: true, message: 'MutationObserver gerekli' };
            }

            default:
                return { error: `Bilinmeyen aksiyon: ${action}` };
        }
    } catch (error) {
        return { error: error.message };
    }
}

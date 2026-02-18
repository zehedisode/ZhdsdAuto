/**
 * Utility Functions for FlowEngine
 */

export function interpolate(str, variables) {
    if (!str || typeof str !== 'string') return str;
    // Hem ${isim} hem de *isim formatını destekler
    return str
        .replace(/\$\{(\w+)\}/g, (_, name) => variables[name] || '')
        .replace(/\*(\w+)/g, (_, name) => variables[name] !== undefined ? variables[name] : `*${name}`);
}

export function waitForTabLoad(tabId) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Sayfa yüklenemedi (Zaman aşımı)')), 30000);
        const listener = (id, info) => {
            if (id === tabId && info.status === 'complete') {
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}

export async function smartWait(tabId, selector, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            const found = await chrome.scripting.executeScript({
                target: { tabId },
                func: (s) => !!document.querySelector(s),
                args: [selector]
            });
            if (found[0]?.result) return true;
        } catch (e) { /* ignore */ }
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Element zaman aşımına uğradı (${timeout}ms): ${selector}`);
}

/**
 * FlowMate — Background Service Worker
 * Modüler yapı: engine.js importScripts üzerinden yüklenir.
 */

import FlowEngine from './engine.js';

const engine = new FlowEngine();
let dashboardWindowId = null;

// ===================================================================
// WINDOW MANAGEMENT
// ===================================================================
chrome.action.onClicked.addListener(async () => {
    if (dashboardWindowId !== null) {
        try {
            await chrome.windows.update(dashboardWindowId, { focused: true });
            return;
        } catch {
            dashboardWindowId = null;
        }
    }

    const win = await chrome.windows.create({
        url: chrome.runtime.getURL('dashboard/index.html'),
        type: 'popup',
        width: 1100,
        height: 720,
        left: 150,
        top: 80
    });
    dashboardWindowId = win.id;
});

chrome.windows.onRemoved.addListener((windowId) => {
    if (windowId === dashboardWindowId) dashboardWindowId = null;
});

// ===================================================================
// MESSAGE HANDLER
// ===================================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'RUN_FLOW':
            handleRunFlow(message, sendResponse);
            return true;
        case 'STOP_FLOW':
            engine.stop();
            sendResponse({ success: true });
            return false;
        case 'PICK_ELEMENT':
            handlePickElement(sendResponse);
            return true;
        case 'TEST_READ_TEXT':
            handleTestReadText(message, sendResponse);
            return true;
        case 'ELEMENT_PICKED':
            chrome.runtime.sendMessage({ type: 'ELEMENT_PICKED', tabId: sender?.tab?.id || null, ...message }).catch(() => { });
            sendResponse({ success: true });
            return false;
        case 'PICKER_CANCELLED':
            chrome.runtime.sendMessage({ type: 'PICKER_CANCELLED' }).catch(() => { });
            sendResponse({ success: true });
            return false;
        default:
            return false;
    }
});

// ===================================================================
// HELPERS
// ===================================================================
async function findWebTab() {
    const allTabs = await chrome.tabs.query({ active: true });
    const webTab = allTabs.find(t => t.url?.startsWith('http://') || t.url?.startsWith('https://'));
    if (webTab) return webTab;

    const allWebTabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    if (allWebTabs.length > 0) {
        allWebTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
        return allWebTabs[0];
    }
    return null;
}

async function handleRunFlow(message, sendResponse) {
    try {
        const tab = await findWebTab();
        if (!tab && message.flow.blocks.some(b => !['navigate', 'newTab', 'wait', 'setVariable'].includes(b.type))) {
            sendResponse({ success: false, error: 'Açık bir web sayfası bulunamadı.' });
            return;
        }

        sendResponse({ success: true });
        engine.run(message.flow, tab?.id || null, (status) => {
            chrome.runtime.sendMessage({ type: 'FLOW_STATUS', status }).catch(() => { });
        });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handlePickElement(sendResponse) {
    try {
        const tab = await findWebTab();
        if (!tab?.id) {
            sendResponse({ success: false, error: 'Açık bir web sayfası bulunamadı.' });
            return;
        }

        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/picker.css'] });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/visual-picker.js'] });
        sendResponse({ success: true, tabId: tab.id });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

async function handleTestReadText(message, sendResponse) {
    try {
        let tabId = Number(message?.tabId);

        if (!Number.isInteger(tabId) || tabId <= 0) {
            const tab = await findWebTab();
            tabId = tab?.id;
        }

        if (!tabId) {
            sendResponse({ success: false, error: 'Açık bir web sayfası bulunamadı.' });
            return;
        }

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId },
            func: (selector, wordIndex) => {
                try {
                    const el = document.querySelector(selector);
                    if (!el) return { success: false, error: `Element bulunamadı: ${selector}` };

                    let rawText = (el.innerText || el.textContent || el.value || '').trim();
                    if (wordIndex) {
                        const words = rawText.split(/\s+/).filter(w => w.length > 0);
                        const input = String(wordIndex).trim();
                        const rangeMatch = input.match(/^(\d+)[\s-]+(\d+)$/);

                        if (rangeMatch) {
                            const start = parseInt(rangeMatch[1], 10);
                            const end = parseInt(rangeMatch[2], 10);
                            if (start > 0 && end >= start) {
                                rawText = words.slice(start - 1, end).join(' ');
                            }
                        } else if (/^\d+$/.test(input)) {
                            const index = parseInt(input, 10);
                            rawText = index > 0 && index <= words.length ? words[index - 1] : '';
                        }
                    }

                    return { success: true, data: rawText };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            },
            args: [message.selector, message.wordIndex]
        });

        sendResponse(result || { success: false, error: 'Test sonucu alınamadı.' });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}

// ===== Install =====
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get('flows', (data) => {
        if (!data.flows) chrome.storage.local.set({ flows: [], logs: [] });
    });
});

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
        case 'ELEMENT_PICKED':
            chrome.runtime.sendMessage({ type: 'ELEMENT_PICKED', ...message }).catch(() => { });
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

// ===== Install =====
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get('flows', (data) => {
        if (!data.flows) chrome.storage.local.set({ flows: [], logs: [] });
    });
});

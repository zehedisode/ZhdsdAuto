/**
 * Tab and Navigation Actions
 */
import { waitForTabLoad } from './utils.js';

export async function execNavigate(engine, params, currentTabId) {
    const url = engine.interpolate(params.url);
    if (!url) throw new Error('URL belirtilmedi');
    if (currentTabId) {
        await chrome.tabs.update(currentTabId, { url });
    } else {
        const tab = await chrome.tabs.create({ url });
        currentTabId = tab.id;
    }
    await waitForTabLoad(currentTabId);
    return currentTabId;
}

export async function execActivateTab(engine, params) {
    const query = engine.interpolate(params.query).toLowerCase();
    const tabs = await chrome.tabs.query({});
    const target = tabs.find(t => {
        const title = (t.title || '').toLowerCase();
        const url = (t.url || '').toLowerCase();
        return params.matchType === 'tam eşleşme' ? (title === query || url === query) : (title.includes(query) || url.includes(query));
    });
    if (!target) throw new Error(`Sekme bulunamadı: "${query}"`);
    await chrome.tabs.update(target.id, { active: true });
    await chrome.windows.update(target.windowId, { focused: true });
    return target.id;
}

export async function execSwitchTab(params, currentTabId) {
    if (!currentTabId) throw new Error('Aktif sekme yok');
    const tab = await chrome.tabs.get(currentTabId);
    const tabs = await chrome.tabs.query({ windowId: tab.windowId });
    const sorted = tabs.sort((a, b) => a.index - b.index);
    const currIdx = sorted.findIndex(t => t.id === currentTabId);
    const nextIdx = params.direction === 'sonraki' ? (currIdx + 1) % sorted.length : (currIdx - 1 + sorted.length) % sorted.length;
    const target = sorted[nextIdx];
    await chrome.tabs.update(target.id, { active: true });
    return target.id;
}

export async function execCloseTab(params, currentTabId) {
    if (params.target === 'diğerleri') {
        const tab = await chrome.tabs.get(currentTabId);
        const tabs = await chrome.tabs.query({ windowId: tab.windowId });
        const toClose = tabs.filter(t => t.id !== currentTabId).map(t => t.id);
        await chrome.tabs.remove(toClose);
        return currentTabId;
    } else {
        if (currentTabId) await chrome.tabs.remove(currentTabId);
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        return tabs[0]?.id || null;
    }
}

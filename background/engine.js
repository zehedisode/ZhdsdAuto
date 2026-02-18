/**
 * ZhdsdAuto Automation Engine (Modular Version)
 * Core logic orchestrating the flow execution.
 */
import { interpolate, waitForTabLoad } from './modules/utils.js';
import * as Tabs from './modules/tabs.js';
import { execInContent } from './modules/actions.js';
import { BLOCK_TYPES } from '../dashboard/modules/constants.js';

// Blok meta bilgisini constants.js'ten al (tek kaynak)
function getBlockMeta(typeId) {
    const def = BLOCK_TYPES[typeId] || Object.values(BLOCK_TYPES).find(b => b.id === typeId);
    if (def) return { name: `${def.icon} ${def.name}`, icon: def.icon };
    return { name: `⚡ ${typeId}`, icon: '⚡' };
}

class FlowEngine {
    constructor() {
        this.running = false;
        this.currentBlockIndex = -1;
        this.flow = null;
        this.variables = {};
    }

    interpolate(str) {
        return interpolate(str, this.variables);
    }

    async run(flow, tabId, onStatus) {
        if (this.running) throw new Error('Zaten çalışan bir akış var');

        this.flow = flow;
        this.running = true;
        this.variables = {};

        const totalBlocks = flow.blocks.filter(b => b.enabled !== false).length;
        let executedCount = 0;

        onStatus({ state: 'running', flowId: flow.id, flowName: flow.name, total: totalBlocks, current: 0, message: `"${flow.name}" başlatılıyor...` });

        try {
            for (let i = 0; i < flow.blocks.length; i++) {
                if (!this.running) break;
                const block = flow.blocks[i];
                if (block.enabled === false) continue;

                this.currentBlockIndex = i;
                executedCount++;

                const meta = getBlockMeta(block.type);
                onStatus({ state: 'running', flowId: flow.id, flowName: flow.name, total: totalBlocks, current: executedCount, blockIcon: meta.icon, message: `${meta.name} çalıştırılıyor...` });

                tabId = await this.executeBlock(block, tabId);
            }

            onStatus({ state: 'completed', flowId: flow.id, flowName: flow.name, total: totalBlocks, current: totalBlocks, message: `✅ "${flow.name}" başarıyla tamamlandı!` });
        } catch (error) {
            console.error('Flow Error:', error);
            onStatus({ state: 'error', flowId: flow.id, flowName: flow.name, total: totalBlocks, current: executedCount, message: `❌ Hata: ${error.message}`, error: error.message });
        } finally {
            this.running = false;
            this.currentBlockIndex = -1;
            this.flow = null;
        }
    }

    async executeBlock(block, tabId) {
        // Parametreleri hazırla (Interpolation)
        // Kullanıcı girdilerindeki değişkenleri (${isim} veya *isim) gerçek değerleriyle değiştirir.
        const p = {};
        if (block.params) {
            for (const key in block.params) {
                p[key] = this.interpolate(block.params[key]);
            }
        }

        /* 
         * BLOK YÖNLENDİRME MERKEZİ
         * 
         * Yeni blok eklerken buraya `case` ekleyin.
         * - Navigation/Tab işlemleri -> modules/tabs.js
         * - Sayfa içi (DOM) işlemler -> modules/actions.js
         * - Basit bekleme/veri işlemleri -> burada kalabilir veya utils'e taşınabilir.
         */
        switch (block.type) {
            // === Navigation & Tabs (modules/tabs.js) ===
            case 'navigate': return await Tabs.execNavigate(this, p, tabId);
            case 'newTab': {
                const tab = await chrome.tabs.create({ url: p.url || 'about:blank', active: p.active !== false });
                await waitForTabLoad(tab.id);
                return tab.id;
            }
            case 'activateTab': return await Tabs.execActivateTab(this, p);
            case 'switchTab': return await Tabs.execSwitchTab(p, tabId);
            case 'closeTab': return await Tabs.execCloseTab(p, tabId);

            case 'pinTab':
                if (tabId) await chrome.tabs.update(tabId, { pinned: p.action === 'sabitle' });
                return tabId;
            case 'muteTab':
                if (tabId) await chrome.tabs.update(tabId, { muted: p.action === 'sustur' });
                return tabId;
            case 'refresh':
                if (tabId) { await chrome.tabs.reload(tabId); await waitForTabLoad(tabId); }
                return tabId;

            // === Wait ===
            case 'wait':
                await new Promise(r => setTimeout(r, parseInt(p.duration) || 1000));
                return tabId;

            // === Data & Variables ===
            case 'getTabInfo': {
                if (!tabId) return tabId;
                const tab = await chrome.tabs.get(tabId);
                const val = p.infoType === 'url' ? tab.url : p.infoType === 'title' ? tab.title : tab.id;
                const varName = p.variable ? p.variable.replace(/^\*/, '') : null;
                if (varName) this.variables[varName] = val;
                return tabId;
            }
            case 'setVariable':
                const targetVar = p.variable ? p.variable.replace(/^\*/, '') : null;
                if (targetVar) this.variables[targetVar] = p.value;
                return tabId;
            case 'screenshot': {
                if (tabId) {
                    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
                    this.variables['_screenshot'] = dataUrl;
                }
                return tabId;
            }

            // === Page Interactions (via Content Script) ===
            case 'click':
            case 'type':
            case 'select':
            case 'scroll':
            case 'hover':
            case 'keyboard':
            case 'waitForElement':
            case 'readText':
            case 'readAttribute':
            case 'readTable':
                return await execInContent(this, tabId, block.type.toUpperCase(), p);

            default:
                console.warn(`Block type ${block.type} not implemented yet.`);
                return tabId;
        }
    }

    stop() { this.running = false; }
}

// Export a singleton or class based on usage. 
// Assuming previously it was used as `const engine = new FlowEngine();`
// We need to check how it's used in background.js. Usually it's exported as the class.
export default FlowEngine; // Or modify based on how it is imported.

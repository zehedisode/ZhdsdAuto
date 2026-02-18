/**
 * Flow Control Blocks — Koşul, Döngü, ForEach
 * 
 * Bu modül akış kontrol bloklarını implement eder.
 * Engine tarafından executeBlock() içinde çağrılır.
 */
import { execInContent } from './actions.js';

/**
 * Condition (Koşul) Bloğu
 * Element varlığını veya metin içeriğini kontrol eder.
 * Sonuç: { pass: boolean, reason: string }
 * 
 * @param {FlowEngine} engine
 * @param {Object} params - { selector, check, value, onFail }
 * @param {number} tabId
 * @returns {{ pass: boolean, reason: string }}
 */
export async function execCondition(engine, params, tabId) {
    if (!tabId) throw new Error('Koşul kontrolü için aktif sekme gerekli');

    const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector, check, value) => {
            const el = selector ? document.querySelector(selector) : null;

            switch (check) {
                case 'var (görünür)':
                    if (!el) return { pass: false, reason: `Element bulunamadı: ${selector}` };
                    const rect = el.getBoundingClientRect();
                    const visible = rect.width > 0 && rect.height > 0;
                    return { pass: visible, reason: visible ? '' : 'Element görünür değil' };

                case 'yok (gizli)':
                    return { pass: !el, reason: el ? 'Element hâlâ mevcut' : '' };

                case 'metin içerir':
                    if (!el) return { pass: false, reason: `Element bulunamadı: ${selector}` };
                    const text = (el.innerText || el.textContent || '').trim();
                    return { pass: text.includes(value), reason: `Metin "${value}" içermiyor` };

                case 'metin eşittir':
                    if (!el) return { pass: false, reason: `Element bulunamadı: ${selector}` };
                    const txt = (el.innerText || el.textContent || '').trim();
                    return { pass: txt === value, reason: `Beklenen: "${value}", Mevcut: "${txt.slice(0, 80)}"` };

                default:
                    return { pass: false, reason: `Bilinmeyen kontrol tipi: ${check}` };
            }
        },
        args: [params.selector, params.check, params.value || '']
    });

    const res = result[0]?.result;
    if (!res) throw new Error('Koşul kontrolü çalıştırılamadı');

    return { pass: res.pass, reason: res.reason || '' };
}

/**
 * Loop (Döngü) Bloğu
 * Kendisinden sonraki blokları N kez tekrarlar.
 * NOT: Bu fonksiyon engine.run() içinde özel olarak handle edilir,
 * çünkü alt blokları yönetmesi gerekir.
 * 
 * @param {FlowEngine} engine
 * @param {Object} flow - Akış objesi
 * @param {number} loopBlockIndex - Döngü bloğunun index'i
 * @param {number} tabId
 * @param {Function} onStatus
 * @returns {{ tabId: number, skipTo: number }}
 */
export async function execLoop(engine, flow, loopBlockIndex, tabId, onStatus) {
    const loopBlock = flow.blocks[loopBlockIndex];
    const count = parseInt(loopBlock.params.count) || 3;

    // Döngüden sonraki blokları topla (bir sonraki loop/forEach'e kadar)
    const innerBlocks = [];
    for (let i = loopBlockIndex + 1; i < flow.blocks.length; i++) {
        const b = flow.blocks[i];
        if (b.type === 'loop' || b.type === 'forEach') break;
        innerBlocks.push({ block: b, originalIndex: i });
    }

    if (innerBlocks.length === 0) {
        throw new Error('Döngü bloğunun altında çalıştırılacak blok yok');
    }

    for (let iteration = 0; iteration < count; iteration++) {
        if (!engine.running) break;

        engine.variables['_iteration'] = iteration + 1;

        onStatus({
            state: 'running',
            flowId: flow.id,
            flowName: flow.name,
            message: `🔁 Döngü ${iteration + 1}/${count}...`
        });

        for (const { block } of innerBlocks) {
            if (!engine.running) break;
            if (block.enabled === false) continue;
            tabId = await engine.executeBlock(block, tabId);
        }
    }

    // Son inner block'un index'inden sonraya atla
    const lastInnerIndex = innerBlocks[innerBlocks.length - 1].originalIndex;
    return { tabId, skipTo: lastInnerIndex };
}

/**
 * ForEach (Her Biri İçin) Bloğu
 * Bir element listesindeki her çocuk için sonraki blokları çalıştırır.
 * 
 * @param {FlowEngine} engine
 * @param {Object} flow
 * @param {number} forEachIndex
 * @param {number} tabId
 * @param {Function} onStatus
 * @returns {{ tabId: number, skipTo: number }}
 */
export async function execForEach(engine, flow, forEachIndex, tabId, onStatus) {
    if (!tabId) throw new Error('ForEach için aktif sekme gerekli');

    const feBlock = flow.blocks[forEachIndex];
    const parentSelector = engine.interpolate(feBlock.params.selector);
    const childSelector = engine.interpolate(feBlock.params.childSelector) || 'li';

    // Çocuk element sayısını al
    const countResult = await chrome.scripting.executeScript({
        target: { tabId },
        func: (parent, child) => {
            const container = document.querySelector(parent);
            if (!container) return { error: `Liste bulunamadı: ${parent}` };
            return { count: container.querySelectorAll(child).length };
        },
        args: [parentSelector, childSelector]
    });

    const countRes = countResult[0]?.result;
    if (!countRes) throw new Error('ForEach element sayısı alınamadı');
    if (countRes.error) throw new Error(countRes.error);
    if (countRes.count === 0) throw new Error(`Listede eleman yok: ${parentSelector} > ${childSelector}`);

    // Sonraki blokları topla
    const innerBlocks = [];
    for (let i = forEachIndex + 1; i < flow.blocks.length; i++) {
        const b = flow.blocks[i];
        if (b.type === 'loop' || b.type === 'forEach') break;
        innerBlocks.push({ block: b, originalIndex: i });
    }

    if (innerBlocks.length === 0) {
        throw new Error('ForEach bloğunun altında çalıştırılacak blok yok');
    }

    for (let idx = 0; idx < countRes.count; idx++) {
        if (!engine.running) break;

        engine.variables['_index'] = idx + 1;
        engine.variables['_itemSelector'] = `${parentSelector} > ${childSelector}:nth-child(${idx + 1})`;

        onStatus({
            state: 'running',
            flowId: flow.id,
            flowName: flow.name,
            message: `🔄 Her Biri İçin ${idx + 1}/${countRes.count}...`
        });

        for (const { block } of innerBlocks) {
            if (!engine.running) break;
            if (block.enabled === false) continue;

            // Selector'ı otomatik nth-child ile değiştir
            const modBlock = JSON.parse(JSON.stringify(block));
            if (modBlock.params.selector === '*item') {
                modBlock.params.selector = engine.variables['_itemSelector'];
            }
            tabId = await engine.executeBlock(modBlock, tabId);
        }
    }

    const lastInnerIndex = innerBlocks[innerBlocks.length - 1].originalIndex;
    return { tabId, skipTo: lastInnerIndex };
}

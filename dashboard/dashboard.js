/** 🌊 ZhdsdAuto Dashboard Controller (UI Orchestrator) */

import { BLOCK_TYPES, CATEGORIES, FLOW_SCHEMA_VERSION } from './modules/constants.js';
import { generateId, showToast, escapeHTML } from './modules/utils.js';
import { validateFlow } from './modules/block-helpers.js';
import { Storage } from './modules/storage.js';
import { State } from './modules/state.js';
import { Renderer, getParamSummary } from './modules/ui-render.js';
import { setupDragAndDrop } from './modules/drag-drop.js';
import { runFlow, handleMessage, handlePicker, getLastPickerTabId } from './modules/execution.js';
import { cacheDOMRefs } from './modules/dom-refs.js';
import { cloneBlock, setupContextMenu, setupKeyboardShortcuts } from './modules/shortcuts.js';
import { handleBackupDownload, handleRestoreFileChange } from './modules/backup.js';

// DOM Referansları
let DOM = {};

let savedFlowSnapshot = '';
let isFlowDirty = false;

document.addEventListener('DOMContentLoaded', async () => {
    DOM = cacheDOMRefs();
    setupGlobalEvents();

    // Uygulama Başlangıcı
    const flows = await Storage.getFlows();
    State.setFlows(flows);

    // View Başlat
    renderPalette();
    renderFlowsView();
    chrome.runtime.onMessage.addListener((msg) => handleMessage(msg, State, DOM));
});

// EVENT LISTENERS
function setupGlobalEvents() {
    DOM.navItems.forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));

    // Akış İşlemleri
    DOM.createFlowBtn.onclick = createNewFlow;
    DOM.emptyCreateBtn.onclick = createNewFlow;
    DOM.saveFlowBtn.onclick = saveCurrentFlow;
    DOM.runFlowBtn.onclick = () => runFlow(State, DOM, saveCurrentFlow);
    DOM.backToFlows.onclick = () => switchView('flows');
    DOM.stopBtn.onclick = () => chrome.runtime.sendMessage({ type: 'STOP_FLOW' });

    DOM.flowNameInput.oninput = () => refreshDirtyState();
    DOM.blockSearchInput.oninput = () => renderPalette();
    DOM.blockSearchInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
            const firstVisible = document.querySelector('.palette-block');
            if (firstVisible) firstVisible.click();
        }
    };

    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Backup / Restore
    DOM.backupDownloadBtn.onclick = () => handleBackupDownload(State, DOM);
    DOM.restoreTriggerBtn.onclick = () => DOM.restoreFileInput.click();
    DOM.restoreFileInput.onchange = (e) => handleRestoreFileChange(e, State, DOM, renderFlowsView);

    // Konsol
    DOM.toggleConsoleBtn.onclick = toggleConsole;
    DOM.clearConsoleBtn.onclick = () => DOM.execConsoleBody.innerHTML = '';
    DOM.closeConsoleBtn.onclick = () => {
        DOM.execConsole.classList.add('hidden');
        DOM.toggleConsoleBtn.classList.remove('active');
    };

    // Keyboard Shortcuts
    setupKeyboardShortcuts({
        onSave: saveCurrentFlow,
        onRun: () => runFlow(State, DOM, saveCurrentFlow),
        onDelete: removeBlock,
        onClone: handleCloneBlock,
        onEscape: closeConfig,
        getSelectedBlockId: () => State.selectedBlockId
    });
}

// VIEW LOGIC
function getActiveViewId() {
    const active = document.querySelector('.view.active');
    return active ? active.id.replace('View', '') : null;
}

function captureCurrentDraftSnapshot() {
    if (!State.currentFlow) return '';

    const draft = JSON.parse(JSON.stringify(State.currentFlow));
    draft.name = (DOM.flowNameInput?.value || draft.name || '').trim() || 'İsimsiz Akış';
    return JSON.stringify(draft);
}

function setSavedSnapshotFromCurrent() {
    savedFlowSnapshot = captureCurrentDraftSnapshot();
    isFlowDirty = false;
    updateUnsavedBadge();
}

function updateUnsavedBadge() {
    if (!DOM.unsavedBadge) return;
    DOM.unsavedBadge.classList.toggle('hidden', !isFlowDirty);
}

function refreshDirtyState() {
    if (!State.currentFlow) {
        isFlowDirty = false;
        updateUnsavedBadge();
        return;
    }

    isFlowDirty = captureCurrentDraftSnapshot() !== savedFlowSnapshot;
    updateUnsavedBadge();
}

function hasUnsavedChanges() {
    refreshDirtyState();
    return isFlowDirty;
}

function switchView(viewId) {
    const activeViewId = getActiveViewId();

    if (activeViewId === 'builder' && viewId !== 'builder' && hasUnsavedChanges()) {
        const ok = confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden çıkmak istiyor musunuz?');
        if (!ok) return;
    }

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId + 'View').classList.add('active');
    DOM.navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewId));

    if (viewId === 'flows') renderFlowsView();
}

// RENDERERS
function renderFlowsView() {
    Renderer.renderFlowsList(
        State.flows,
        DOM.flowsGrid,
        (id) => {
            const flow = State.flows.find(f => String(f.id) === String(id));
            if (flow) {
                State.setCurrentFlow(flow);
                openBuilder();
            }
        },
        async (e, id) => {
            if (e && e.stopPropagation) e.stopPropagation();
            if (confirm('Bu akışı silmek istiyor musunuz?')) {
                const newFlows = await Storage.deleteFlow(id);
                State.setFlows(newFlows);
                renderFlowsView();
                showToast('🗑️ Akış silindi', DOM);
            }
        },
        async (id) => {
            await duplicateFlow(id);
        }
    );

    if (State.flows.length === 0) {
        DOM.flowsGrid.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
    } else {
        DOM.flowsGrid.classList.remove('hidden');
        DOM.emptyState.classList.add('hidden');
    }
}

function renderPalette() {
    const search = (DOM.blockSearchInput?.value || '').trim().toLowerCase();

    Object.entries(CATEGORIES).forEach(([catId, cat]) => {
        const container = document.getElementById(cat.containerId);
        if (!container) return;

        const categoryEl = container.closest('.palette-category');
        const blocks = Object.values(BLOCK_TYPES)
            .filter(b => b.category === catId)
            .filter(b => {
                if (!search) return true;

                const haystack = [
                    b.name,
                    b.description,
                    ...(Array.isArray(b.params) ? b.params.map(p => p.label) : [])
                ].join(' ').toLowerCase();

                return haystack.includes(search);
            });

        if (categoryEl) {
            categoryEl.classList.toggle('hidden', !!search && blocks.length === 0);
        }

        container.innerHTML = blocks.map(b => `
            <div class="palette-block" data-type="${b.id}" title="${b.description}">
                <span class="palette-block-icon">${b.icon}</span>
                <span>${b.name}</span>
            </div>
        `).join('');

        container.querySelectorAll('.palette-block').forEach(el => {
            el.onclick = () => addBlock(el.dataset.type);
        });
    });

    document.querySelectorAll('.palette-category').forEach(cat => {
        const title = cat.querySelector('.category-label');
        if (title) {
            title.onclick = () => cat.classList.toggle('collapsed');
        }
    });
}

function renderBuilder() {
    DOM.flowNameInput.value = State.currentFlow.name;
    const prevSelectedId = State.selectedBlockId;

    Renderer.renderBlocks(State.currentFlow, State.selectedBlockId, DOM.blocksList, (container) => {
        // 1. Select
        container.querySelectorAll('.block-item').forEach(el => {
            el.onclick = (e) => {
                if (!e.target.closest('button') && !e.target.closest('.block-drag-handle')
                    && !e.target.closest('input') && !e.target.closest('select')
                    && !e.target.closest('textarea') && !e.target.closest('label')) {
                    selectBlock(el.dataset.blockId);
                }
            };
        });

        // 2. Remove
        container.querySelectorAll('.block-item-remove').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                removeBlock(btn.dataset.id);
            };
        });

        // 3. Clone
        container.querySelectorAll('.block-item-clone').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                handleCloneBlock(btn.dataset.id);
            };
        });

        // 4. Move Up/Down
        container.querySelectorAll('.block-move-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                if (!btn.classList.contains('disabled')) {
                    moveBlock(btn.dataset.id, btn.dataset.dir);
                }
            };
        });

        // 5. Drag & Drop Logic
        setupDragAndDrop(container, State, renderBuilder);

        // 6. Context Menu (Sağ Tık)
        setupContextMenu(container, {
            onClone: handleCloneBlock,
            onDelete: removeBlock,
            onMoveUp: moveBlock,
            onMoveDown: moveBlock
        });
    });

    if (prevSelectedId && State.currentFlow.blocks.some(b => String(b.id) === String(prevSelectedId))) {
        State.selectBlock(null);
        selectBlock(prevSelectedId);
    }

    refreshDirtyState();
}

// ACTIONS
function createNewFlow() {
    const newFlow = {
        id: generateId(),
        name: 'Yeni Akış',
        schemaVersion: FLOW_SCHEMA_VERSION,
        createdAt: Date.now(),
        blocks: []
    };
    State.setCurrentFlow(newFlow);
    openBuilder();
}

function openBuilder() {
    switchView('builder');
    renderBuilder();
    setSavedSnapshotFromCurrent();
}

function addBlock(type) {
    if (!State.currentFlow) return;

    const typeDef = BLOCK_TYPES[type];
    const newBlock = {
        id: generateId(),
        type: type,
        params: {}
    };

    typeDef.params.forEach(p => {
        if (p.default !== undefined) newBlock.params[p.key] = p.default;
    });

    if (type === 'addButton') {
        newBlock.params.flowId = State.currentFlow.id;
    }

    State.currentFlow.blocks.push(newBlock);
    renderBuilder();
    selectBlock(newBlock.id);
    refreshDirtyState();
}

function removeBlock(blockId) {
    State.currentFlow.blocks = State.currentFlow.blocks.filter(b => String(b.id) !== String(blockId));
    if (String(State.selectedBlockId) === String(blockId)) {
        State.selectBlock(null);
    }
    renderBuilder();
    refreshDirtyState();
}

function handleCloneBlock(blockId) {
    const clone = cloneBlock(blockId, State.currentFlow, generateId);
    if (clone) {
        renderBuilder();
        selectBlock(clone.id);
        refreshDirtyState();
        showToast('📋 Blok klonlandı', DOM);
    }
}

function getNextDuplicateName(baseName) {
    const normalizedBase = (baseName || 'İsimsiz Akış').trim();
    const escaped = normalizedBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${escaped} \\(Kopya(?: (\\d+))?\\)$`);

    let hasPlainCopy = false;
    let maxSuffix = 1;

    State.flows.forEach(flow => {
        if (flow.name === `${normalizedBase} (Kopya)`) {
            hasPlainCopy = true;
            return;
        }

        const m = String(flow.name || '').match(re);
        if (m && m[1]) {
            const num = parseInt(m[1], 10);
            if (Number.isFinite(num)) {
                maxSuffix = Math.max(maxSuffix, num);
            }
        }
    });

    if (!hasPlainCopy) return `${normalizedBase} (Kopya)`;
    return `${normalizedBase} (Kopya ${maxSuffix + 1})`;
}

async function duplicateFlow(id) {
    const flow = State.flows.find(f => String(f.id) === String(id));
    if (!flow) return;

    const copy = {
        id: generateId(),
        name: getNextDuplicateName(flow.name),
        schemaVersion: FLOW_SCHEMA_VERSION,
        createdAt: Date.now(),
        blocks: JSON.parse(JSON.stringify(flow.blocks)).map(b => ({ ...b, id: generateId() }))
    };

    const flows = await Storage.saveFlow(copy);
    State.setFlows(flows);
    State.setCurrentFlow(copy);
    renderFlowsView();
    openBuilder();
    showToast('📋 Akış kopyalandı ve açıldı', DOM);
}

function selectBlock(blockId) {
    if (String(State.selectedBlockId) === String(blockId)) {
        closeConfig();
        return;
    }

    State.selectBlock(blockId);

    document.querySelectorAll('.block-item').forEach(el => {
        const isTarget = String(el.dataset.blockId) === String(blockId);
        el.classList.toggle('selected', isTarget);

        const toggleArrow = el.querySelector('.block-toggle-arrow');
        if (toggleArrow) toggleArrow.classList.toggle('open', isTarget);

        const configArea = el.querySelector('.block-config-inline');

        if (isTarget) {
            configArea.classList.remove('hidden');
            const block = State.getSelectedBlock();

            Renderer.renderConfig(block, configArea, (key, value) => {
                block.params[key] = value;
                const summary = getParamSummary(block);
                const descEl = el.querySelector('.block-item-desc');
                if (descEl) descEl.textContent = summary || '';
                refreshDirtyState();
            }, (btn, key) => handlePicker(btn, key, State, DOM), (targetBlock, testBtn, outputEl) => {
                testReadTextBlock(targetBlock, testBtn, outputEl);
            });

            const flowSelectEls = configArea.querySelectorAll('[data-flow-select]');
            if (flowSelectEls.length > 0) {
                Storage.getFlows().then(flows => {
                    flowSelectEls.forEach(sel => {
                        const current = sel.dataset.current;
                        sel.innerHTML = '<option value="" disabled>Akış seçin...</option>' +
                            flows.map(f => `<option value="${escapeHTML(f.id)}" ${f.id === current ? 'selected' : ''}>${escapeHTML(f.name)}</option>`).join('');
                        if (sel.value) {
                            block.params[sel.dataset.key] = sel.value;
                        }
                    });
                });
            }

        } else {
            configArea.classList.add('hidden');
            configArea.innerHTML = '';
        }
    });
}

function clearFlowValidationUI() {
    DOM.flowNameInput.classList.remove('input-error');
    DOM.flowNameInput.title = '';
    document.querySelectorAll('.block-item').forEach(el => {
        el.classList.remove('validation-error');
        el.removeAttribute('title');
    });
}

function applyFlowValidationUI(errors) {
    clearFlowValidationUI();

    if (!Array.isArray(errors) || errors.length === 0) return;

    const nameError = errors.find(e => e.type === 'flowName');
    if (nameError) {
        DOM.flowNameInput.classList.add('input-error');
        DOM.flowNameInput.title = nameError.message;
    }

    errors
        .filter(e => e.type === 'block' && e.blockId)
        .forEach(err => {
            const el = document.querySelector(`.block-item[data-block-id="${err.blockId}"]`);
            if (el) {
                el.classList.add('validation-error');
                el.title = err.message;
            }
        });
}

async function saveCurrentFlow() {
    if (!State.currentFlow) return;
    State.currentFlow.name = DOM.flowNameInput.value.trim() || 'İsimsiz Akış';
    State.currentFlow.schemaVersion = FLOW_SCHEMA_VERSION;

    const validation = validateFlow(State.currentFlow);
    if (!validation.valid) {
        renderBuilder();
        applyFlowValidationUI(validation.errors);
        showToast(`❌ Akış kaydedilemedi: ${validation.errors[0].message}`, DOM);
        return;
    }

    clearFlowValidationUI();

    const flows = await Storage.saveFlow(State.currentFlow);
    State.setFlows(flows);
    await syncFlowButtons(State.currentFlow);
    setSavedSnapshotFromCurrent();
    showToast('✅ Akış kaydedildi', DOM);
}

async function syncFlowButtons(flow) {
    const COLOR_MAP = {
        'Mavi': '#3b82f6', 'Kırmızı': '#ef4444', 'Yeşil': '#10b981',
        'Sarı': '#f59e0b', 'İndigo': '#6366f1', 'Mor': '#8b5cf6',
        'Pembe': '#ec4899', 'Cyan': '#06b6d4', 'Siyah': '#000000'
    };
    const POS_MAP = {
        'Sağ Alt': 'bottom-right', 'Sol Alt': 'bottom-left',
        'Sağ Üst': 'top-right', 'Sol Üst': 'top-left'
    };
    const SIZE_MAP = { 'Küçük': 'sm', 'Normal': 'md', 'Büyük': 'lg' };

    let buttons = await Storage.getButtons();
    buttons = buttons.filter(b => !String(b.id).startsWith(`btn_block_${flow.id}_`));

    flow.blocks.filter(b => b.type === 'addButton').forEach(block => {
        const p = block.params;
        const resolvedFlowId = p.flowId || flow.id;
        if (!p.urlPattern) return;

        const bgColor = COLOR_MAP[p.color] || '#3b82f6';
        const pos = POS_MAP[p.position] || 'bottom-right';
        const size = SIZE_MAP[p.size] || 'sm';

        const style = {
            position: 'fixed', zIndex: 999999,
            backgroundColor: bgColor, color: '#ffffff',
            borderRadius: '8px',
            top: 'auto', bottom: 'auto', left: 'auto', right: 'auto'
        };
        if (pos === 'top-left') { style.top = '20px'; style.left = '20px'; }
        if (pos === 'top-right') { style.top = '20px'; style.right = '20px'; }
        if (pos === 'bottom-left') { style.bottom = '20px'; style.left = '20px'; }
        if (pos === 'bottom-right') { style.bottom = '20px'; style.right = '20px'; }

        buttons.push({
            id: `btn_block_${flow.id}_${block.id}`,
            flowId: resolvedFlowId,
            urlPattern: p.urlPattern,
            label: p.label || 'Çalıştır',
            tooltip: p.tooltip || '',
            size,
            pulse: p.pulse !== false && p.pulse !== 'false',
            style
        });
    });

    await Storage.saveButtons(buttons);
}

function moveBlock(id, dir) {
    const blocks = State.currentFlow.blocks;
    const idx = blocks.findIndex(b => String(b.id) === String(id));
    if (idx < 0) return;

    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < blocks.length) {
        [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
        renderBuilder();
        refreshDirtyState();
    }
}

function closeConfig() {
    State.selectBlock(null);
    document.querySelectorAll('.block-config-inline').forEach(el => { el.classList.add('hidden'); el.innerHTML = ''; });
    document.querySelectorAll('.block-item').forEach(el => {
        el.classList.remove('selected');
        const arrow = el.querySelector('.block-toggle-arrow');
        if (arrow) arrow.classList.remove('open');
    });
}

async function testReadTextBlock(block, testBtn, outputEl) {
    const selector = (block?.params?.selector || '').trim();
    if (!selector || !testBtn || !outputEl) return;

    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    testBtn.textContent = 'Test ediliyor...';
    outputEl.textContent = 'Metin okunuyor...';
    outputEl.classList.remove('success', 'error');

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'TEST_READ_TEXT',
            selector,
            wordIndex: block?.params?.wordIndex || '',
            tabId: getLastPickerTabId()
        });

        if (!response?.success) {
            outputEl.textContent = response?.error || 'Metin okunamadı';
            outputEl.classList.add('error');
            return;
        }

        const text = response.data || '(boş metin)';
        outputEl.textContent = `Çekilen metin: ${text}`;
        outputEl.classList.add('success');
    } catch (error) {
        outputEl.textContent = `Hata: ${error.message}`;
        outputEl.classList.add('error');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = originalText;
    }
}

function toggleConsole() {
    const isHidden = DOM.execConsole.classList.toggle('hidden');
    DOM.toggleConsoleBtn.classList.toggle('active', !isHidden);
}

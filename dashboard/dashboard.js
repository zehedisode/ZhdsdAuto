/**
 * 🌊 ZhdsdAuto Dashboard Controller (UI Orchestrator)
 * 
 * Bu dosya Kullanıcı Arayüzünün (UI) beynidir.
 * 
 * 🎮 Sorumluluklar:
 * 1. Olayları Dinle: Tıklama, sürükle-bırak, input değişiklikleri.
 * 2. Durumu Yönet (State): Hangi akış seçili, hangi blok düzenleniyor.
 * 3. Veriyi Yönet (Storage): Akışları kaydet, yükle, sil.
 * 4. Çizim Yap (Renderer): UI güncellemelerini `ui-render.js` modülüne yaptır.
 * 5. İletişim Kur: Arka plan servisi (Service Worker) ile mesajlaş (Başlat/Durdur).
 */

import { BLOCK_TYPES, CATEGORIES, TEMPLATES } from './modules/constants.js';
import { generateId, showToast } from './modules/utils.js';
import { Storage } from './modules/storage.js';
import { State } from './modules/state.js';
import { Renderer, getParamSummary } from './modules/ui-render.js';
import { setupDragAndDrop } from './modules/drag-drop.js';
import { runFlow, handleMessage, handlePicker } from './modules/execution.js';
import { handleBackupDownload, handleRestoreFileChange } from './modules/backup.js';
import { renderButtonsView, openButtonModal, closeButtonModal, handleButtonFormSubmit, updateLivePreview } from './modules/page-buttons.js';
import { cacheDOMRefs } from './modules/dom-refs.js';
import { injectButtonModal } from './modules/button-modal.js';

// DOM Referansları
let DOM = {};

document.addEventListener('DOMContentLoaded', async () => {
    injectButtonModal();
    DOM = cacheDOMRefs();
    setupGlobalEvents();

    // Uygulama Başlangıcı
    const flows = await Storage.getFlows();
    State.setFlows(flows);

    // View Başlat
    renderPalette();
    renderTemplatesList();
    renderFlowsView();

    // Chrome Mesaj Dinleyicisi
    chrome.runtime.onMessage.addListener((msg) => handleMessage(msg, State, DOM));
});

// ===================================================================
// EVENT LISTENERS
// ===================================================================
function setupGlobalEvents() {
    // Navigasyon
    DOM.navItems.forEach(item => {
        item.addEventListener('click', () => switchView(item.dataset.view));
    });

    // Akış İşlemleri
    DOM.createFlowBtn.onclick = createNewFlow;
    DOM.emptyCreateBtn.onclick = createNewFlow;
    DOM.saveFlowBtn.onclick = saveCurrentFlow;
    DOM.runFlowBtn.onclick = () => runFlow(State, DOM, saveCurrentFlow);
    DOM.backToFlows.onclick = () => switchView('flows');
    DOM.stopBtn.onclick = () => chrome.runtime.sendMessage({ type: 'STOP_FLOW' });

    // Konsol
    DOM.toggleConsoleBtn.onclick = toggleConsole;
    DOM.clearConsoleBtn.onclick = () => DOM.execConsoleBody.innerHTML = '';
    DOM.closeConsoleBtn.onclick = () => {
        DOM.execConsole.classList.add('hidden');
        DOM.toggleConsoleBtn.classList.remove('active');
    };

    // Backup & Restore
    DOM.downloadBackupBtn.onclick = () => handleBackupDownload(State, DOM);
    DOM.restoreBtn.onclick = () => DOM.restoreFileInput.click();
    DOM.restoreFileInput.onchange = (e) => handleRestoreFileChange(e, State, DOM, renderFlowsView);

    // Page Buttons
    DOM.createButtonBtn.onclick = () => openButtonModal(null, State, DOM);

    // Modal Events
    DOM.closeButtonModal.onclick = () => closeButtonModal(DOM);
    DOM.cancelButtonModal.onclick = () => closeButtonModal(DOM);
    DOM.buttonForm.onsubmit = (e) => handleButtonFormSubmit(e, State, DOM);

    // Color Picker
    DOM.colorPicker.querySelectorAll('.color-option').forEach(opt => {
        opt.onclick = () => {
            DOM.colorPicker.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            updateLivePreview(DOM);
        };
    });

    // Position Picker
    DOM.positionPicker.querySelectorAll('.pos-option').forEach(opt => {
        opt.onclick = () => {
            DOM.positionPicker.querySelectorAll('.pos-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            updateLivePreview(DOM);
        };
    });

    // Icon Picker
    DOM.iconPicker.querySelectorAll('.icon-option').forEach(opt => {
        opt.onclick = () => {
            DOM.iconPicker.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            updateLivePreview(DOM);
        };
    });

    // Size Picker
    DOM.sizePicker.querySelectorAll('.size-option').forEach(opt => {
        opt.onclick = () => {
            DOM.sizePicker.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
            updateLivePreview(DOM);
        };
    });

    // Radius Slider
    DOM.btnRadius.oninput = () => {
        DOM.radiusValue.textContent = DOM.btnRadius.value + 'px';
        updateLivePreview(DOM);
    };

    // Toggle Switches
    DOM.autoRunToggle.onclick = () => DOM.autoRunSwitch.classList.toggle('active');
    DOM.pulseToggle.onclick = () => DOM.pulseSwitch.classList.toggle('active');

    // Live Preview Inputs
    DOM.btnLabel.addEventListener('input', () => updateLivePreview(DOM));
}

// ===================================================================
// VIEW LOGIC
// ===================================================================
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId + 'View').classList.add('active');
    DOM.navItems.forEach(item => item.classList.toggle('active', item.dataset.view === viewId));

    if (viewId === 'flows') renderFlowsView();
    if (viewId === 'buttons') renderButtonsView(State, DOM);
}

// ===================================================================
// RENDERERS (Delegation)
// ===================================================================
function renderFlowsView() {
    Renderer.renderFlowsList(State.flows, DOM.flowsGrid, (id) => {
        // Edit Action
        const flow = State.flows.find(f => String(f.id) === String(id));
        if (flow) {
            State.setCurrentFlow(flow);
            openBuilder();
        }
    }, async (e, id) => {
        // Delete Action
        if (e && e.stopPropagation) e.stopPropagation();

        if (confirm('Bu akışı silmek istiyor musunuz?')) {
            const newFlows = await Storage.deleteFlow(id);
            State.setFlows(newFlows);
            renderFlowsView();
            showToast('🗑️ Akış silindi', DOM);
        }
    });

    // Boş durum kontrolü
    if (State.flows.length === 0) {
        DOM.flowsGrid.classList.add('hidden');
        DOM.emptyState.classList.remove('hidden');
    } else {
        DOM.flowsGrid.classList.remove('hidden');
        DOM.emptyState.classList.add('hidden');
    }
}

function renderPalette() {
    Object.entries(CATEGORIES).forEach(([catId, cat]) => {
        const container = document.getElementById(cat.containerId);
        if (!container) return;

        const blocks = Object.values(BLOCK_TYPES).filter(b => b.category === catId);
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

    // Accordion Logic (Sol Menü)
    document.querySelectorAll('.palette-category').forEach(cat => {
        const title = cat.querySelector('.category-label');
        if (title) {
            title.onclick = () => cat.classList.toggle('collapsed');
        }
    });
}

function renderTemplatesList() {
    DOM.templatesGrid.innerHTML = TEMPLATES.map(t => `
        <div class="template-card" data-template="${t.id}">
            <div class="template-card-icon">${t.icon}</div>
            <div class="template-card-title">${t.name}</div>
            <div class="template-card-desc">${t.description}</div>
            <div class="template-card-meta"><span>📦 ${t.blockCount} adım</span></div>
        </div>
    `).join('');

    DOM.templatesGrid.querySelectorAll('.template-card').forEach(card => {
        card.onclick = () => loadTemplate(card.dataset.template);
    });
}

function renderBuilder() {
    DOM.flowNameInput.value = State.currentFlow.name;

    // Blokları Render Et
    Renderer.renderBlocks(State.currentFlow, State.selectedBlockId, DOM.blocksList, (container) => {
        // Event Delegation for Blocks

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

        // 3. Move Up/Down
        container.querySelectorAll('.block-move-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                if (!btn.classList.contains('disabled')) {
                    moveBlock(btn.dataset.id, btn.dataset.dir);
                }
            };
        });

        // 4. Drag & Drop Logic
        setupDragAndDrop(container, State, renderBuilder);
    });
}

// ===================================================================
// ACTIONS (Business Logic)
// ===================================================================
function createNewFlow() {
    const newFlow = {
        id: generateId(),
        name: 'Yeni Akış',
        createdAt: Date.now(),
        blocks: []
    };
    State.setCurrentFlow(newFlow);
    openBuilder();
}

function openBuilder() {
    switchView('builder');
    renderBuilder();
}

function addBlock(type) {
    if (!State.currentFlow) return;

    const typeDef = BLOCK_TYPES[type];
    const newBlock = {
        id: generateId(),
        type: type,
        params: {}
    };

    // Varsayılanları ata
    typeDef.params.forEach(p => {
        if (p.default !== undefined) newBlock.params[p.key] = p.default;
    });

    State.currentFlow.blocks.push(newBlock);
    renderBuilder();
    selectBlock(newBlock.id);
}

function removeBlock(blockId) {
    State.currentFlow.blocks = State.currentFlow.blocks.filter(b => String(b.id) !== String(blockId));
    if (String(State.selectedBlockId) === String(blockId)) {
        State.selectBlock(null); // Sadece state'i temizle
    }
    renderBuilder();
}

function selectBlock(blockId) {
    // Zaten seçili bloğa tekrar tıklandıysa re-render yapma (input focus korunur)
    if (String(State.selectedBlockId) === String(blockId)) return;

    // 1. Durumu güncelle
    State.selectBlock(blockId);

    // 2. UI'da sadece seçili bloğu işaretle (Active class)
    document.querySelectorAll('.block-item').forEach(el => {
        const isTarget = String(el.dataset.blockId) === String(blockId);
        el.classList.toggle('selected', isTarget);

        // Inline config alanını bul
        const configArea = el.querySelector('.block-config-inline');

        if (isTarget) {
            // AÇ: Config render et
            configArea.classList.remove('hidden');
            const block = State.getSelectedBlock();

            // Render Config Inside Block
            Renderer.renderConfig(block, configArea, (key, value) => {
                block.params[key] = value;
                const summary = getParamSummary(block);
                const descEl = el.querySelector('.block-item-desc');
                if (descEl) descEl.textContent = summary || '';

            }, (btn, key) => handlePicker(btn, key, State, DOM));

        } else {
            // KAPAT
            configArea.classList.add('hidden');
            configArea.innerHTML = ''; // Temizle
        }
    });
}

async function saveCurrentFlow() {
    if (!State.currentFlow) return;
    State.currentFlow.name = DOM.flowNameInput.value.trim() || 'İsimsiz Akış';

    const flows = await Storage.saveFlow(State.currentFlow);
    State.setFlows(flows);
    showToast('✅ Akış kaydedildi', DOM);
}

function loadTemplate(templateId) {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const newFlow = {
        id: generateId(),
        name: template.name,
        createdAt: Date.now(),
        blocks: JSON.parse(JSON.stringify(template.blocks)).map(b => ({ ...b, id: generateId() }))
    };
    State.setCurrentFlow(newFlow);
    openBuilder();
    showToast(`🎨 ${template.name} yüklendi`, DOM);
}

function moveBlock(id, dir) {
    const blocks = State.currentFlow.blocks;
    const idx = blocks.findIndex(b => String(b.id) === String(id));
    if (idx < 0) return;

    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < blocks.length) {
        [blocks[idx], blocks[newIdx]] = [blocks[newIdx], blocks[idx]];
        renderBuilder();
    }
}

function closeConfig() {
    // Inline modunda bu fonksiyona gerek kalmadı ama referansları kırmamak için boş bırakabiliriz
    State.selectBlock(null);
    document.querySelectorAll('.block-config-inline').forEach(el => {
        el.classList.add('hidden');
        el.innerHTML = '';
    });
    document.querySelectorAll('.block-item').forEach(el => el.classList.remove('selected'));
}

function toggleConsole() {
    const isHidden = DOM.execConsole.classList.toggle('hidden');
    DOM.toggleConsoleBtn.classList.toggle('active', !isHidden);
}

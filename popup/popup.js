/**
 * FlowMate Popup Controller
 * Modern MVC mimarisi ile yeniden yazıldı.
 */

import { Storage } from './modules/storage.js';
import { State } from './modules/state.js';
import { Renderer } from './modules/ui-render.js';
import { generateId, showToast } from './modules/utils.js';

// Global DOM
let DOM = {};

document.addEventListener('DOMContentLoaded', async () => {
    cacheDOMRefs();
    setupEvents();

    // Verileri Yükle
    const flows = await Storage.getFlows();
    State.setFlows(flows);

    // Başlangıç Görünümü
    switchView('list');

    // Mesajlaşma
    chrome.runtime.onMessage.addListener(handleMessage);
});

function cacheDOMRefs() {
    DOM = {
        // Views
        listView: document.getElementById('listView'),
        builderView: document.getElementById('builderView'),
        emptyState: document.getElementById('emptyState'),

        // List Mode
        flowsList: document.getElementById('flowsList'),
        createFlowBtn: document.getElementById('createFlowBtn'),
        openDashboardBtn: document.getElementById('openDashboardBtn'),

        // Builder Mode
        flowNameInput: document.getElementById('flowNameInput'),
        blocksList: document.getElementById('blocksList'),
        addBlockBtns: document.querySelectorAll('.add-block-btn'),
        saveFlowBtn: document.getElementById('saveFlowBtn'),
        runBuilderFlowBtn: document.getElementById('runBuilderFlowBtn'),
        cancelBuilderBtn: document.getElementById('cancelBuilderBtn'),

        // Status & Console
        statusPanel: document.getElementById('statusPanel'),
        statusText: document.getElementById('statusText'),
        consoleLogs: document.getElementById('consoleLogs'),
        toast: document.getElementById('toast')
    };
}

function setupEvents() {
    // List Actions
    DOM.createFlowBtn.onclick = createNewFlow;
    DOM.openDashboardBtn.onclick = () => chrome.tabs.create({ url: 'dashboard/index.html' });

    // Builder Actions
    DOM.cancelBuilderBtn.onclick = () => switchView('list');
    DOM.saveFlowBtn.onclick = saveCurrentFlow;
    DOM.runBuilderFlowBtn.onclick = runCurrentFlow;

    // Add Block Buttons
    DOM.addBlockBtns.forEach(btn => {
        btn.onclick = () => addBlock(btn.dataset.type);
    });
}

// ===================================================================
// VIEW LOGIC
// ===================================================================
function switchView(mode) {
    State.setMode(mode);
    if (mode === 'list') {
        DOM.listView.classList.remove('hidden');
        DOM.builderView.classList.add('hidden');
        renderFlowsList();
    } else {
        DOM.listView.classList.add('hidden');
        DOM.builderView.classList.remove('hidden');
        renderBuilder();
    }
}

// ===================================================================
// RENDERERS
// ===================================================================
function renderFlowsList() {
    Renderer.renderFlowsList(State.flows, DOM.flowsList, (id) => {
        // Edit
        const flow = State.flows.find(f => String(f.id) === String(id));
        if (flow) {
            State.setCurrentFlow(flow);
            switchView('builder');
        }
    }, (id) => {
        // Run
        const flow = State.flows.find(f => String(f.id) === String(id));
        if (flow) runFlow(flow);
    }, async (id) => {
        // Delete
        if (confirm('Silmek istediğine emin misin?')) {
            const newFlows = await Storage.deleteFlow(id);
            State.setFlows(newFlows);
            renderFlowsList();
        }
    });
}

function renderBuilder() {
    if (!State.currentFlow) return;
    DOM.flowNameInput.value = State.currentFlow.name;

    Renderer.renderBlocksList(State.currentFlow, DOM.blocksList, State.selectedBlockId, (container) => {
        // Move Up/Down
        container.querySelectorAll('.block-move-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                moveBlock(btn.dataset.id, btn.dataset.dir);
            };
        });

        // Remove
        container.querySelectorAll('.block-remove-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                removeBlock(btn.dataset.id);
            };
        });

        // Select logic can be added here
    });
}

// ===================================================================
// BUSINESS LOGIC
// ===================================================================
function createNewFlow() {
    const newFlow = {
        id: generateId(),
        name: 'Yeni Hızlı Akış',
        createdAt: Date.now(),
        blocks: []
    };
    State.setCurrentFlow(newFlow);
    switchView('builder');
}

function addBlock(type) {
    if (!State.currentFlow) return;

    const newBlock = {
        id: generateId(),
        type: type,
        params: getDefaultParams(type)
    };

    State.currentFlow.blocks.push(newBlock);
    renderBuilder();
}

function getDefaultParams(type) {
    switch (type) {
        case 'navigate': return { url: 'https://google.com' };
        case 'wait': return { duration: 1000 };
        case 'type': return { text: 'Merhaba' };
        default: return {};
    }
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

function removeBlock(id) {
    State.currentFlow.blocks = State.currentFlow.blocks.filter(b => String(b.id) !== String(id));
    renderBuilder();
}

async function saveCurrentFlow() {
    if (!State.currentFlow) return;
    State.currentFlow.name = DOM.flowNameInput.value.trim() || 'İsimsiz Akış';

    const flows = await Storage.saveFlow(State.currentFlow);
    State.setFlows(flows);
    showToast('✅ Kaydedildi', DOM);
    switchView('list');
}

// ===================================================================
// EXECUTION
// ===================================================================
function runCurrentFlow() {
    if (!State.currentFlow) return;
    runFlow(State.currentFlow);
}

function runFlow(flow) {
    // UI Feedback
    DOM.consoleLogs.innerHTML = '';
    Renderer.appendLog('info', `▶ "${flow.name}" başlatılıyor...`, DOM.consoleLogs);

    chrome.runtime.sendMessage({ type: 'RUN_FLOW', flow: flow }, (resp) => {
        if (!resp.success) {
            Renderer.appendLog('error', 'Hata: ' + resp.error, DOM.consoleLogs);
            showToast('❌ Başlatılamadı', DOM);
        }
    });
}

function handleMessage(msg) {
    if (msg.type === 'FLOW_STATUS') {
        const { status } = msg;

        // Banner Update
        if (status.state === 'running') {
            Renderer.toggleStatusPanel(true, status.message, 'info', DOM);
            Renderer.appendLog('info', status.message, DOM.consoleLogs);
        } else if (status.state === 'completed') {
            Renderer.toggleStatusPanel(true, '✅ Tamamlandı', 'success', DOM);
            Renderer.appendLog('success', 'Akış başarıyla tamamlandı', DOM.consoleLogs);
            setTimeout(() => DOM.statusPanel.classList.add('hidden'), 3000);
        } else if (status.state === 'error') {
            Renderer.toggleStatusPanel(true, '❌ Hata', 'error', DOM);
            Renderer.appendLog('error', status.message, DOM.consoleLogs);
        }
    }
}

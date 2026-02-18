/**
 * Popup UI Render Module
 * View Logic: Tüm bileşenlerin çiziminden sorumludur.
 */
import { escapeHTML } from './utils.js';

export const Renderer = {

    /**
     * Akış Listesi
     */
    renderFlowsList(flows, container, onEdit, onRun, onDelete) {
        if (!flows || flows.length === 0) {
            container.innerHTML = '';
            document.getElementById('emptyState').classList.remove('hidden');
            return;
        }

        document.getElementById('emptyState').classList.add('hidden');
        container.innerHTML = flows.map(flow => `
            <div class="flow-item">
                <div class="flow-info">
                    <span class="flow-icon">⚡</span>
                    <div class="flow-details">
                        <div class="flow-name" title="${escapeHTML(flow.name)}">${escapeHTML(flow.name)}</div>
                        <div class="flow-meta">${flow.blocks.length} adım • ${new Date(flow.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>
                <div class="flow-actions">
                    <button class="btn-icon edit-btn" data-id="${flow.id}" title="Düzenle">✏️</button>
                    <button class="btn-icon run-btn" data-id="${flow.id}" title="Çalıştır">▶</button>
                    <button class="btn-icon delete-btn" data-id="${flow.id}" title="Sil">🗑️</button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = () => onEdit(btn.dataset.id));
        container.querySelectorAll('.run-btn').forEach(btn => btn.onclick = () => onRun(btn.dataset.id));
        container.querySelectorAll('.delete-btn').forEach(btn => btn.onclick = (e) => onDelete(e, btn.dataset.id));
    },

    /**
     * Blok Listesi (Builder Mode)
     */
    renderBlocksList(flow, container, selectedId, onBlockEvents) {
        if (!flow || !flow.blocks) return;
        const blocks = flow.blocks;

        container.innerHTML = blocks.map((block, i) => {
            const isSelected = String(block.id) === String(selectedId);
            const summary = getBlockSummary(block);

            return `
                <div class="block-item ${isSelected ? 'selected' : ''}" 
                     data-block-id="${block.id}" 
                     data-block-index="${i}"
                     draggable="true">
                    
                    <div class="block-header">
                        <span class="block-drag-handle">⠿</span>
                        <span class="block-type-icon">${getBlockIcon(block.type)}</span>
                        <span class="block-title">${getBlockLabel(block.type)}</span>
                        <div class="block-actions">
                            <button class="block-move-btn" data-dir="up" data-id="${block.id}">▲</button>
                            <button class="block-move-btn" data-dir="down" data-id="${block.id}">▼</button>
                            <button class="block-remove-btn" data-id="${block.id}">×</button>
                        </div>
                    </div>
                    ${summary ? `<div class="block-summary">${escapeHTML(summary)}</div>` : ''}
                </div>
            `;
        }).join('');

        onBlockEvents(container);
    },

    /**
     * Konsol Log Çizimi
     */
    appendLog(type, msg, container) {
        const div = document.createElement('div');
        div.className = `log-entry ${type}`;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    toggleStatusPanel(show, msg, type, DOM) {
        DOM.statusPanel.classList.toggle('hidden', !show);
        if (show) {
            DOM.statusText.textContent = msg;
            DOM.statusPanel.className = `status-panel ${type}`; // info / success / error
        }
    }
};

// --- Yardımcılar ---
function getBlockIcon(type) {
    const icons = { navigate: '🌐', click: '🖱️', type: '⌨️', wait: '⏳', scroll: '📜', readText: '📖' };
    return icons[type] || '⚡';
}

function getBlockLabel(type) {
    const labels = { navigate: 'Sayfaya Git', click: 'Tıkla', type: 'Yaz', wait: 'Bekle', scroll: 'Kaydır', readText: 'Metin Oku' };
    return labels[type] || type;
}

function getBlockSummary(block) {
    const p = block.params;
    if (!p) return '';
    switch (block.type) {
        case 'navigate': return p.url;
        case 'click': return p.selector;
        case 'type': return `"${p.text}" → ${p.selector}`;
        case 'wait': return `${p.duration}ms`;
        default: return '';
    }
}

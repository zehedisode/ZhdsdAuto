/**
 * UI Render Module 2.0
 * View Logic: Tüm bileşenlerin çiziminden sorumludur.
 */
import { BLOCK_TYPES } from './constants.js';
import { escapeHTML } from './utils.js';

export const Renderer = {

    /**
     * Akışlar Sayfası
     */
    renderFlowsList(flows, container, onEdit, onDelete) {
        if (!flows.length) {
            container.innerHTML = '';
            document.getElementById('emptyState').classList.remove('hidden');
            document.getElementById('flowsGrid').classList.add('hidden');
            return;
        }

        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('flowsGrid').classList.remove('hidden');

        container.innerHTML = flows.map(flow => {
            const date = flow.createdAt ? new Date(flow.createdAt).toLocaleDateString() : 'Bilinmiyor';
            return `
                <div class="flow-card" data-id="${flow.id}">
                    <div class="flow-card-header">
                        <span class="flow-card-icon">⚡</span>
                        <h3 class="flow-card-name">${escapeHTML(flow.name)}</h3>
                    </div>
                    <div class="flow-card-meta">
                        <span>📦 ${flow.blocks.length} adım</span>
                        <span>🕒 ${date}</span>
                    </div>
                    <div class="flow-card-actions">
                        <button class="btn-icon delete-btn" data-id="${flow.id}" title="Sil">🗑️</button>
                        <button class="btn btn-primary btn-sm edit-btn" data-id="${flow.id}">Düzenle</button>
                    </div>
                </div>`;
        }).join('');

        container.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = () => onEdit(btn.dataset.id));
        container.querySelectorAll('.delete-btn').forEach(btn => btn.onclick = (e) => onDelete(e, btn.dataset.id));
    },

    /**
     * Builder Sayfası (Blok Listesi)
     */
    renderBlocks(flow, selectedId, container, onBlockEvents) {
        if (!flow) return;
        const blocks = flow.blocks;

        // UI Durumu
        document.getElementById('canvasEmpty').classList.toggle('hidden', blocks.length > 0);
        container.classList.toggle('hidden', blocks.length === 0);

        // Render Loops
        container.innerHTML = blocks.map((block, i) => {
            const typeDef = BLOCK_TYPES[block.type];
            if (!typeDef) return '';

            const summary = getParamSummary(block);
            const isFirst = i === 0;
            const isLast = i === blocks.length - 1;
            const isSelected = String(block.id) === String(selectedId);

            return `
                ${i > 0 ? '<div class="block-connector">↓</div>' : ''}
                <div class="block-item ${isSelected ? 'selected' : ''}" 
                     data-block-id="${block.id}" 
                     data-block-index="${i}" 
                     draggable="true">
                    
                    <div class="block-item-header">
                        <span class="block-drag-handle" title="Sürükle">⠿</span>
                        <span class="block-item-icon">${typeDef.icon}</span>
                        <span class="block-item-name">${typeDef.name}</span>
                        
                        <div class="block-move-btns">
                            <button class="block-move-btn ${isFirst ? 'disabled' : ''}" data-dir="up" data-id="${block.id}">▲</button>
                            <button class="block-move-btn ${isLast ? 'disabled' : ''}" data-dir="down" data-id="${block.id}">▼</button>
                        </div>

                        <span class="block-item-index">#${i + 1}</span>
                        <button class="block-item-remove" data-id="${block.id}" title="Kaldır">×</button>
                    </div>

                    ${summary ? `<div class="block-item-desc">${escapeHTML(summary)}</div>` : ''}
                    
                    <!-- Inline Config Area -->
                    <div class="block-config-inline hidden"></div>
                </div>`;
        }).join('');

        // Eventleri Bağla
        onBlockEvents(container);
    },

    /**
     * Config Paneli
     */
    renderConfig(block, container, onInput, onPick) {
        const typeDef = BLOCK_TYPES[block.type];

        // 1. Parametre Alanları
        let html = typeDef.params.map(p => {
            const val = block.params[p.key] || '';
            let inputHtml = '';

            if (p.type === 'text' || p.type === 'number') {
                inputHtml = `<input type="${p.type}" class="input" data-key="${p.key}" value="${escapeHTML(val)}" placeholder="${p.placeholder || ''}">`;
            } else if (p.type === 'select') {
                inputHtml = `<select class="input" data-key="${p.key}">${p.options.map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
            } else if (p.type === 'checkbox') {
                // Checkbox için özel düzenleme
                return `<div class="config-field checkbox-field">
                            <label>
                                <input type="checkbox" data-key="${p.key}" ${val ? 'checked' : ''}>
                                <span>${p.label}</span>
                            </label>
                        </div>`;
            } else if (p.type === 'selector') {
                inputHtml = `<div class="selector-wrapper">
                                <button class="selector-btn ${val ? 'has-value' : ''}" data-key="${p.key}">${val || 'Element Seç (Hedef)'}</button>
                                ${val ? `<button class="selector-clear" title="Temizle" data-key="${p.key}">×</button>` : ''}
                             </div>`;
            }

            return `<div class="config-field">
                        <label>${p.label}</label>
                        ${inputHtml}
                    </div>`;
        }).join('');

        // 2. Kullanım Detayları Kutusu (Yeni Özellik)
        if (typeDef.details) {
            html += `
                <div class="config-details-box">
                    <div class="details-header">💡 Nasıl Kullanılır?</div>
                    <div class="details-content">${typeDef.details.replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Input dinleyicileri
        container.querySelectorAll('input, select').forEach(el => {
            el.oninput = (e) => {
                const newVal = el.type === 'checkbox' ? el.checked : el.value;
                onInput(el.dataset.key, newVal);
            };
        });

        // Picker butonları
        container.querySelectorAll('.selector-btn').forEach(btn => {
            btn.onclick = () => onPick(btn, btn.dataset.key);
        });

        // Temizleme butonları
        container.querySelectorAll('.selector-clear').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                onInput(btn.dataset.key, '');
                // UI'ı güncellemek için parent'ı uyarabiliriz veya renderConfig tekrar çağrılır
                const wrapper = btn.closest('.config-field');
                const selectorBtn = wrapper.querySelector('.selector-btn');
                selectorBtn.textContent = 'Element Seç (Hedef)';
                selectorBtn.classList.remove('has-value');
                btn.remove();
            };
        });
    },

    /**
     * Palet ve Şablonlar
     */
    renderPalette(containerMap, onBlockAdd) {
        // Bu UI logic önceden ui-render.js içindeydi, buraya dahil edildi
        // containerMap: { category: elementId }
        // implementation skipped for brevity, assumed separate or integrated
    },

    renderConsoleLine(type, msg, container) {
        const line = document.createElement('div');
        line.className = `exec-line ${type}`;
        const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        line.innerHTML = `<span class="exec-time">${time}</span><span class="exec-msg">${escapeHTML(msg)}</span>`;
        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
    },

    toggleStatusBanner(show, status, DOM) {
        DOM.statusBanner.classList.toggle('hidden', !show);
        if (show) {
            DOM.bannerMessage.textContent = status.message;
            DOM.progressBar.style.width = `${(status.current / status.total) * 100}%`;
            if (status.state === 'error') DOM.statusBanner.classList.add('error');
            else DOM.statusBanner.classList.remove('error');
        }
    }
};

/**
 * Yardımcı: Parametre Özeti
 */
export function getParamSummary(block) {
    const p = block.params;
    switch (block.type) {
        case 'navigate': return p.url || '';
        case 'newTab': return `${p.active !== false ? 'Öne gel' : 'Arkaplan'}: ${p.url || 'Boş'}`;
        case 'activateTab': return `"${p.query}" (${p.matchType})`;
        case 'switchTab': return `${p.direction || 'sonraki'} sekme`;
        case 'closeTab': return `${p.target === 'diğerleri' ? 'Diğerlerini kapat' : 'Bu sekmeyi kapat'}`;

        case 'getTabInfo': return `${p.infoType || 'url'} → $${p.variable}`;
        case 'wait': return `${p.duration || 1000}ms`;
        case 'waitForElement': return p.selector || '';
        case 'readText': return `${p.selector || '?'} → $${p.variable || '?'}`;
        case 'readAttribute': return `${p.attribute || '?'} → $${p.variable || '?'}`;
        case 'setVariable': return `$${p.variable || '?'} = ${p.value || '?'}`;
        case 'scroll': return `${p.direction || 'aşağı'} ${p.amount || 500}px`;
        case 'keyboard': return `${p.modifier !== 'yok' ? p.modifier + '+' : ''}${p.key || '?'}`;
        case 'click': case 'hover': case 'select': return p.selector || '';
        case 'type': return p.selector ? `"${p.text || '...'}" → ${p.selector}` : '';
        case 'condition': return `${p.check || ''}: ${p.value || ''}`;
        case 'loop': return `${p.count || 0}x tekrar`;
        case 'forEach': return p.selector || '';
        default: return '';
    }
}

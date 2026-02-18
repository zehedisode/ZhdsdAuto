/**
 * 🔘 Page Buttons Module
 * Sayfa butonları: CRUD, modal, form submit, live preview.
 */

import { Storage } from './storage.js';
import { generateId, showToast } from './utils.js';

export async function renderButtonsView(State, DOM) {
    const buttons = await Storage.getButtons();
    const flows = await Storage.getFlows(); // Flow isimleri için lazım

    if (buttons.length === 0) {
        DOM.buttonsGrid.innerHTML = '';
        DOM.buttonsGrid.classList.add('hidden');
        DOM.buttonsEmptyState.classList.remove('hidden');
        return;
    }

    DOM.buttonsEmptyState.classList.add('hidden');
    DOM.buttonsGrid.classList.remove('hidden');

    DOM.buttonsGrid.innerHTML = buttons.map(btn => {
        const flow = flows.find(f => f.id === btn.flowId);
        const flowName = flow ? flow.name : 'Silinmiş Akış';
        const icon = btn.icon || '';
        const sizeLabel = btn.size === 'sm' ? 'Küçük' : btn.size === 'lg' ? 'Büyük' : 'Normal';

        return `
        <div class="button-card">
            <div class="button-card-header">
                <div class="button-card-preview" style="background-color: ${btn.style?.backgroundColor || '#3b82f6'}; border-radius: ${btn.style?.borderRadius || '8px'};">
                    ${icon ? icon + ' ' : ''}${btn.label || flowName}
                </div>
                <button class="btn-sm-icon delete-btn" data-id="${btn.id}" title="Sil">×</button>
            </div>
            
            <div class="button-card-info">
                <div>⚡ ${flowName}</div>
                <div class="button-card-url" title="${btn.urlPattern}">🌐 ${btn.urlPattern}</div>
                <div class="button-card-badges">
                    <span class="badge-tag">${sizeLabel}</span>
                    ${btn.autoRun ? '<span class="badge-tag badge-warning">⚡ Otomatik</span>' : ''}
                    ${btn.pulse !== false ? '<span class="badge-tag badge-accent">✨ Animasyon</span>' : ''}
                </div>
            </div>
            
            <div class="button-card-actions">
                <button class="btn btn-outline btn-sm edit-btn" data-id="${btn.id}">✏️ Düzenle</button>
            </div>
        </div>
        `;
    }).join('');

    // Event Listeners
    DOM.buttonsGrid.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm('Bu butonu silmek istiyor musunuz?')) {
                const newButtons = buttons.filter(b => b.id !== btn.dataset.id);
                await Storage.saveButtons(newButtons);
                renderButtonsView(State, DOM);
                showToast('🗑️ Buton silindi', DOM);
            }
        };
    });

    DOM.buttonsGrid.querySelectorAll('.edit-btn').forEach(btn => {
        btn.onclick = () => {
            const button = buttons.find(b => b.id === btn.dataset.id);
            if (button) openButtonModal(button, State, DOM);
        };
    });
}

export async function openButtonModal(existingButton = null, State, DOM) {
    const flows = await Storage.getFlows();
    if (flows.length === 0) {
        showToast('⚠️ Önce bir akış oluşturmalısınız', DOM);
        return;
    }

    // Populate Flow Select
    DOM.btnFlowSelect.innerHTML = '<option value="" disabled selected>Bir akış seçin...</option>' +
        flows.map(f => `<option value="${f.id}">${f.name}</option>`).join('');

    // Reset Form
    DOM.btnId.value = '';
    DOM.btnFlowSelect.value = '';
    DOM.btnUrl.value = '';
    DOM.btnLabel.value = '';
    DOM.btnTooltip.value = '';
    DOM.btnRadius.value = 8;
    DOM.radiusValue.textContent = '8px';

    // Reset Pickers
    DOM.colorPicker.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    DOM.positionPicker.querySelectorAll('.pos-option').forEach(el => el.classList.remove('selected'));
    DOM.iconPicker.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
    DOM.sizePicker.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));

    // Defaults
    DOM.colorPicker.children[0].classList.add('selected');
    DOM.positionPicker.querySelector('[data-pos="bottom-right"]').classList.add('selected');
    DOM.iconPicker.children[0].classList.add('selected');
    DOM.sizePicker.querySelector('[data-size="md"]').classList.add('selected');
    DOM.autoRunSwitch.classList.remove('active');
    DOM.pulseSwitch.classList.add('active');

    // Fill Data if Editing
    if (existingButton) {
        DOM.btnId.value = existingButton.id;
        DOM.btnFlowSelect.value = existingButton.flowId;
        DOM.btnUrl.value = existingButton.urlPattern;
        DOM.btnLabel.value = existingButton.label;
        DOM.btnTooltip.value = existingButton.tooltip || '';

        // Set Color
        const color = existingButton.style.backgroundColor;
        const colorOpt = Array.from(DOM.colorPicker.children).find(el => el.dataset.color === color);
        if (colorOpt) {
            DOM.colorPicker.querySelector('.selected')?.classList.remove('selected');
            colorOpt.classList.add('selected');
        }

        // Set Icon
        if (existingButton.icon !== undefined) {
            const iconOpt = Array.from(DOM.iconPicker.children).find(el => el.dataset.icon === existingButton.icon);
            if (iconOpt) {
                DOM.iconPicker.querySelector('.selected')?.classList.remove('selected');
                iconOpt.classList.add('selected');
            }
        }

        // Set Size
        if (existingButton.size) {
            const sizeOpt = DOM.sizePicker.querySelector(`[data-size="${existingButton.size}"]`);
            if (sizeOpt) {
                DOM.sizePicker.querySelector('.selected')?.classList.remove('selected');
                sizeOpt.classList.add('selected');
            }
        }

        // Set Radius
        if (existingButton.style.borderRadius) {
            const r = parseInt(existingButton.style.borderRadius);
            DOM.btnRadius.value = r;
            DOM.radiusValue.textContent = r + 'px';
        }

        // Set Toggles
        if (existingButton.autoRun) DOM.autoRunSwitch.classList.add('active');
        if (existingButton.pulse === false) DOM.pulseSwitch.classList.remove('active');

        // Set Position
        let pos = 'bottom-right';
        if (existingButton.style.top && existingButton.style.left) pos = 'top-left';
        if (existingButton.style.top && existingButton.style.right) pos = 'top-right';
        if (existingButton.style.bottom && existingButton.style.left) pos = 'bottom-left';

        const posOpt = DOM.positionPicker.querySelector(`[data-pos="${pos}"]`);
        if (posOpt) {
            DOM.positionPicker.querySelector('.selected')?.classList.remove('selected');
            posOpt.classList.add('selected');
        }
    }

    updateLivePreview(DOM);
    DOM.buttonModal.showModal();
}

export function closeButtonModal(DOM) {
    DOM.buttonModal.close();
}

export async function handleButtonFormSubmit(e, State, DOM) {
    e.preventDefault();

    const id = DOM.btnId.value || generateId();
    const flowId = DOM.btnFlowSelect.value;
    const urlPattern = DOM.btnUrl.value.trim();
    const label = DOM.btnLabel.value.trim();
    const tooltip = DOM.btnTooltip.value.trim();

    if (!flowId) {
        showToast('⚠️ Lütfen bir akış seçin', DOM);
        return;
    }

    // Get Style from Pickers
    const selectedColor = DOM.colorPicker.querySelector('.selected').dataset.color;
    const selectedPos = DOM.positionPicker.querySelector('.selected').dataset.pos;
    const selectedIcon = DOM.iconPicker.querySelector('.selected')?.dataset.icon || '';
    const selectedSize = DOM.sizePicker.querySelector('.selected')?.dataset.size || 'md';
    const borderRadius = DOM.btnRadius.value + 'px';
    const autoRun = DOM.autoRunSwitch.classList.contains('active');
    const pulse = DOM.pulseSwitch.classList.contains('active');

    let style = {
        position: 'fixed',
        zIndex: 999999,
        backgroundColor: selectedColor,
        color: '#ffffff',
        borderRadius: borderRadius,
        // Reset all
        top: 'auto', bottom: 'auto', left: 'auto', right: 'auto'
    };

    if (selectedPos === 'top-left') { style.top = '20px'; style.left = '20px'; }
    if (selectedPos === 'top-right') { style.top = '20px'; style.right = '20px'; }
    if (selectedPos === 'bottom-left') { style.bottom = '20px'; style.left = '20px'; }
    if (selectedPos === 'bottom-right') { style.bottom = '20px'; style.right = '20px'; }

    const newButton = {
        id,
        flowId,
        urlPattern,
        label,
        tooltip,
        icon: selectedIcon,
        size: selectedSize,
        autoRun,
        pulse,
        style
    };

    // Save
    const buttons = await Storage.getButtons();
    const existingIdx = buttons.findIndex(b => b.id === id);

    let newButtonsList = [...buttons];
    if (existingIdx > -1) {
        newButtonsList[existingIdx] = newButton;
    } else {
        newButtonsList.push(newButton);
    }

    await Storage.saveButtons(newButtonsList);
    closeButtonModal(DOM);
    renderButtonsView(State, DOM);
    showToast('✅ Buton kaydedildi', DOM);
}

export function updateLivePreview(DOM) {
    const previewBtn = DOM.previewButton;
    if (!previewBtn) return;

    // Get live values
    const label = DOM.btnLabel.value || 'Çalıştır';
    const selectedColor = DOM.colorPicker.querySelector('.selected')?.dataset.color || '#3b82f6';
    const selectedPos = DOM.positionPicker.querySelector('.selected')?.dataset.pos || 'bottom-right';
    const selectedIcon = DOM.iconPicker.querySelector('.selected')?.dataset.icon || '';
    const selectedSize = DOM.sizePicker.querySelector('.selected')?.dataset.size || 'md';
    const radius = DOM.btnRadius.value + 'px';

    // Update text
    previewBtn.textContent = (selectedIcon ? selectedIcon + ' ' : '') + label;

    // Update style
    previewBtn.style.background = selectedColor;
    previewBtn.style.borderRadius = radius;

    // Size classes
    previewBtn.classList.remove('preview-sm', 'preview-lg');
    if (selectedSize === 'sm') previewBtn.classList.add('preview-sm');
    if (selectedSize === 'lg') previewBtn.classList.add('preview-lg');

    // Position
    previewBtn.style.top = 'auto';
    previewBtn.style.bottom = 'auto';
    previewBtn.style.left = 'auto';
    previewBtn.style.right = 'auto';

    if (selectedPos === 'top-left') { previewBtn.style.top = '16px'; previewBtn.style.left = '16px'; }
    if (selectedPos === 'top-right') { previewBtn.style.top = '16px'; previewBtn.style.right = '16px'; }
    if (selectedPos === 'bottom-left') { previewBtn.style.bottom = '16px'; previewBtn.style.left = '16px'; }
    if (selectedPos === 'bottom-right') { previewBtn.style.bottom = '16px'; previewBtn.style.right = '16px'; }
}

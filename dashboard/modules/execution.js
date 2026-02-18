/**
 * ▶ Execution Module
 * Akış çalıştırma, durum mesajları, element picker.
 */

import { Storage } from './storage.js';
import { showToast } from './utils.js';
import { Renderer } from './ui-render.js';

export async function runFlow(State, DOM, saveCurrentFlow) {
    if (!State.currentFlow || State.currentFlow.blocks.length === 0) {
        showToast('⚠️ Blok ekleyin', DOM);
        return;
    }
    await saveCurrentFlow();

    DOM.execConsole.classList.remove('hidden');
    DOM.toggleConsoleBtn.classList.add('active');
    DOM.execConsoleBody.innerHTML = '';

    Renderer.renderConsoleLine('start', `▶ "${State.currentFlow.name}" başlatılıyor...`, DOM.execConsoleBody);

    // Blok durumlarını temizle
    document.querySelectorAll('.block-item').forEach(el => el.classList.remove('running', 'completed', 'errored'));

    chrome.runtime.sendMessage({ type: 'RUN_FLOW', flow: State.currentFlow });
}

export function handleMessage(msg, State, DOM) {
    if (msg.type === 'FLOW_STATUS') {
        const status = msg.status;
        const isRun = status.state === 'running';

        Renderer.toggleStatusBanner(isRun || status.state === 'error', status, DOM);

        if (isRun) {
            Renderer.renderConsoleLine('running', status.message, DOM.execConsoleBody);
            highlightBlock(status.current - 1, 'running');
        }
        else if (status.state === 'completed') {
            Renderer.renderConsoleLine('success', status.message, DOM.execConsoleBody);
            markAllCompleted();
            showToast('✅ Tamamlandı', DOM);
            setTimeout(() => DOM.statusBanner.classList.add('hidden'), 3000);
        }
        else if (status.state === 'error') {
            Renderer.renderConsoleLine('error', status.message, DOM.execConsoleBody);
            highlightBlock(status.current - 1, 'errored');
        }
    }
}

function highlightBlock(index, state) {
    const items = document.querySelectorAll('.block-item');
    if (!items[index]) return;

    // Öncekileri tamamla
    for (let i = 0; i < index; i++) {
        items[i].classList.remove('running', 'errored');
        items[i].classList.add('completed');
    }

    // Aktifi işaretle
    items[index].classList.remove('completed', 'errored');
    items[index].classList.add(state);
    items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function markAllCompleted() {
    document.querySelectorAll('.block-item').forEach(el => {
        el.classList.remove('running', 'errored');
        el.classList.add('completed');
    });
}

export async function handlePicker(btn, key, State, DOM) {
    const originalText = btn.textContent;
    btn.textContent = '⏳ ...';
    btn.classList.add('picking');

    chrome.runtime.sendMessage({ type: 'PICK_ELEMENT' }, (resp) => {
        if (!resp?.success) {
            btn.textContent = originalText;
            btn.classList.remove('picking');
            showToast('❌ ' + resp.error, DOM);
        }
    });

    const listener = (msg) => {
        if (msg.type === 'ELEMENT_PICKED') {
            State.getSelectedBlock().params[key] = msg.selector;
            // Update input directly without re-rendering everything (preserves accordion state)
            const activeInput = document.querySelector(`.block-item.selected .input[data-key="${key}"]`);
            if (activeInput) activeInput.value = msg.selector;

            // Also update button text if it's a selector button
            const selectorBtn = document.querySelector(`.block-item.selected .selector-btn[data-key="${key}"]`);
            if (selectorBtn) {
                selectorBtn.textContent = msg.selector;
                selectorBtn.classList.add('has-value');
            }

            btn.classList.remove('picking');
            chrome.runtime.onMessage.removeListener(listener);
        } else if (msg.type === 'PICKER_CANCELLED') {
            btn.textContent = originalText;
            btn.classList.remove('picking');
            chrome.runtime.onMessage.removeListener(listener);
        }
    };
    chrome.runtime.onMessage.addListener(listener);
}

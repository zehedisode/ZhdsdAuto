/**
 * Popup Utilities
 * ID üretme, HTML temizleme, toast vb.
 */

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function escapeHTML(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

export function showToast(message, DOM) {
    if (!DOM || !DOM.toast) return;
    if (DOM.toast._t) clearTimeout(DOM.toast._t);
    DOM.toast.textContent = message;
    DOM.toast.classList.add('show');
    DOM.toast._t = setTimeout(() => DOM.toast.classList.remove('show'), 3000);
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

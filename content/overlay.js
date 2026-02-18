/**
 * 🔘 ZhdsdAuto - Nuclear Overlay System (Shadow DOM v2)
 * 
 * Bu sürüm, CSS çakışmalarını ve üst üste binme sorunlarını 
 * Shadow DOM ve agresif Flexbox düzeni ile tamamen engeller.
 */

(function () {
    let host = null;
    let shadow = null;
    let lastUrl = location.href;

    // Başlatıcı
    const init = () => {
        refresh();

        // URL Takibi
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                refresh();
            }
        }, 1000);

        // DOM Takibi (Gerektiğinde yeniden oluştur)
        const observer = new MutationObserver(() => {
            if (host && !document.contains(host)) {
                refresh();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    };

    async function refresh() {
        const data = await chrome.storage.local.get(['buttons', 'flows']);
        const buttons = data.buttons || [];
        const flows = data.flows || [];
        const currentUrl = window.location.href;

        const activeButtons = buttons.filter(btn => {
            if (!btn.urlPattern) return false;
            return currentUrl.toLowerCase().includes(btn.urlPattern.toLowerCase());
        });

        if (activeButtons.length === 0) {
            if (host) { host.remove(); host = null; }
            return;
        }

        ensureHost();
        render(activeButtons, flows);
    }

    function ensureHost() {
        if (!host || !document.contains(host)) {
            if (host) host.remove();
            host = document.createElement('div');
            host.id = 'zhdsd-overlay-host';
            // Z-index ve temel pozisyon (Shadow host için)
            Object.assign(host.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '0',
                height: '0',
                zIndex: '2147483647',
                pointerEvents: 'none'
            });
            shadow = host.attachShadow({ mode: 'open' });

            // Kritik CSS
            const style = document.createElement('style');
            style.textContent = `
                :host { all: initial; }
                .corner {
                    position: fixed;
                    display: flex;
                    gap: 12px;
                    padding: 20px;
                    pointer-events: none;
                    z-index: 2147483647;
                    box-sizing: border-box;
                    flex-direction: column;
                }
                .top-left { top: 0; left: 0; align-items: flex-start; }
                .top-right { top: 0; right: 0; align-items: flex-end; }
                .bottom-left { bottom: 0; left: 0; align-items: flex-start; flex-direction: column-reverse; }
                .bottom-right { bottom: 0; right: 0; align-items: flex-end; flex-direction: column-reverse; }

                .btn-wrapper {
                    pointer-events: auto;
                    display: flex; /* Flex içindeki flex item */
                    margin: 0;
                    padding: 0;
                    margin-top: 8px; /* column-reverse için margin-top kullanılmalı */
                    position: static !important;
                }

                .zh-btn {
                    all: initial; /* Siteden gelen her şeyi sıfırla */
                    box-sizing: border-box;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 12px 18px;
                    border-radius: 8px;
                    background-color: #3b82f6;
                    color: #ffffff;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: transform 0.2s, filter 0.2s, box-shadow 0.2s;
                    white-space: nowrap;
                    line-height: 1;
                    border: none;
                    pointer-events: auto;
                }

                .zh-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
                }

                .zh-btn:active {
                    transform: scale(0.96);
                }

                .sm { padding: 8px 12px; font-size: 11px; }
                .lg { padding: 16px 24px; font-size: 15px; }

                .pulse { animation: zh-pulse 2s infinite; }
                @keyframes zh-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
                }

                .running { background-color: #f59e0b !important; cursor: wait; pointer-events: none; }
            `;
            shadow.appendChild(style);

            ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(c => {
                const div = document.createElement('div');
                div.className = `corner ${c}`;
                shadow.appendChild(div);
            });

            document.body.appendChild(host);
        }
    }

    function render(activeButtons, flows) {
        // İçleri boşalt
        shadow.querySelectorAll('.corner').forEach(c => c.innerHTML = '');

        activeButtons.forEach(btn => {
            const flow = flows.find(f => f.id === btn.flowId);
            if (!flow) return;

            const corner = determineCorner(btn.style);
            const container = shadow.querySelector(`.${corner}`);
            if (!container) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'btn-wrapper';

            const b = document.createElement('button');
            b.className = 'zh-btn';

            // Konfigürasyon
            const icon = btn.icon ? btn.icon + ' ' : '';
            b.textContent = icon + (btn.label || flow.name);
            b.title = btn.tooltip || flow.name;

            if (btn.size) b.classList.add(btn.size);
            if (btn.pulse) b.classList.add('pulse');

            // Stil (Sadece güvenli olanlar)
            if (btn.style) {
                if (btn.style.backgroundColor) b.style.backgroundColor = btn.style.backgroundColor;
                if (btn.style.background) b.style.background = btn.style.background;
                if (btn.style.borderRadius) b.style.borderRadius = btn.style.borderRadius;
                if (btn.style.color) b.style.color = btn.style.color;
            }

            b.onclick = (e) => {
                e.preventDefault();
                const oldText = b.textContent;
                b.textContent = '⏳ ...';
                b.classList.add('running');
                chrome.runtime.sendMessage({ type: 'RUN_FLOW', flow }, () => {
                    setTimeout(() => { b.textContent = oldText; b.classList.remove('running'); }, 2000);
                });
            };

            // Auto Run
            const arKey = `ar_${btn.id}`;
            if (btn.autoRun && !sessionStorage.getItem(arKey)) {
                sessionStorage.setItem(arKey, '1');
                setTimeout(() => b.click(), 1000);
            }

            wrapper.appendChild(b);
            container.appendChild(wrapper);
        });
    }

    function determineCorner(s) {
        if (!s) return 'bottom-right';
        const isT = s.top && s.top !== 'auto';
        const isL = s.left && s.left !== 'auto';
        if (isT && isL) return 'top-left';
        if (isT && !isL) return 'top-right';
        if (!isT && isL) return 'bottom-left';
        return 'bottom-right';
    }

    init();
})();

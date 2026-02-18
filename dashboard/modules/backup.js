/**
 * 💾 Backup & Restore Module
 * Akışları yedekleme ve geri yükleme işlemleri.
 */

import { Storage } from './storage.js';
import { showToast } from './utils.js';

export async function handleBackupDownload(State, DOM) {
    try {
        const flows = await Storage.getFlows();
        const dataStr = JSON.stringify(flows, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `zhdsdauto-backup-${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('✅ Yedek indirildi', DOM);
    } catch (e) {
        console.error(e);
        showToast('❌ Yedek alınamadı', DOM);
    }
}

export function handleRestoreFileChange(event, State, DOM, renderFlowsView) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target.result;
            const flows = JSON.parse(content);

            if (!Array.isArray(flows)) {
                throw new Error("Yedek dosyası bozuk (Liste bekleniyor)");
            }

            // Validate first item loosely
            if (flows.length > 0 && !flows[0].id) {
                throw new Error("Geçersiz akış formatı");
            }

            if (confirm(`⚠️ DİKKAT: Bu işlem mevcut ${State.flows.length} akışınızı silecek ve yedekten ${flows.length} akış yükleyecek.\nOnaylıyor musunuz?`)) {
                await chrome.storage.local.set({ flows });
                State.setFlows(flows);
                renderFlowsView();
                showToast(`✅ ${flows.length} akış geri yüklendi`, DOM);
            }

            // Sıfırla
            DOM.restoreFileInput.value = '';
        } catch (error) {
            console.error(error);
            showToast('❌ Hata: ' + error.message, DOM);
        }
    };
    reader.readAsText(file);
}

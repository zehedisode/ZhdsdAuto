/**
 * Storage Module
 * Sadece veri okuma/yazma işlerinden sorumludur.
 * UI ile ilgili hiçbir kod içermez.
 */

export const Storage = {
    async getFlows() {
        const data = await chrome.storage.local.get('flows');
        return data.flows || [];
    },

    async saveFlow(flow) {
        const flows = await this.getFlows();
        const index = flows.findIndex(f => String(f.id) === String(flow.id));

        if (index > -1) {
            flows[index] = flow;
        } else {
            flows.push(flow);
        }

        await chrome.storage.local.set({ flows });
        return flows;
    },

    async deleteFlow(flowId) {
        const flows = await this.getFlows();
        const newFlows = flows.filter(f => String(f.id) !== String(flowId));
        await chrome.storage.local.set({ flows: newFlows });
        return newFlows;
    },

    async getLogs() {
        const data = await chrome.storage.local.get('logs');
        return data.logs || [];
    },

    // Buttons
    async getButtons() {
        const data = await chrome.storage.local.get('buttons');
        return data.buttons || [];
    },

    async saveButtons(buttons) {
        await chrome.storage.local.set({ buttons });
        return buttons;
    }
};

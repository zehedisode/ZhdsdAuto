/**
 * State Module
 * Uygulamanın anlık durumunu yönetir.
 */

// Başlangıç durumu
const initialState = {
    currentFlow: null,
    editingFlowId: null,
    selectedBlockId: null,
    flows: [],
    templates: [],
    isRunning: false
};

// Singleton olarak dışa aktarılır
export const State = {
    ...initialState,

    setCurrentFlow(flow) {
        this.currentFlow = JSON.parse(JSON.stringify(flow));
        this.editingFlowId = flow.id;
    },

    setFlows(flows) {
        this.flows = flows || [];
    },

    setTemplates(templates) {
        this.templates = templates || [];
    },

    selectBlock(blockId) {
        this.selectedBlockId = blockId;
    },

    getSelectedBlock() {
        if (!this.currentFlow || !this.selectedBlockId) return null;
        return this.currentFlow.blocks.find(b => String(b.id) === String(this.selectedBlockId));
    },

    moveTo(fromIndex, toIndex) {
        if (!this.currentFlow) return;
        const [moved] = this.currentFlow.blocks.splice(fromIndex, 1);
        this.currentFlow.blocks.splice(toIndex, 0, moved);
    },

    reset() {
        this.currentFlow = null;
        this.editingFlowId = null;
        this.selectedBlockId = null;
    }
};

/**
 * Popup State Module
 * Anlık seçili blok, düzenlenmekte olan akış vs. bilgisini tutar.
 */

const initialState = {
    mode: 'list', // 'list' | 'builder'
    currentFlow: null,
    flows: [],
    editingFlowId: null,
    selectedBlockId: null
};

export const State = {
    ...initialState,

    setMode(mode) {
        this.mode = mode;
    },

    setFlows(flows) {
        this.flows = flows || [];
    },

    setCurrentFlow(flow) {
        this.currentFlow = flow ? JSON.parse(JSON.stringify(flow)) : null;
        this.editingFlowId = flow ? flow.id : null;
    },

    selectBlock(blockId) {
        this.selectedBlockId = blockId;
    },

    getSelectedBlock() {
        if (!this.currentFlow || !this.selectedBlockId) return null;
        return this.currentFlow.blocks.find(b => String(b.id) === String(this.selectedBlockId));
    },

    reset() {
        this.currentFlow = null;
        this.editingFlowId = null;
        this.selectedBlockId = null;
    }
};

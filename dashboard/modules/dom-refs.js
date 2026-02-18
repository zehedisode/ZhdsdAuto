/**
 * 📋 DOM References Module
 * Tüm DOM referanslarını önbelleğe alır.
 */

export function cacheDOMRefs() {
    return {
        // Views
        flowsView: document.getElementById('flowsView'),
        builderView: document.getElementById('builderView'),
        templatesView: document.getElementById('templatesView'),
        backupView: document.getElementById('backupView'),
        navItems: document.querySelectorAll('.nav-item'),

        // Flows
        flowsGrid: document.getElementById('flowsGrid'),
        emptyState: document.getElementById('emptyState'),
        createFlowBtn: document.getElementById('createFlowBtn'),
        emptyCreateBtn: document.getElementById('emptyCreateBtn'),

        // Builder
        flowNameInput: document.getElementById('flowNameInput'),
        canvasEmpty: document.getElementById('canvasEmpty'),
        blocksList: document.getElementById('blocksList'),
        saveFlowBtn: document.getElementById('saveFlowBtn'),
        runFlowBtn: document.getElementById('runFlowBtn'),
        backToFlows: document.getElementById('backToFlows'),

        // Console
        execConsole: document.getElementById('execConsole'),
        execConsoleBody: document.getElementById('execConsoleBody'),
        toggleConsoleBtn: document.getElementById('toggleConsoleBtn'),
        clearConsoleBtn: document.getElementById('clearConsoleBtn'),
        closeConsoleBtn: document.getElementById('closeConsoleBtn'),

        // Status
        statusBanner: document.getElementById('statusBanner'),
        bannerMessage: document.getElementById('bannerMessage'),
        progressBar: document.getElementById('progressBar'),
        stopBtn: document.getElementById('stopBtn'),
        toast: document.getElementById('toast'),
        templatesGrid: document.getElementById('templatesGrid'),

        // Backup
        downloadBackupBtn: document.getElementById('downloadBackupBtn'),
        restoreBtn: document.getElementById('restoreBtn'),
        restoreFileInput: document.getElementById('restoreFileInput'),

        // Buttons View
        buttonsGrid: document.getElementById('buttonsGrid'),
        buttonsEmptyState: document.getElementById('buttonsEmptyState'),
        createButtonBtn: document.getElementById('createButtonBtn'),

        // Modal Elements
        buttonModal: document.getElementById('buttonModal'),
        buttonForm: document.getElementById('buttonForm'),
        closeButtonModal: document.getElementById('closeButtonModal'),
        cancelButtonModal: document.getElementById('cancelButtonModal'),

        // Form Inputs
        btnId: document.getElementById('btnId'),
        btnFlowSelect: document.getElementById('btnFlowSelect'),
        btnUrl: document.getElementById('btnUrl'),
        btnLabel: document.getElementById('btnLabel'),
        colorPicker: document.getElementById('colorPicker'),
        positionPicker: document.getElementById('positionPicker'),

        // New Modal Elements
        iconPicker: document.getElementById('iconPicker'),
        sizePicker: document.getElementById('sizePicker'),
        btnRadius: document.getElementById('btnRadius'),
        radiusValue: document.getElementById('radiusValue'),
        btnTooltip: document.getElementById('btnTooltip'),
        autoRunSwitch: document.getElementById('autoRunSwitch'),
        pulseSwitch: document.getElementById('pulseSwitch'),
        previewButton: document.getElementById('previewButton'),
        autoRunToggle: document.getElementById('autoRunToggle'),
        pulseToggle: document.getElementById('pulseToggle')
    };
}

/**
 * Flow Control Unit Tests
 * Chrome API mock'ları ile condition, loop, forEach testleri
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chrome API mock
const chromeMock = {
    scripting: {
        executeScript: vi.fn()
    },
    tabs: {
        onUpdated: { addListener: vi.fn(), removeListener: vi.fn() }
    }
};
vi.stubGlobal('chrome', chromeMock);

const { execCondition, execLoop, execForEach } = await import('../background/modules/flow-control.js');

describe('execCondition', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should return pass:true when element exists and visible', async () => {
        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { pass: true, reason: '' }
        }]);

        const result = await execCondition({}, { selector: '.btn', check: 'var (görünür)' }, 1);
        expect(result.pass).toBe(true);
    });

    it('should return pass:false when element not found', async () => {
        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { pass: false, reason: 'Element bulunamadı: .missing' }
        }]);

        const result = await execCondition({}, { selector: '.missing', check: 'var (görünür)' }, 1);
        expect(result.pass).toBe(false);
        expect(result.reason).toContain('bulunamadı');
    });

    it('should return pass:true for "yok (gizli)" when element missing', async () => {
        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { pass: true, reason: '' }
        }]);

        const result = await execCondition({}, { selector: '.gone', check: 'yok (gizli)' }, 1);
        expect(result.pass).toBe(true);
    });

    it('should return pass:false for "metin içerir" when text not found', async () => {
        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { pass: false, reason: 'Metin "hello" içermiyor' }
        }]);

        const result = await execCondition({}, { selector: 'p', check: 'metin içerir', value: 'hello' }, 1);
        expect(result.pass).toBe(false);
    });

    it('should return pass:true for "metin eşittir" when text matches', async () => {
        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { pass: true, reason: '' }
        }]);

        const result = await execCondition({}, { selector: 'h1', check: 'metin eşittir', value: 'Hello' }, 1);
        expect(result.pass).toBe(true);
    });

    it('should throw when tabId is null', async () => {
        await expect(
            execCondition({}, { selector: '.btn', check: 'var (görünür)' }, null)
        ).rejects.toThrow('aktif sekme');
    });

    it('should throw when script returns no result', async () => {
        chromeMock.scripting.executeScript.mockResolvedValue([{ result: null }]);

        await expect(
            execCondition({}, { selector: '.btn', check: 'var (görünür)' }, 1)
        ).rejects.toThrow('çalıştırılamadı');
    });
});

describe('execLoop', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should execute inner blocks N times', async () => {
        let executedCount = 0;
        const engine = {
            running: true,
            variables: {},
            interpolate: (s) => s,
            executeBlock: vi.fn().mockImplementation(async () => {
                executedCount++;
                return 1;
            })
        };

        const flow = {
            id: 'f1',
            name: 'Test',
            blocks: [
                { type: 'loop', params: { count: '3' }, enabled: true },
                { type: 'wait', params: { duration: '10' }, enabled: true },
                { type: 'setVariable', params: { variable: 'x', value: '1' }, enabled: true }
            ]
        };

        const onStatus = vi.fn();
        const result = await execLoop(engine, flow, 0, 1, onStatus);

        expect(executedCount).toBe(6); // 2 inner blocks × 3 iterations
        expect(result.skipTo).toBe(2);
        expect(result.tabId).toBe(1);
    });

    it('should set _iteration variable', async () => {
        const iterations = [];
        const engine = {
            running: true,
            variables: {},
            interpolate: (s) => s,
            executeBlock: vi.fn().mockImplementation(async function () {
                iterations.push(this.variables._iteration);
                return 1;
            }.bind({ variables: {} }))
        };
        // Use a proxy to capture variable changes
        const varProxy = {};
        const engineWithVars = {
            ...engine,
            executeBlock: vi.fn().mockImplementation(async () => {
                iterations.push(engineWithVars.variables._iteration);
                return 1;
            })
        };

        const flow = {
            id: 'f1',
            name: 'Test',
            blocks: [
                { type: 'loop', params: { count: '2' }, enabled: true },
                { type: 'wait', params: { duration: '10' }, enabled: true }
            ]
        };

        await execLoop(engineWithVars, flow, 0, 1, vi.fn());
        expect(iterations).toEqual([1, 2]);
    });

    it('should throw when no inner blocks', async () => {
        const engine = { running: true, variables: {}, interpolate: (s) => s };
        const flow = {
            id: 'f1',
            name: 'Test',
            blocks: [
                { type: 'loop', params: { count: '3' }, enabled: true }
            ]
        };

        await expect(
            execLoop(engine, flow, 0, 1, vi.fn())
        ).rejects.toThrow('çalıştırılacak blok yok');
    });

    it('should skip disabled blocks', async () => {
        let executedCount = 0;
        const engine = {
            running: true,
            variables: {},
            interpolate: (s) => s,
            executeBlock: vi.fn().mockImplementation(async () => {
                executedCount++;
                return 1;
            })
        };

        const flow = {
            id: 'f1',
            name: 'Test',
            blocks: [
                { type: 'loop', params: { count: '2' }, enabled: true },
                { type: 'wait', params: { duration: '10' }, enabled: true },
                { type: 'wait', params: { duration: '10' }, enabled: false }
            ]
        };

        await execLoop(engine, flow, 0, 1, vi.fn());
        expect(executedCount).toBe(2); // only enabled block × 2 iterations
    });

    it('should stop when engine.running becomes false', async () => {
        let executedCount = 0;
        const engine = {
            running: true,
            variables: {},
            interpolate: (s) => s,
            executeBlock: vi.fn().mockImplementation(async () => {
                executedCount++;
                if (executedCount === 1) engine.running = false;
                return 1;
            })
        };

        const flow = {
            id: 'f1',
            name: 'Test',
            blocks: [
                { type: 'loop', params: { count: '100' }, enabled: true },
                { type: 'wait', params: { duration: '10' }, enabled: true }
            ]
        };

        await execLoop(engine, flow, 0, 1, vi.fn());
        expect(executedCount).toBeLessThan(100);
    });
});

describe('execForEach', () => {
    beforeEach(() => vi.clearAllMocks());

    it('should throw when tabId is null', async () => {
        const engine = { running: true, variables: {}, interpolate: (s) => s };
        const flow = {
            id: 'f1', name: 'Test',
            blocks: [{ type: 'forEach', params: { selector: 'ul', childSelector: 'li' }, enabled: true }]
        };

        await expect(
            execForEach(engine, flow, 0, null, vi.fn())
        ).rejects.toThrow('aktif sekme');
    });

    it('should iterate over elements', async () => {
        let executedCount = 0;
        const engine = {
            running: true,
            variables: {},
            interpolate: (s) => s,
            executeBlock: vi.fn().mockImplementation(async () => {
                executedCount++;
                return 1;
            })
        };

        // First call: count elements, Second call: inner block executions
        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { count: 3 }
        }]);

        const flow = {
            id: 'f1', name: 'Test',
            blocks: [
                { type: 'forEach', params: { selector: 'ul', childSelector: 'li' }, enabled: true },
                { type: 'click', params: { selector: '.item' }, enabled: true }
            ]
        };

        const result = await execForEach(engine, flow, 0, 1, vi.fn());
        expect(executedCount).toBe(3); // 1 inner block × 3 elements
        expect(result.skipTo).toBe(1);
    });

    it('should throw when list is empty', async () => {
        const engine = { running: true, variables: {}, interpolate: (s) => s };

        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { count: 0 }
        }]);

        const flow = {
            id: 'f1', name: 'Test',
            blocks: [
                { type: 'forEach', params: { selector: 'ul', childSelector: 'li' }, enabled: true },
                { type: 'click', params: { selector: '.item' }, enabled: true }
            ]
        };

        await expect(
            execForEach(engine, flow, 0, 1, vi.fn())
        ).rejects.toThrow('eleman yok');
    });

    it('should set _index and _itemSelector variables', async () => {
        const indices = [];
        const selectors = [];
        const engine = {
            running: true,
            variables: {},
            interpolate: (s) => s,
            executeBlock: vi.fn().mockImplementation(async () => {
                indices.push(engine.variables._index);
                selectors.push(engine.variables._itemSelector);
                return 1;
            })
        };

        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { count: 2 }
        }]);

        const flow = {
            id: 'f1', name: 'Test',
            blocks: [
                { type: 'forEach', params: { selector: 'ul', childSelector: 'li' }, enabled: true },
                { type: 'click', params: { selector: '.item' }, enabled: true }
            ]
        };

        await execForEach(engine, flow, 0, 1, vi.fn());
        expect(indices).toEqual([1, 2]);
        expect(selectors).toEqual([
            'ul > li:nth-child(1)',
            'ul > li:nth-child(2)'
        ]);
    });

    it('should replace *item selector with _itemSelector', async () => {
        const engine = {
            running: true,
            variables: {},
            interpolate: (s) => s,
            executeBlock: vi.fn().mockImplementation(async (block) => {
                // The block selector should be replaced
                expect(block.params.selector).toContain('nth-child');
                return 1;
            })
        };

        chromeMock.scripting.executeScript.mockResolvedValue([{
            result: { count: 1 }
        }]);

        const flow = {
            id: 'f1', name: 'Test',
            blocks: [
                { type: 'forEach', params: { selector: 'ul', childSelector: 'li' }, enabled: true },
                { type: 'click', params: { selector: '*item' }, enabled: true }
            ]
        };

        await execForEach(engine, flow, 0, 1, vi.fn());
        expect(engine.executeBlock).toHaveBeenCalledTimes(1);
    });
});

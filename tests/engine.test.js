/**
 * FlowEngine Unit Tests
 * Chrome API'leri mock'lanarak engine davranışları test edilir.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chrome API mock
const chromeMock = {
    tabs: {
        create: vi.fn().mockResolvedValue({ id: 1 }),
        update: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ id: 1, url: 'https://test.com', title: 'Test' }),
        reload: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue({}),
        query: vi.fn().mockResolvedValue([]),
        captureVisibleTab: vi.fn().mockResolvedValue('data:image/png;base64,...'),
        onUpdated: {
            addListener: vi.fn((cb) => { setTimeout(() => cb(1, { status: 'complete' }), 10); }),
            removeListener: vi.fn()
        }
    },
    scripting: {
        executeScript: vi.fn().mockResolvedValue([{ result: { success: true } }])
    },
    windows: {
        update: vi.fn().mockResolvedValue({})
    },
    runtime: {
        sendMessage: vi.fn().mockResolvedValue({})
    }
};

vi.stubGlobal('chrome', chromeMock);

const { default: FlowEngine } = await import('../background/engine.js');

describe('FlowEngine', () => {
    let engine;
    let statusUpdates;
    let onStatus;

    beforeEach(() => {
        engine = new FlowEngine();
        statusUpdates = [];
        onStatus = (status) => statusUpdates.push(status);
        vi.clearAllMocks();
        // Re-setup tab onUpdated listener for waitForTabLoad
        chromeMock.tabs.onUpdated.addListener.mockImplementation((cb) => {
            setTimeout(() => cb(1, { status: 'complete' }), 10);
        });
    });

    describe('constructor', () => {
        it('should initialize with default state', () => {
            expect(engine.running).toBe(false);
            expect(engine.currentBlockIndex).toBe(-1);
            expect(engine.flow).toBeNull();
            expect(engine.variables).toEqual({});
        });
    });

    describe('interpolate', () => {
        it('should replace ${var} syntax', () => {
            engine.variables = { name: 'Soner' };
            expect(engine.interpolate('Hello ${name}')).toBe('Hello Soner');
        });

        it('should replace *var syntax', () => {
            engine.variables = { url: 'https://test.com' };
            expect(engine.interpolate('Go to *url')).toBe('Go to https://test.com');
        });

        it('should return non-string values as-is', () => {
            expect(engine.interpolate(42)).toBe(42);
            expect(engine.interpolate(null)).toBeNull();
        });
    });

    describe('run', () => {
        it('should complete a simple flow successfully', async () => {
            const flow = {
                id: 'flow-1',
                name: 'Test Flow',
                blocks: [
                    { type: 'wait', params: { duration: '10' }, enabled: true },
                    { type: 'setVariable', params: { variable: 'x', value: '1' }, enabled: true }
                ]
            };

            await engine.run(flow, 1, onStatus);

            expect(statusUpdates[0].state).toBe('running');
            expect(statusUpdates[statusUpdates.length - 1].state).toBe('completed');
            expect(engine.running).toBe(false);
        });

        it('should skip disabled blocks', async () => {
            const flow = {
                id: 'flow-2',
                name: 'Skip Test',
                blocks: [
                    { type: 'wait', params: { duration: '10' }, enabled: true },
                    { type: 'wait', params: { duration: '10' }, enabled: false },
                    { type: 'setVariable', params: { variable: 'x', value: '1' }, enabled: true }
                ]
            };

            await engine.run(flow, 1, onStatus);

            const completed = statusUpdates.find(s => s.state === 'completed');
            expect(completed).toBeDefined();
            // Total should be 2 (1 disabled block skipped)
            expect(completed.total).toBe(2);
        });

        it('should report errors on unknown block types', async () => {
            const flow = {
                id: 'flow-3',
                name: 'Error Test',
                blocks: [
                    { type: 'unknownBlock', params: {}, enabled: true }
                ]
            };

            await engine.run(flow, 1, onStatus);

            const errorStatus = statusUpdates.find(s => s.state === 'error');
            expect(errorStatus).toBeDefined();
            expect(errorStatus.error).toContain('implement edilmemiş');
        });

        it('should throw when already running', async () => {
            engine.running = true;
            const flow = { id: 'f', name: 'n', blocks: [] };

            await expect(engine.run(flow, 1, onStatus)).rejects.toThrow('Zaten çalışan');
        });

        it('should set variables correctly', async () => {
            const flow = {
                id: 'flow-4',
                name: 'Var Test',
                blocks: [
                    { type: 'setVariable', params: { variable: 'count', value: '42' }, enabled: true }
                ]
            };

            await engine.run(flow, 1, onStatus);
            // Variables persist on the engine instance after run
            expect(engine.variables.count).toBe('42');
        });
    });

    describe('stop', () => {
        it('should set running to false', () => {
            engine.running = true;
            engine.stop();
            expect(engine.running).toBe(false);
        });
    });

    describe('executeBlock', () => {
        it('should handle wait block', async () => {
            const start = Date.now();
            await engine.executeBlock({ type: 'wait', params: { duration: '50' } }, 1);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeGreaterThanOrEqual(40); // tolerance
        });

        it('should handle setVariable block', async () => {
            engine.variables = {};
            await engine.executeBlock({ type: 'setVariable', params: { variable: 'test', value: 'hello' } }, 1);
            expect(engine.variables.test).toBe('hello');
        });

        it('should throw on unknown block type', async () => {
            await expect(
                engine.executeBlock({ type: 'fakeBlock', params: {} }, 1)
            ).rejects.toThrow('implement edilmemiş');
        });
    });
});

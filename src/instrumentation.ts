export async function register() {
    console.log("------------------- INSTRUMENTATION LOADED -------------------");
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Fix undici (Node.js built-in fetch) headers timeout.
        // Default is 30s - too short for Ollama cold-start (~23s model load time).
        // Raising to 120s prevents UND_ERR_HEADERS_TIMEOUT on first requests.
        try {
            const { setGlobalDispatcher, Agent } = await import('undici');
            setGlobalDispatcher(new Agent({
                headersTimeout: 120_000,  // 2 minutes
                bodyTimeout:    300_000,  // 5 minutes
                connectTimeout:  10_000,  // 10 seconds
            }));
            console.log("undici global dispatcher configured: headersTimeout=120s");
        } catch (e) {
            console.warn("Could not configure undici dispatcher:", e);
        }

        const isServer = typeof window === "undefined";
        if (isServer) {
            console.log("Polyfilling localStorage for SSR");
            const noop = () => { };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (global as any).localStorage = {
                getItem: () => null,
                setItem: noop,
                removeItem: noop,
                clear: noop,
                key: () => null,
                length: 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;
        }

        // Start notification worker
        try {
            const { workerService } = await import('@/services/worker.service');
            workerService.start(10000); // Poll every 10 seconds
        } catch (e) {
            console.error('Failed to start worker service:', e);
        }
    }
}

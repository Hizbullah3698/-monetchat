export async function register() {
    console.log("------------------- INSTRUMENTATION LOADED -------------------");
    if (process.env.NEXT_RUNTIME === 'nodejs') {
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
    }
}

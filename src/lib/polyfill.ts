"use client";

if (typeof window === "undefined") {
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

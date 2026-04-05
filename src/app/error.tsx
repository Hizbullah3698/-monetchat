
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background p-4 text-center">
            <div className="bg-destructive/10 p-4 rounded-full">
                <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Something went wrong!</h2>
            <p className="text-muted-foreground max-w-[500px]">
                We encountered an unexpected error. Please try again later.
                {error.digest && <span className="block mt-2 text-xs font-mono">ID: {error.digest}</span>}
            </p>
            <div className="flex gap-2 mt-4">
                <Button onClick={() => reset()}>Try again</Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>Go Home</Button>
            </div>
        </div>
    );
}

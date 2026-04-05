
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4 text-center p-4">
            <FileQuestion className="h-24 w-24 text-muted-foreground opacity-50" />
            <h2 className="text-3xl font-bold tracking-tight">Page Not Found</h2>
            <p className="text-muted-foreground max-w-[500px]">
                Sorry, we couldn't find the page you're looking for. It might have been removed, renamed, or doesn't exist.
            </p>
            <Button asChild className="mt-4">
                <Link href="/">Return Home</Link>
            </Button>
        </div>
    );
}

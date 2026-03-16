import { cn } from "@/lib/utils";

interface TutorialSectionProps {
    id: string;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function TutorialSection({ id, title, children, className }: TutorialSectionProps) {
    return (
        <section id={id} className={cn("scroll-mt-24 mb-16", className)}>
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {title}
                </h2>
                <div className="h-px bg-border flex-1" />
            </div>
            <div className="space-y-2">
                {children}
            </div>
        </section>
    );
}

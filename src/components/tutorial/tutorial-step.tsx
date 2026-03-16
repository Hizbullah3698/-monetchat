import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface TutorialStepProps {
    stepNumber: number;
    title: string;
    description: string;
    icon?: LucideIcon;
    children?: React.ReactNode;
    className?: string;
}

export function TutorialStep({ stepNumber, title, description, icon: Icon, children, className }: TutorialStepProps) {
    return (
        <div className={cn("flex gap-4 md:gap-6", className)}>
            <div className="flex-shrink-0 flex flex-col items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-sm">
                    {stepNumber}
                </div>
                <div className="w-px h-full bg-border my-2 last:hidden" />
            </div>
            <div className="space-y-3 pb-12 w-full max-w-2xl">
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-6 w-6 text-primary" />}
                    <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                    {description}
                </p>
                {children && <div className="pt-2">{children}</div>}
            </div>
        </div>
    );
}

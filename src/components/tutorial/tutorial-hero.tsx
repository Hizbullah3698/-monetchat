import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface TutorialHeroProps {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaHref: string;
}

export function TutorialHero({ title, subtitle, ctaText, ctaHref }: TutorialHeroProps) {
    return (
        <section className="py-12 md:py-24 lg:py-32 text-center space-y-6 max-w-4xl mx-auto px-4">
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl text-foreground">
                {title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-[700px] mx-auto">
                {subtitle}
            </p>
            <div className="flex justify-center">
                <Button size="lg" asChild className="text-lg px-8">
                    <Link href={ctaHref}>
                        {ctaText}
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </section>
    );
}

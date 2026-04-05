"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Section {
    id: string;
    title: string;
}

export function TutorialTOC({ sections }: { sections: Section[] }) {
    const [activeSection, setActiveSection] = useState<string>("");

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: "-20% 0px -35% 0px" }
        );

        sections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, [sections]);

    return (
        <nav className="hidden lg:block sticky top-24 self-start w-64 space-y-2">
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                On this page
            </h4>
            <ul className="space-y-1">
                {sections.map((section) => (
                    <li key={section.id}>
                        <Link
                            href={`#${section.id}`}
                            className={cn(
                                "block text-sm py-1 px-3 border-l-2 text-muted-foreground hover:text-foreground transition-colors",
                                activeSection === section.id
                                    ? "border-primary text-primary font-medium"
                                    : "border-transparent"
                            )}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
                                setActiveSection(section.id);
                            }}
                        >
                            {section.title}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

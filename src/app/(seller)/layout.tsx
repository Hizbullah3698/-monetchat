
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PlusCircle, Package, Settings, BarChart } from "lucide-react";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const navItems = [
        { href: '/sell', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/sell/new', label: 'Create Listing', icon: PlusCircle },
        { href: '/sell/listings', label: 'My Listings', icon: Package },
        { href: '/sell/analytics', label: 'Analytics', icon: BarChart },
        { href: '/sell/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <ProtectedRoute>
            <div className="container py-8 grid md:grid-cols-[250px_1fr] gap-8">
                <aside className="hidden md:block">
                    <div className="sticky top-8 space-y-2">
                        <div className="mb-6 px-4">
                            <h2 className="text-xl font-bold text-primary">Seller Center</h2>
                        </div>
                        <nav className="space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                        pathname === item.href
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </aside>
                <main>
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}

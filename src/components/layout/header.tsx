
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export function Header() {
    const { user, signOut } = useAuth();
    const pathname = usePathname();
    const { t } = useLanguage();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">

                {/* Logo */}
                <div className="flex items-center gap-2">
                    <Link href="/" className="font-bold text-xl flex items-center gap-2">
                        <Camera className="h-6 w-6 text-primary" />
                        <span className="hidden sm:inline-block">PickPic</span>
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <Link href="/search" className={`transition-colors hover:text-foreground/80 ${pathname === '/search' ? 'text-foreground' : 'text-foreground/60'}`}>
                        {t("nav.marketplace")}
                    </Link>
                    <Link href="/sell" className={`transition-colors hover:text-foreground/80 ${pathname?.startsWith('/sell') ? 'text-foreground' : 'text-foreground/60'}`}>
                        {t("nav.sell")}
                    </Link>
                    <Link href="/tutorial" className={`transition-colors hover:text-foreground/80 ${pathname === '/tutorial' ? 'text-foreground' : 'text-foreground/60'}`}>
                        {t("nav.howItWorks")}
                    </Link>
                    <Link href="/support" className={`transition-colors hover:text-foreground/80 ${pathname === '/support' ? 'text-foreground' : 'text-foreground/60'}`}>
                        {t("nav.support")}
                    </Link>
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />

                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src="" alt={user.name || "User"} />
                                        <AvatarFallback>{user.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/account">{t("nav.account")}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/account/billing">{t("nav.billing")}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/messages">{t("nav.messages")}</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()}>
                                    <LogOut className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                    <span>{t("nav.logout")}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm">{t("nav.login")}</Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm">{t("nav.signup")}</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

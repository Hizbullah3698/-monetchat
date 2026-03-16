
"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }

        if (!loading && user && allowedRoles) {
            // Check if user has at least one of the allowed roles
            // Since roles are not fully implemented in API/User object yet, 
            // we skip this check or assume 'buyer' for everyone or implement basic logic.
            // For now, if allowedRoles includes 'admin' and user is not admin, redirect.
            // But let's keep it simple: just auth check for now, or implement role check if roles exist.
            if (user.roles && !user.roles.some(r => allowedRoles.includes(r))) {
                router.push('/'); // Unauthorized
            }
        }
    }, [user, loading, router, allowedRoles]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return <>{children}</>;
}

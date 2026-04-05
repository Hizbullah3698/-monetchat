
"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";

export default function AccountPage() {
    return (
        <ProtectedRoute>
            <div className="container py-8">
                <h1 className="text-3xl font-bold mb-4">Account Dashboard</h1>
                <p className="text-muted-foreground">Manage your settings, billing, and usage here.</p>
            </div>
        </ProtectedRoute>
    );
}

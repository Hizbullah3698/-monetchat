"use client";

import { AppModeProvider } from "@/context/app-mode-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppModeProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </AppModeProvider>
  );
}

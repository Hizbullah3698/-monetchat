"use client";

import { useAppMode } from "@/context/app-mode-context";
import { ChatInterface } from "@/components/chat/chat-interface";
import { SettingsPanel } from "@/components/panels/settings-panel";
import { MyListingsPanel } from "@/components/panels/my-listings-panel";

export default function Home() {
  const { currentView } = useAppMode();

  if (currentView === "settings") {
    return <SettingsPanel />;
  }

  if (currentView === "listings") {
    return <MyListingsPanel />;
  }

  return <ChatInterface variant="full" className="h-full" />;
}

"use client";

import { useAppMode, type ChatEntry } from "@/context/app-mode-context";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Plus,
  MessageSquare,
  Package,
  Settings,
  LogOut,
  Menu,
  Trash2,
  Camera,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/translations";

function ChatHistoryItem({
  chat,
  isActive,
  onSelect,
  onDelete,
}: {
  chat: ChatEntry;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left group transition-colors",
        isActive
          ? "bg-white/10 text-white"
          : "text-gray-300 hover:bg-white/5"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="truncate flex-1">{chat.title}</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-white/10"
      >
        <Trash2 className="h-3 w-3 text-gray-500 hover:text-red-400" />
      </button>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const {
    currentView,
    setCurrentView,
    chats,
    currentChatId,
    chatsLoading,
    startNewChat,
    selectChat,
    deleteChat,
  } = useAppMode();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  // Group chats by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groupedChats = {
    today: chats.filter((c) => c.createdAt >= today.getTime()),
    yesterday: chats.filter(
      (c) => c.createdAt >= yesterday.getTime() && c.createdAt < today.getTime()
    ),
    week: chats.filter(
      (c) => c.createdAt >= weekAgo.getTime() && c.createdAt < yesterday.getTime()
    ),
    older: chats.filter((c) => c.createdAt < weekAgo.getTime()),
  };

  const handleStartNew = () => {
    startNewChat();
    onNavigate?.();
  };

  const handleSelectChat = (id: string) => {
    selectChat(id);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100">
      {/* Logo + New Chat */}
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 px-2">
          <Camera className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">PickPic</span>
        </div>
        <Button
          onClick={handleStartNew}
          variant="outline"
          className="w-full justify-start gap-2 border-gray-700 bg-transparent text-gray-100 hover:bg-white/10 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          {t("sidebar.newChat" as TranslationKey)}
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3">
        {chatsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          </div>
        ) : chats.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">
            {t("sidebar.noChats" as TranslationKey)}
          </p>
        ) : (
          <>
            {groupedChats.today.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-gray-500 px-3 mb-1">
                  {t("sidebar.today" as TranslationKey)}
                </p>
                {groupedChats.today.map((chat) => (
                  <ChatHistoryItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    onSelect={() => handleSelectChat(chat.id)}
                    onDelete={() => deleteChat(chat.id)}
                  />
                ))}
              </div>
            )}
            {groupedChats.yesterday.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-gray-500 px-3 mb-1">
                  {t("sidebar.yesterday" as TranslationKey)}
                </p>
                {groupedChats.yesterday.map((chat) => (
                  <ChatHistoryItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    onSelect={() => handleSelectChat(chat.id)}
                    onDelete={() => deleteChat(chat.id)}
                  />
                ))}
              </div>
            )}
            {groupedChats.week.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-gray-500 px-3 mb-1">
                  {t("sidebar.thisWeek" as TranslationKey)}
                </p>
                {groupedChats.week.map((chat) => (
                  <ChatHistoryItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    onSelect={() => handleSelectChat(chat.id)}
                    onDelete={() => deleteChat(chat.id)}
                  />
                ))}
              </div>
            )}
            {groupedChats.older.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-gray-500 px-3 mb-1">
                  {t("sidebar.older" as TranslationKey)}
                </p>
                {groupedChats.older.map((chat) => (
                  <ChatHistoryItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    onSelect={() => handleSelectChat(chat.id)}
                    onDelete={() => deleteChat(chat.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 p-3 space-y-1">
        <button
          onClick={() => {
            setCurrentView("listings");
            onNavigate?.();
          }}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            currentView === "listings"
              ? "bg-white/10 text-white"
              : "hover:bg-white/5 text-gray-300"
          )}
        >
          <Package className="h-4 w-4" />
          {t("sidebar.myListings" as TranslationKey)}
        </button>
        <button
          onClick={() => {
            setCurrentView("settings");
            onNavigate?.();
          }}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            currentView === "settings"
              ? "bg-white/10 text-white"
              : "hover:bg-white/5 text-gray-300"
          )}
        >
          <Settings className="h-4 w-4" />
          {t("sidebar.settings" as TranslationKey)}
        </button>

        <div className="flex items-center px-3 py-1">
          <LanguageSwitcher />
        </div>

        {user ? (
          <div className="flex items-center gap-2 px-3 pt-2 border-t border-gray-800 mt-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gray-700 text-gray-200 text-xs">
                {user.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-gray-200">
                {user.name || user.email}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-white/10 transition-colors"
              title={t("nav.logout" as TranslationKey)}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 pt-2 border-t border-gray-800 mt-2">
            <Link href="/login" onClick={onNavigate} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-700 bg-transparent text-gray-200 hover:bg-white/10"
              >
                {t("nav.login" as TranslationKey)}
              </Button>
            </Link>
            <Link href="/register" onClick={onNavigate} className="flex-1">
              <Button size="sm" className="w-full">
                {t("nav.signup" as TranslationKey)}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppMode();

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-gray-800">
        <div className="w-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile hamburger button */}
      <div className="md:hidden fixed top-3 ltr:left-3 rtl:right-3 z-50">
        <Button
          size="icon"
          variant="outline"
          onClick={() => setSidebarOpen(true)}
          className="bg-background/90 backdrop-blur-sm shadow-md h-9 w-9"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile sheet sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 border-gray-800">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

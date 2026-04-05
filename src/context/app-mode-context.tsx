"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";

export type AppView = "chat" | "settings" | "listings";

export interface ChatEntry {
  id: string;
  title: string;
  createdAt: number;
}

interface AppModeContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  chats: ChatEntry[];
  currentChatId: string | null;
  chatsLoading: boolean;
  startNewChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  updateChatTitle: (title: string) => void;
  refreshChats: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

const STORAGE_KEY_CHATS = "pickpic_chats";

export function AppModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentView, setCurrentViewState] = useState<AppView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load chats: from server for logged-in users, localStorage for anonymous
  const loadChats = useCallback(async () => {
    if (user) {
      // Logged-in: fetch from server
      setChatsLoading(true);
      try {
        const res = await fetch("/api/chats");
        if (res.ok) {
          const data = await res.json();
          setChats(data.chats || []);
        }
      } catch (err) {
        console.error("Failed to load chats:", err);
      } finally {
        setChatsLoading(false);
      }
    } else {
      // Anonymous: load from localStorage
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CHATS);
        if (saved) {
          setChats(JSON.parse(saved));
        }
      } catch {
        // ignore parse errors
      }
    }
    setInitialLoaded(true);
  }, [user]);

  // Load on mount and when auth state changes
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Persist to localStorage for anonymous users
  useEffect(() => {
    if (initialLoaded && !user && chats.length > 0) {
      localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(chats));
    }
  }, [chats, user, initialLoaded]);

  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewState(view);
    setSidebarOpen(false);
  }, []);

  const startNewChat = useCallback(() => {
    setCurrentChatId(null);
    setCurrentViewState("chat");
    setSidebarOpen(false);
  }, []);

  const selectChat = useCallback((id: string) => {
    setCurrentChatId(id);
    setCurrentViewState("chat");
    setSidebarOpen(false);
  }, []);

  const deleteChat = useCallback(async (id: string) => {
    // Optimistic update
    setChats((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (!user) {
        localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(updated));
      }
      return updated;
    });

    // Remove local messages
    try {
      localStorage.removeItem(`pickpic_messages_${id}`);
    } catch {
      // ignore
    }

    if (currentChatId === id) {
      setCurrentChatId(null);
    }

    // Delete from server for logged-in users
    if (user) {
      try {
        await fetch(`/api/chats/${id}`, { method: "DELETE" });
      } catch {
        // Already removed from UI, non-critical if server fails
      }
    }
  }, [currentChatId, user]);

  const updateChatTitle = useCallback((title: string) => {
    if (!currentChatId) return;
    const trimmed = title.slice(0, 50);
    setChats((prev) =>
      prev.map((c) =>
        c.id === currentChatId ? { ...c, title: trimmed } : c
      )
    );
    // Server title is updated via the chat API when messages are sent
  }, [currentChatId]);

  const refreshChats = useCallback(() => {
    loadChats();
  }, [loadChats]);

  return (
    <AppModeContext.Provider
      value={{
        currentView,
        setCurrentView,
        sidebarOpen,
        setSidebarOpen,
        chats,
        currentChatId,
        chatsLoading,
        startNewChat,
        selectChat,
        deleteChat,
        updateChatTitle,
        refreshChats,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
}

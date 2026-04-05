"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageSquare, X, Bot } from "lucide-react";
import { useState } from "react";
import { ChatInterface } from "./chat-interface";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen && (
        <Card className="w-[400px] h-[600px] flex flex-col shadow-xl border-primary/20">
          <div className="p-3 border-b bg-primary text-primary-foreground flex justify-between items-center rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">PickPic AI Search</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-primary-foreground/20 text-primary-foreground"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ChatInterface variant="widget" className="flex-1 min-h-0" />
        </Card>
      )}

      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageSquare className="h-7 w-7" />
      </Button>
    </div>
  );
}

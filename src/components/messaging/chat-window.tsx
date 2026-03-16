
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Image as ImageIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { messageService } from "@/services/message-service";

export function ChatWindow({ threadId }: { threadId: string }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial load
        messageService.getMessages(threadId).then(setMessages);

        // Poll for updates (since we lack real-time sockets)
        const interval = setInterval(() => {
            messageService.getMessages(threadId).then(setMessages);
        }, 3000);

        return () => clearInterval(interval);
    }, [threadId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        try {
            const sentMsg = await messageService.sendMessage(threadId, inputValue);
            setMessages([...messages, sentMsg]);
            setInputValue("");
        } catch (error) {
            console.error("Failed to send", error);
        }
    };

    return (
        <div className="flex flex-col h-[600px] border rounded-lg bg-background">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarFallback>S</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">Seller</p>
                        <p className="text-xs text-muted-foreground">Product Inquiry</p>
                    </div>
                </div>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg) => {
                        const isMe = msg.senderId === 'me';
                        return (
                            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[70%] rounded-lg p-3 text-sm",
                                    isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <p>{msg.text}</p>
                                    <p className={cn("text-[10px] mt-1 opacity-70", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="p-4 border-t">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                    <Button type="button" variant="ghost" size="icon">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    <Input
                        placeholder="Type a message..."
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" size="icon">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}

"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { messageService, Thread } from "@/services/message-service";

export function ThreadList() {
    const [threads, setThreads] = useState<Thread[]>([]);

    useEffect(() => {
        messageService.getThreads().then(setThreads);
    }, []);

    return (
        <div className="space-y-2">
            {threads.map((thread) => (
                <Link
                    key={thread.id}
                    href={`/messages/${thread.id}`}
                    className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors",
                        "bg-card"
                    )}
                >
                    <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>S</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                                Seller (ID: {thread.participants.find(p => p !== 'me') || 'User'})
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">RE: Product {thread.productId}</p>
                        <p className="text-sm truncate text-muted-foreground">
                            {thread.lastMessage}
                        </p>
                    </div>
                </Link>
            ))}
            {threads.length === 0 && (
                <div className="text-center text-sm text-muted-foreground p-4">
                    No conversations yet.
                </div>
            )}
        </div>
    );
}


"use client";

import { ThreadList } from "@/components/messaging/thread-list";

export default function MessagesPage() {
    return (
        <div className="container py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">Messages</h1>
            <div className="grid md:grid-cols-[1fr] gap-6">
                <ThreadList />
            </div>
        </div>
    );
}


import { ChatWindow } from "@/components/messaging/chat-window";

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
    const { threadId } = await params;
    return (
        <div className="container py-8 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Chat</h1>
            <ChatWindow threadId={threadId} />
        </div>
    );
}

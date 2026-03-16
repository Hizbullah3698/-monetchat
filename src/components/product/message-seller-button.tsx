"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { messageService } from "@/services/message-service";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface MessageSellerButtonProps {
    sellerId: string;
    productId?: string;
}

export function MessageSellerButton({ sellerId, productId }: MessageSellerButtonProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleMessage = async () => {
        if (!user) {
            router.push(`/login?redirect=/p/${productId}`);
            return;
        }

        setIsLoading(true);
        try {
            const threadId = await messageService.createThread(sellerId, productId);
            router.push(`/messages/${threadId}`);
        } catch (error) {
            console.error("Failed to start conversation:", error);
            setIsLoading(false);
        }
    };

    return (
        <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleMessage}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
                <MessageCircle className="mr-2 h-5 w-5" />
            )}
            Message Seller
        </Button>
    );
}

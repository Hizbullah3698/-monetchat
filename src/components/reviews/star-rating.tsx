
"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
    rating: number; // 0-5
    setRating?: (rating: number) => void;
    readonly?: boolean;
    size?: "sm" | "md" | "lg";
}

export function StarRating({ rating, setRating, readonly = false, size = "md" }: StarRatingProps) {
    const stars = [1, 2, 3, 4, 5];

    const sizeClass = {
        sm: "h-3 w-3",
        md: "h-5 w-5",
        lg: "h-8 w-8",
    };

    return (
        <div className="flex gap-1">
            {stars.map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onClick={() => setRating && setRating(star)}
                    className={cn(
                        "transition-colors",
                        readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
                    )}
                >
                    <Star
                        className={cn(
                            sizeClass[size],
                            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        )}
                    />
                </button>
            ))}
        </div>
    );
}

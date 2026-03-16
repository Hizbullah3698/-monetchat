
"use client";

import { useState } from "react";
import { StarRating } from "./star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AddReviewForm({ onSubmit }: { onSubmit: (data: any) => void }) {
    const [rating, setRating] = useState(0);
    const [text, setText] = useState("");

    const handleSubmit = () => {
        if (rating === 0) return;
        onSubmit({ rating, text });
        // Reset
        setRating(0);
        setText("");
    };

    return (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
            <h4 className="font-semibold">Write a Review</h4>
            <div>
                <label className="text-sm text-muted-foreground mb-1 block">Rating</label>
                <StarRating rating={rating} setRating={setRating} />
            </div>
            <Textarea
                placeholder="Share your experience..."
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={rating === 0}>
                Post Review
            </Button>
        </div>
    );
}


"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "./star-rating";

// Mock Data
const REVIEWS = [
    { id: '1', user: 'Sarah J.', rating: 5, date: '2 days ago', text: 'Exactly as described! Fast shipping.' },
    { id: '2', user: 'Mike T.', rating: 4, date: '1 week ago', text: 'Good camera but needed some cleaning.' },
];

export function ReviewList() {
    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold">Reviews ({REVIEWS.length})</h3>
            <div className="space-y-6">
                {REVIEWS.map((review) => (
                    <div key={review.id} className="border-b pb-6 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{review.user[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-sm">{review.user}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{review.date}</span>
                        </div>
                        <div className="mb-2">
                            <StarRating rating={review.rating} readonly size="sm" />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {review.text}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

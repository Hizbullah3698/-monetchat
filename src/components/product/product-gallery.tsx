
"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface ProductGalleryProps {
    images: { id: string; url: string; alt: string }[];
}

export function ProductGallery({ images }: ProductGalleryProps) {
    const [selectedImage, setSelectedImage] = useState(images[0]);

    if (!images.length) return (
        <div className="aspect-square bg-muted rounded-lg flex flex-col items-center justify-center gap-3 text-muted-foreground border">
            <ImageOff className="h-16 w-16 opacity-30" />
            <span className="text-sm">No photos yet</span>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="aspect-square relative overflow-hidden rounded-lg border bg-background">
                <Image
                    src={selectedImage.url}
                    alt={selectedImage.alt}
                    fill
                    className="object-cover"
                    priority
                />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {images.map((image) => (
                    <button
                        key={image.id}
                        onClick={() => setSelectedImage(image)}
                        className={cn(
                            "relative aspect-square w-20 flex-none overflow-hidden rounded-md border-2",
                            selectedImage.id === image.id ? "border-primary" : "border-transparent"
                        )}
                    >
                        <Image
                            src={image.url}
                            alt={image.alt}
                            fill
                            className="object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

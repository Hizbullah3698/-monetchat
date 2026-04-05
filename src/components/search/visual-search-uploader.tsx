
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface VisualSearchUploaderProps {
    onImageSelect: (file: File) => void;
    onClear: () => void;
}

export function VisualSearchUploader({ onImageSelect, onClear }: VisualSearchUploaderProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ title: "Error", description: "Image too large (max 5MB)", variant: "destructive" });
                return;
            }
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            onImageSelect(file);
        }
    };

    const handleClear = () => {
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        onClear();
    };

    return (
        <Card className="p-4 border-dashed border-2 mb-6">
            <div className="flex flex-col items-center justify-center gap-4">
                {preview ? (
                    <div className="relative h-64 w-full max-w-md">
                        <Image src={preview} alt="Upload preview" fill className="object-contain rounded-md" />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={handleClear}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="text-center space-y-2">
                        <div className="flex justify-center">
                            <div className="bg-primary/10 p-4 rounded-full">
                                <Upload className="h-8 w-8 text-primary" />
                            </div>
                        </div>
                        <h3 className="font-semibold text-lg">Upload an image</h3>
                        <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                        <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="visual-search-input"
                            onChange={handleFileChange}
                        />
                        <Button variant="outline" asChild>
                            <label htmlFor="visual-search-input" className="cursor-pointer">
                                Select Image
                            </label>
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}

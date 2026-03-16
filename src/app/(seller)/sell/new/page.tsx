"use client";

import { VisualSearchUploader } from "@/components/search/visual-search-uploader";
import { ListingForm } from "@/components/seller/listing-form";
import { ListingPreview } from "@/components/seller/listing-preview";
import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Plus, X, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/context/language-context";

type Step = "upload" | "form" | "preview";

interface UploadedImage {
  file: File;
  previewUrl: string;
  s3Url?: string;
}

export default function NewListingPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<Record<string, string> | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string> | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Upload a single file to S3 via presigned URL
  const uploadToS3 = useCallback(async (file: File): Promise<string> => {
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type: file.type,
        folder: "products",
      }),
    });

    if (!presignRes.ok) throw new Error("Failed to get upload URL");
    const { upload_url, public_url } = await presignRes.json();

    const uploadRes = await fetch(upload_url, {
      method: "PUT",
      body: file,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("S3 upload error:", uploadRes.status, errText);
      throw new Error("Failed to upload to S3");
    }
    return public_url;
  }, []);

  // Handle first image selection → upload to S3 → AI analysis
  const handleImageSelect = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const newImage: UploadedImage = { file, previewUrl };
    setImages([newImage]);
    setStep("form");
    setIsUploading(true);
    setIsAnalyzing(true);

    try {
      // Upload to S3
      const s3Url = await uploadToS3(file);
      newImage.s3Url = s3Url;
      setImages([{ ...newImage }]);
      setIsUploading(false);

      // AI analysis
      const analysisRes = await fetch("/api/ai/analyze-listing-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: s3Url }),
      });

      if (analysisRes.ok) {
        const analysis = await analysisRes.json();
        const suggestedPrice = analysis.suggested_price
          ? String(Math.round((analysis.suggested_price.min + analysis.suggested_price.max) / 2))
          : "";

        setAnalyzedData({
          title: analysis.title || "",
          description: analysis.description || "",
          category: analysis.category || "",
          condition: "good",
          price: suggestedPrice,
        });

        toast({
          title: t("sell.aiComplete"),
          description: t("sell.aiCompleteDesc"),
        });
      }
    } catch (err) {
      console.error("Upload/analysis error:", err);
      toast({
        title: "Upload issue",
        description: "Image uploaded but AI analysis unavailable. Fill in details manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setIsUploading(false);
    }
  }, [toast, uploadToS3]);

  // Additional image uploads
  const handleAddImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (images.length >= 8) {
        toast({ title: t("sell.maxImages"), variant: "destructive" });
        break;
      }

      const previewUrl = URL.createObjectURL(file);
      const newImage: UploadedImage = { file, previewUrl };
      setImages(prev => [...prev, newImage]);

      try {
        const s3Url = await uploadToS3(file);
        setImages(prev =>
          prev.map(img =>
            img.previewUrl === previewUrl ? { ...img, s3Url } : img
          )
        );
      } catch {
        toast({ title: "Failed to upload image", variant: "destructive" });
      }
    }

    e.target.value = "";
  }, [images.length, toast, uploadToS3]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const handleFormSubmit = (values: Record<string, string>) => {
    setFormValues(values);
    setStep("preview");
  };

  const handlePublish = async () => {
    if (!formValues) return;

    const imageUrls = images.map(img => img.s3Url).filter(Boolean) as string[];
    if (imageUrls.length === 0) {
      toast({ title: "Please wait for images to finish uploading", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formValues.title,
          description: formValues.description,
          price: parseFloat(formValues.price),
          categorySlug: formValues.category,
          condition: formValues.condition?.replace("-", "_") || "good",
          imageUrls,
          currency: "KWD",
          isNegotiable: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: data.reason ? t("sell.rejected") : t("common.error"),
          description: data.reason || data.error || t("common.somethingWrong"),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t("sell.published"),
        description: t("sell.publishedDesc"),
      });
      router.push("/sell");
    } catch {
      toast({
        title: t("common.error"),
        description: t("common.somethingWrong"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t("sell.title")}</h1>
        <p className="text-muted-foreground">
          {t("sell.subtitle")}
        </p>
      </div>

      {/* Step 1: Upload first image */}
      {step === "upload" && (
        <VisualSearchUploader
          onImageSelect={handleImageSelect}
          onClear={() => {}}
        />
      )}

      {/* Step 2: Form with image management */}
      {step === "form" && (
        <div className="space-y-6 relative">
          {(isAnalyzing || isUploading) && (
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center text-center rounded-lg">
              <Sparkles className="h-12 w-12 text-primary animate-pulse mb-4" />
              <h3 className="text-xl font-bold">
                {isUploading ? t("sell.uploading") : t("sell.analyzing")}
              </h3>
              <p className="text-muted-foreground">
                {isUploading
                  ? t("sell.uploadingDesc")
                  : t("sell.analyzingDesc")}
              </p>
            </div>
          )}

          {/* Image gallery */}
          <Card className="p-4">
            <div className="flex gap-3 flex-wrap">
              {images.map((img, i) => (
                <div key={img.previewUrl} className="relative group">
                  <div className="w-24 h-24 relative rounded-lg overflow-hidden border-2 border-muted">
                    <Image
                      src={img.previewUrl}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                    {!img.s3Url && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[10px] text-center py-0.5">
                        {t("sell.main")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < 8 && (
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">{t("sell.addMore")}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleAddImage}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {images.length}/8 {t("sell.photosCount")} · {t("sell.coverImage")}
            </p>
          </Card>

          {/* Listing form */}
          <Card className="p-6">
            <ListingForm
              initialValues={analyzedData || undefined}
              onSubmit={handleFormSubmit}
              isLoading={isAnalyzing}
            />
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setStep("upload");
              images.forEach(img => URL.revokeObjectURL(img.previewUrl));
              setImages([]);
              setAnalyzedData(null);
            }}
          >
            <ImageIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {t("sell.startOver")}
          </Button>
        </div>
      )}

      {/* Step 3: Preview before publish */}
      {step === "preview" && formValues && (
        <ListingPreview
          title={formValues.title}
          description={formValues.description}
          price={formValues.price}
          category={formValues.category}
          condition={formValues.condition}
          imageUrls={images.map(img => img.previewUrl)}
          onConfirm={handlePublish}
          onBack={() => setStep("form")}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

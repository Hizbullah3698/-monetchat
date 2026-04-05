"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  ImageIcon,
  User,
  Bot,
  Loader2,
  Camera,
  Store,
  Check,
  Pencil,
  Plus,
  X,
  LogIn,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { useAppMode } from "@/context/app-mode-context";
import type { TranslationKey } from "@/lib/i18n/translations";

interface ListingDraft {
  images: { previewUrl: string; s3Url?: string }[];
  title: string;
  description: string;
  category: string;
  condition: string;
  price: string;
}

interface SellMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  image?: string;
  draft?: ListingDraft;
  published?: { id: string; title: string };
}

const CATEGORIES = [
  "vehicles",
  "electronics",
  "property",
  "fashion",
  "furniture",
  "services",
  "other",
] as const;

const CONDITIONS = [
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
] as const;

function ListingDraftCard({
  draft,
  onUpdate,
  onPublish,
  onAddImage,
  isPublishing,
  t,
}: {
  draft: ListingDraft;
  onUpdate: (draft: ListingDraft) => void;
  onPublish: () => void;
  onAddImage: (file: File) => void;
  isPublishing: boolean;
  t: (key: TranslationKey) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(draft);
  const addImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValues(draft);
  }, [draft]);

  const handleSave = () => {
    onUpdate(values);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
        {/* Images */}
        <div className="flex gap-2 flex-wrap">
          {values.images.map((img, i) => (
            <div key={img.previewUrl} className="w-20 h-20 relative rounded-lg overflow-hidden border">
              <Image src={img.previewUrl} alt="" fill className="object-cover" />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[9px] text-center py-0.5">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>

        <Input
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          placeholder={t("form.titlePlaceholder" as TranslationKey)}
          className="font-medium"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("form.price" as TranslationKey)} (KWD)
            </label>
            <Input
              type="number"
              value={values.price}
              onChange={(e) => setValues({ ...values, price: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {t("form.category" as TranslationKey)}
            </label>
            <Select value={values.category} onValueChange={(v) => setValues({ ...values, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {t(`category.${c}` as TranslationKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            {t("form.condition" as TranslationKey)}
          </label>
          <Select value={values.condition} onValueChange={(v) => setValues({ ...values, condition: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`condition.${c}` as TranslationKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          placeholder={t("form.descriptionPlaceholder" as TranslationKey)}
          rows={3}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            {t("dashboard.save" as TranslationKey)}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {t("dashboard.cancel" as TranslationKey)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Image gallery */}
      {draft.images.length > 0 && (
        <div className="flex gap-1 p-2 bg-muted/30">
          {draft.images.map((img, i) => (
            <div key={img.previewUrl} className="relative w-24 h-24 rounded-lg overflow-hidden border">
              <Image src={img.previewUrl} alt="" fill className="object-cover" />
              {!img.s3Url && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
              )}
            </div>
          ))}
          {draft.images.length < 8 && (
            <button
              onClick={() => addImageRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">Add</span>
            </button>
          )}
          <input
            ref={addImageRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAddImage(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-base">{draft.title}</h3>
            <p className="text-lg font-bold text-primary mt-0.5">
              KWD {Number(draft.price).toLocaleString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
            {t("preview.edit" as TranslationKey)}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="text-xs bg-muted px-2.5 py-1 rounded-full">
            {t(`category.${draft.category}` as TranslationKey)}
          </span>
          <span className="text-xs bg-muted px-2.5 py-1 rounded-full">
            {t(`condition.${draft.condition}` as TranslationKey)}
          </span>
        </div>

        {draft.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {draft.description}
          </p>
        )}

        <Button
          onClick={onPublish}
          disabled={isPublishing}
          className="w-full"
          size="lg"
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              {t("preview.publishing" as TranslationKey)}
            </>
          ) : (
            t("preview.publish" as TranslationKey)
          )}
        </Button>
      </div>
    </div>
  );
}

interface SellChatInterfaceProps {
  className?: string;
}

export function SellChatInterface({ className }: SellChatInterfaceProps) {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const { updateChatTitle, currentChatId } = useAppMode();

  const [messages, setMessages] = useState<SellMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is logged in before allowing image upload
  const handleImageButtonClick = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    fileInputRef.current?.click();
  };

  // Reset messages when chat changes
  useEffect(() => {
    setMessages([]);
    setIsLoading(false);
    setIsPublishing(false);
  }, [currentChatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadToS3 = useCallback(async (file: File): Promise<string> => {
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content_type: file.type, folder: "products" }),
    });
    if (!presignRes.ok) throw new Error("Failed to get upload URL");
    const { upload_url, public_url } = await presignRes.json();
    const uploadRes = await fetch(upload_url, { method: "PUT", body: file });
    if (!uploadRes.ok) throw new Error("Upload failed");
    return public_url;
  }, []);

  const handleImageUpload = useCallback(
    async (file: File) => {
      const previewUrl = URL.createObjectURL(file);

      const userMsg: SellMessage = {
        id: Date.now().toString(),
        role: "user",
        text: t("sell.uploadItem" as TranslationKey),
        image: previewUrl,
      };
      setMessages((prev) => [...prev, userMsg]);
      setImagePreview(null);
      setImageFile(null);
      setIsLoading(true);

      try {
        // Upload to S3
        const s3Url = await uploadToS3(file);

        // AI analysis
        const analysisRes = await fetch("/api/ai/analyze-listing-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: s3Url }),
        });

        if (!analysisRes.ok) throw new Error("Analysis failed");
        const analysis = await analysisRes.json();

        const suggestedPrice = analysis.suggested_price
          ? String(
              Math.round(
                (analysis.suggested_price.min + analysis.suggested_price.max) / 2
              )
            )
          : "0";

        const draft: ListingDraft = {
          images: [{ previewUrl, s3Url }],
          title: analysis.title || "Untitled",
          description: analysis.description || "",
          category: analysis.category || "other",
          condition: "good",
          price: suggestedPrice,
        };

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            text: t("sell.aiAnalyzed" as TranslationKey),
            draft,
          },
        ]);

        // Update sidebar chat title
        updateChatTitle(analysis.title || "New listing");
      } catch (error) {
        console.error("Sell flow error:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            text: t("sell.analysisFailed" as TranslationKey),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [uploadToS3, updateChatTitle, t]
  );

  const handleAddImageToDraft = useCallback(
    async (file: File, msgId: string) => {
      const previewUrl = URL.createObjectURL(file);

      // Optimistically add preview
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.draft) {
            return {
              ...m,
              draft: {
                ...m.draft,
                images: [...m.draft.images, { previewUrl }],
              },
            };
          }
          return m;
        })
      );

      try {
        const s3Url = await uploadToS3(file);
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.draft) {
              return {
                ...m,
                draft: {
                  ...m.draft,
                  images: m.draft.images.map((img) =>
                    img.previewUrl === previewUrl ? { ...img, s3Url } : img
                  ),
                },
              };
            }
            return m;
          })
        );
      } catch {
        // Remove failed image
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.draft) {
              return {
                ...m,
                draft: {
                  ...m.draft,
                  images: m.draft.images.filter(
                    (img) => img.previewUrl !== previewUrl
                  ),
                },
              };
            }
            return m;
          })
        );
      }
    },
    [uploadToS3]
  );

  const handlePublish = useCallback(
    async (draft: ListingDraft) => {
      if (!user) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text: t("sell.loginRequired" as TranslationKey),
          },
        ]);
        return;
      }

      const imageUrls = draft.images
        .map((img) => img.s3Url)
        .filter(Boolean) as string[];
      if (imageUrls.length === 0) return;

      setIsPublishing(true);

      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            description: draft.description,
            price: parseFloat(draft.price),
            categorySlug: draft.category,
            condition: draft.condition.replace("-", "_") || "good",
            imageUrls,
            currency: "KWD",
            isNegotiable: true,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to create listing");
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text: t("sell.publishSuccess" as TranslationKey),
            published: { id: data.product.id, title: data.product.title },
          },
        ]);
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text: `${t("sell.publishFailed" as TranslationKey)}: ${msg}`,
          },
        ]);
      } finally {
        setIsPublishing(false);
      }
    },
    [user, t]
  );

  const handleSend = useCallback(() => {
    if (imageFile) {
      handleImageUpload(imageFile);
    } else if (inputValue.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          text: inputValue,
        },
      ]);
      setInputValue("");

      // Suggest uploading a photo
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            text: t("sell.uploadPrompt" as TranslationKey),
          },
        ]);
      }, 500);
    }
  }, [imageFile, inputValue, handleImageUpload, t]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const showWelcome = messages.length === 0;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="space-y-4 mx-auto max-w-2xl">
          {/* Welcome screen */}
          {showWelcome && (
            <div className="flex flex-col items-center text-center py-12 md:py-20">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Store className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">
                {t("sell.chatWelcome" as TranslationKey)}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                {t("sell.chatSubtitle" as TranslationKey)}
              </p>
              <div className="mt-6">
                <Button
                  onClick={handleImageButtonClick}
                  size="lg"
                  className="gap-2"
                >
                  <Camera className="h-5 w-5" />
                  {t("sell.uploadPhoto" as TranslationKey)}
                </Button>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user" ? "bg-muted" : "bg-primary/10"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg p-3 text-sm max-w-[70%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.image && (
                    <Image
                      src={msg.image}
                      alt="Upload"
                      width={200}
                      height={200}
                      className="rounded-md mb-2"
                    />
                  )}
                  {msg.text}
                </div>
              </div>

              {/* Listing Draft Card */}
              {msg.draft && (
                <div className="mt-3 ltr:ml-10 rtl:mr-10">
                  <ListingDraftCard
                    draft={msg.draft}
                    onUpdate={(updated) => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === msg.id ? { ...m, draft: updated } : m
                        )
                      );
                    }}
                    onPublish={() => handlePublish(msg.draft!)}
                    onAddImage={(file) => handleAddImageToDraft(file, msg.id)}
                    isPublishing={isPublishing}
                    t={t}
                  />
                </div>
              )}

              {/* Published success */}
              {msg.published && (
                <div className="mt-3 ltr:ml-10 rtl:mr-10">
                  <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {t("sell.published" as TranslationKey)}
                      </p>
                      <Link
                        href={`/p/${msg.published.id}`}
                        className="text-sm text-green-600 hover:underline"
                      >
                        {msg.published.title} &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg p-3 bg-muted">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("sell.analyzing" as TranslationKey)}
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <div className="mx-auto max-w-2xl">
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <Image
                src={imagePreview}
                alt="Preview"
                width={60}
                height={60}
                className="rounded-md"
              />
              <button
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                }}
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 text-xs flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleImageButtonClick}
              disabled={isLoading}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <Input
              placeholder={t("sell.inputPlaceholder" as TranslationKey)}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0"
              disabled={isLoading || (!inputValue && !imageFile)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Login Required Dialog */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            {locale === "ar" ? "تسجيل الدخول مطلوب" : "Login Required"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {locale === "ar"
              ? "يرجى تسجيل الدخول أو إنشاء حساب لتتمكن من رفع الصور وإنشاء إعلانات."
              : "Please log in or create an account to upload images and create listings."}
          </p>
          <div className="flex gap-3 mt-2">
            <Button asChild className="flex-1">
              <Link href="/login" onClick={() => setShowLoginPrompt(false)}>
                {locale === "ar" ? "تسجيل الدخول" : "Log In"}
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/register" onClick={() => setShowLoginPrompt(false)}>
                {locale === "ar" ? "إنشاء حساب" : "Sign Up"}
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

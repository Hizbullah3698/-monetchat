"use client";

import ReactMarkdown from "react-markdown";
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
  Phone,
  Camera,
  MapPin,
  Tag,
  Check,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  LogIn,
  X,
  ChevronRight,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { VoiceButton } from "./voice-button";
import { useLanguage } from "@/context/language-context";
import { useAppMode } from "@/context/app-mode-context";
import { useAuth } from "@/context/auth-context";
import type { TranslationKey } from "@/lib/i18n/translations";

export interface ChatProduct {
  id: string;
  title: string;
  title_ar?: string;
  description?: string | null;
  description_ar?: string | null;
  price: number;
  currency: string;
  condition?: string;
  is_negotiable?: boolean;
  image_url: string | null;
  category?: { slug: string; name: string; name_ar?: string } | null;
  seller?: { name: string; phone?: string; whatsapp?: string };
  location?: { region?: string; region_ar?: string };
}

export interface ListingDraft {
  images: { previewUrl: string; s3Url?: string }[];
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  category: string;
  condition: string;
  price: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  image?: string;
  products?: ChatProduct[];
  draft?: ListingDraft;
  published?: { id: string; title: string };
  intentPicker?: { imageUrl: string; previewUrl: string };
  contentLanguage?: string;
}

const MESSAGES_STORAGE_PREFIX = "pickpic_messages_";

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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.592-.838-6.313-2.236l-.44-.368-3.244 1.088 1.088-3.244-.368-.44A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
    </svg>
  );
}

// ============================================
// Product Detail Dialog
// ============================================

function ProductDetailDialog({
  product,
  open,
  onOpenChange,
  locale,
  t,
}: {
  product: ChatProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  t: (key: TranslationKey) => string;
}) {
  if (!product) return null;

  const displayTitle =
    locale === "ar" && product.title_ar ? product.title_ar : product.title;
  const displayDescription =
    locale === "ar" && product.description_ar
      ? product.description_ar
      : product.description;
  const displayRegion =
    locale === "ar" && product.location?.region_ar
      ? product.location.region_ar
      : product.location?.region;
  const displayCategory =
    locale === "ar" && product.category?.name_ar
      ? product.category.name_ar
      : product.category?.name;

  const whatsappText =
    locale === "ar"
      ? `${t("product.whatsappMessage")} ${product.title_ar || product.title}`
      : `${t("product.whatsappMessage")} ${product.title}`;
  const whatsappLink = product.seller?.whatsapp
    ? `https://wa.me/${product.seller.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappText)}`
    : product.seller?.phone
      ? `https://wa.me/${product.seller.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappText)}`
      : null;

  const conditionLabels: Record<string, string> = {
    new: t("condition.new"),
    like_new: t("condition.like_new"),
    good: t("condition.good"),
    fair: t("condition.fair"),
    poor: t("condition.poor"),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Product Image */}
        {product.image_url ? (
          <div className="relative aspect-[4/3] w-full bg-muted">
            <Image
              src={product.image_url}
              alt={displayTitle}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* Title & Price */}
          <div>
            <DialogTitle className="text-xl font-bold">
              {displayTitle}
            </DialogTitle>
            <p className="text-2xl font-bold text-primary mt-1">
              {product.currency} {product.price.toLocaleString()}
              {product.is_negotiable && (
                <span className="text-sm font-normal text-muted-foreground ltr:ml-2 rtl:mr-2">
                  {t("product.negotiable")}
                </span>
              )}
            </p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {product.condition && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                {conditionLabels[product.condition] || product.condition}
              </span>
            )}
            {displayCategory && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border">
                <Tag className="h-3 w-3" />
                {displayCategory}
              </span>
            )}
          </div>

          {/* Description */}
          {displayDescription && (
            <div>
              <h4 className="text-sm font-semibold mb-1">
                {t("product.details")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {displayDescription}
              </p>
            </div>
          )}

          {/* Seller & Location */}
          {(product.seller?.name || displayRegion) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {product.seller?.name && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {product.seller.name}
                </span>
              )}
              {displayRegion && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {displayRegion}
                </span>
              )}
            </div>
          )}

          {/* Contact Buttons */}
          <div className="flex gap-2 pt-2">
            {(product.seller?.phone || product.seller?.whatsapp) && (
              <a
                href={`tel:${product.seller.phone || product.seller.whatsapp}`}
                className="flex-1"
              >
                <Button variant="outline" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  {t("product.call")}
                </Button>
              </a>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                  <WhatsAppIcon className="h-4 w-4" />
                  {t("product.whatsapp")}
                </Button>
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Product Card
// ============================================

function ProductCard({
  product,
  locale,
  t,
  onViewDetails,
}: {
  product: ChatProduct;
  locale: string;
  t: (key: TranslationKey) => string;
  onViewDetails: () => void;
}) {
  const whatsappText =
    locale === "ar"
      ? `${t("product.whatsappMessage")} ${product.title_ar || product.title}`
      : `${t("product.whatsappMessage")} ${product.title}`;
  const whatsappLink = product.seller?.whatsapp
    ? `https://wa.me/${product.seller.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappText)}`
    : product.seller?.phone
      ? `https://wa.me/${product.seller.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappText)}`
      : null;
  const displayTitle =
    locale === "ar" && product.title_ar ? product.title_ar : product.title;
  const displayRegion =
    locale === "ar" && product.location?.region_ar
      ? product.location.region_ar
      : product.location?.region;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Clickable area - opens detail dialog */}
      <button
        onClick={onViewDetails}
        className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.title}
            width={64}
            height={64}
            className="rounded-md object-cover w-16 h-16 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayTitle}</p>
          <p className="text-sm text-primary font-bold">
            {product.currency} {product.price.toLocaleString()}
          </p>
          {product.seller?.name && (
            <p className="text-xs text-muted-foreground truncate">
              {product.seller.name}
              {displayRegion ? ` · ${displayRegion}` : ""}
            </p>
          )}
        </div>
      </button>

      {/* Contact buttons - always visible when seller info exists */}
      <div className="flex border-t divide-x rtl:divide-x-reverse">
        {(product.seller?.phone || product.seller?.whatsapp) && (
          <a
            href={`tel:${product.seller.phone || product.seller.whatsapp}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" />
            {t("product.call")}
          </a>
        )}
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            {t("product.whatsapp")}
          </a>
        )}
        {/* View details fallback when no contact info */}
        {!product.seller?.phone && !product.seller?.whatsapp && (
          <button
            onClick={onViewDetails}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary hover:bg-muted/50 transition-colors"
          >
            {t("product.details")}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Listing Draft Card (Sell Flow)
// ============================================

function ListingDraftCard({
  draft,
  onUpdate,
  onPublish,
  onAddImage,
  isPublishing,
  t,
  locale,
}: {
  draft: ListingDraft;
  onUpdate: (draft: ListingDraft) => void;
  onPublish: () => void;
  onAddImage: (file: File) => void;
  isPublishing: boolean;
  t: (key: TranslationKey) => string;
  locale: string;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(draft);
  const addImageRef = useRef<HTMLInputElement>(null);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  // Language-aware display fields
  const displayTitle = locale === "ar" && draft.titleAr ? draft.titleAr : draft.title;
  const displayDescription = locale === "ar" && draft.descriptionAr ? draft.descriptionAr : draft.description;

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
          value={locale === "ar" && values.titleAr ? values.titleAr : values.title}
          onChange={(e) =>
            locale === "ar"
              ? setValues({ ...values, titleAr: e.target.value })
              : setValues({ ...values, title: e.target.value })
          }
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
          value={locale === "ar" && values.descriptionAr ? values.descriptionAr : values.description}
          onChange={(e) =>
            locale === "ar"
              ? setValues({ ...values, descriptionAr: e.target.value })
              : setValues({ ...values, description: e.target.value })
          }
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
      {/* Image gallery — always visible so user can add photos */}
      <div className="flex gap-1 p-2 bg-muted/30 flex-wrap">
        {draft.images.map((img, i) => (
          <div key={img.previewUrl} className="relative w-24 h-24 rounded-lg overflow-hidden border">
            <Image src={img.previewUrl} alt="" fill className="object-cover" />
            {i === 0 && draft.images.length > 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[9px] text-center py-0.5">
                Cover
              </span>
            )}
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
            className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] mt-1">
              {draft.images.length === 0 ? "Add Photo" : "Add"}
            </span>
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

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{displayTitle}</h3>
            {editingPrice || (!draft.price || Number(draft.price) <= 0) ? (
              <div className="flex items-center gap-1.5 mt-1">
                <Input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="Enter price (KWD)"
                  className="h-8 w-32 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && priceInput && Number(priceInput) > 0) {
                      onUpdate({ ...draft, price: priceInput });
                      setEditingPrice(false);
                    } else if (e.key === "Escape") {
                      setPriceInput(draft.price && Number(draft.price) > 0 ? String(draft.price) : "");
                      setEditingPrice(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (priceInput && Number(priceInput) > 0) {
                      onUpdate({ ...draft, price: priceInput });
                      setEditingPrice(false);
                    }
                  }}
                  disabled={!priceInput || Number(priceInput) <= 0}
                  className="h-8 w-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setPriceInput(draft.price && Number(draft.price) > 0 ? String(draft.price) : "");
                    setEditingPrice(false);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p
                className="text-lg font-bold text-primary mt-0.5 cursor-pointer hover:underline"
                onClick={() => {
                  setPriceInput(String(draft.price));
                  setEditingPrice(true);
                }}
              >
                KWD {Number(draft.price).toLocaleString()}
              </p>
            )}
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

        {displayDescription && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {displayDescription}
          </p>
        )}

        <Button
          onClick={onPublish}
          disabled={isPublishing || !draft.price || Number(draft.price) <= 0}
          className="w-full"
          size="lg"
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
              {t("preview.publishing" as TranslationKey)}
            </>
          ) : !draft.price || Number(draft.price) <= 0 ? (
            "Set price to publish"
          ) : (
            t("preview.publish" as TranslationKey)
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Chat Interface
// ============================================

interface ChatInterfaceProps {
  /** "full" = full-page chat (homepage), "widget" = compact widget */
  variant?: "full" | "widget";
  className?: string;
}

export function ChatInterface({
  variant = "full",
  className,
}: ChatInterfaceProps) {
  const isWidget = variant === "widget";
  const { t, locale } = useLanguage();

  // AppMode context - only available in full variant (not widget)
  let appModeCtx: ReturnType<typeof useAppMode> | null = null;
  try {
    appModeCtx = useAppMode();
  } catch {
    // Widget variant may not have AppModeProvider
  }

  // Auth context - check if user is logged in (AuthProvider is in root layout)
  const { user: authUser } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ChatProduct | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [overlayProducts, setOverlayProducts] = useState<ChatProduct[] | null>(null);
  const [productContentLanguage, setProductContentLanguage] = useState<string | null>(null);
  const [showSellOptions, setShowSellOptions] = useState(false);
  const [showBuyOptions, setShowBuyOptions] = useState(false);
  const [showSellerProfileModal, setShowSellerProfileModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // Flag to skip message reload when we just created a session (prevents draft card from disappearing)
  const skipNextReload = useRef(false);
  // AbortController for the active SSE stream — cancelled on unmount or new message
  const streamAbortRef = useRef<AbortController | null>(null);

  // Current chat ID for persistence (this is the server session ID for logged-in users)
  const currentChatId = appModeCtx?.currentChatId;

  // Load messages when chat changes - from server for logged-in users, localStorage for anonymous
  useEffect(() => {
    if (!currentChatId) {
      setMessages([]);
      setSessionId(null);
      setIsLoading(false);
      return;
    }

    // Skip reload if we just created this session (draft card would be wiped)
    if (skipNextReload.current) {
      skipNextReload.current = false;
      setSessionId(currentChatId);
      return;
    }

    // Set session ID from the chat ID (they're the same for server-persisted chats)
    setSessionId(currentChatId);

    // Try loading from server first (for logged-in users)
    if (authUser) {
      setMessagesLoading(true);
      fetch(`/api/chats/${currentChatId}/messages`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.messages?.length > 0) {
            setMessages(
              data.messages.map((m: { id: string; role: string; text: string; image?: string; products?: ChatProduct[]; draft?: ListingDraft; published?: { id: string; title: string }; contentLanguage?: string }) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                text: m.text,
                image: m.image,
                products: m.products,
                ...(m.draft ? { draft: m.draft } : {}),
                ...(m.published ? { published: m.published } : {}),
                ...(m.contentLanguage ? { contentLanguage: m.contentLanguage } : {}),
              }))
            );
          } else {
            setMessages([]);
          }
        })
        .catch(() => {
          setMessages([]);
        })
        .finally(() => {
          setMessagesLoading(false);
        });
    } else {
      // Anonymous: load from localStorage
      try {
        const saved = localStorage.getItem(MESSAGES_STORAGE_PREFIX + currentChatId);
        if (saved) {
          setMessages(JSON.parse(saved) as ChatMessage[]);
        } else {
          setMessages([]);
        }
      } catch {
        setMessages([]);
      }
    }
  }, [currentChatId, authUser]);

  // Save messages to localStorage (for anonymous users as backup)
  useEffect(() => {
    if (currentChatId && messages.length > 0 && !authUser) {
      try {
        localStorage.setItem(
          MESSAGES_STORAGE_PREFIX + currentChatId,
          JSON.stringify(messages)
        );
      } catch {
        // localStorage full or unavailable
      }
    }
  }, [messages, currentChatId, authUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Abort any active SSE stream on component unmount
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  // Upload image to S3 first, then return the public URL
  const uploadImageToS3 = useCallback(async (file: File): Promise<string> => {
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content_type: file.type,
        folder: "chat",
      }),
    });

    if (!presignRes.ok) {
      throw new Error("Failed to get upload URL");
    }

    const { upload_url, public_url } = await presignRes.json();

    const uploadRes = await fetch(upload_url, {
      method: "PUT",
      body: file,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("S3 upload error:", uploadRes.status, errText);
      throw new Error(`Upload failed: ${uploadRes.status}`);
    }

    return public_url;
  }, []);

  // SSE event parser helper
  const parseSSEEvents = useCallback((chunk: string): Array<{ event: string; data: string }> => {
    const events: Array<{ event: string; data: string }> = [];
    const lines = chunk.split("\n");
    let currentEvent = "";
    let currentData = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7);
      } else if (line.startsWith("data: ")) {
        currentData = line.slice(6);
      } else if (line === "" && currentEvent && currentData) {
        events.push({ event: currentEvent, data: currentData });
        currentEvent = "";
        currentData = "";
      }
    }
    return events;
  }, []);

  // Core function: send a text message with SSE streaming response
  const sendMessageToAPI = useCallback(
    async (text: string, imageUrl?: string, userMsgId?: string) => {
      setIsLoading(true);
      setStreamingStatus(null);

      // Create assistant message immediately (empty, will be filled by stream)
      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        text: "",
      };
      setMessages((prev) => [...prev, aiMsg]);

      try {
        // Abort any previous stream before starting a new one
        streamAbortRef.current?.abort();
        const abortController = new AbortController();
        streamAbortRef.current = abortController;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            message: text || undefined,
            image_url: imageUrl || undefined,
            location: { country_code: "KW", language: locale },
          }),
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to connect to chat API");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedAnalysis: Record<string, unknown> | null = null;
        let assistantText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse complete SSE events from buffer
          const lastDoubleNewline = buffer.lastIndexOf("\n\n");
          if (lastDoubleNewline === -1) continue;

          const completePart = buffer.slice(0, lastDoubleNewline + 2);
          buffer = buffer.slice(lastDoubleNewline + 2);

          const events = parseSSEEvents(completePart);

          for (const evt of events) {
            try {
              const parsed = JSON.parse(evt.data);

              switch (evt.event) {
                case "status":
                  setStreamingStatus(parsed.text);
                  break;

                case "delta":
                  setStreamingStatus(null);
                  assistantText += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, text: assistantText }
                        : m
                    )
                  );
                  break;

                case "products":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId
                        ? { ...m, products: parsed.products as ChatProduct[], contentLanguage: parsed.language as string }
                        : m
                    )
                  );
                  break;

                case "analysis":
                  // Store analysis for draft creation after text is done
                  receivedAnalysis = parsed.image_analysis;
                  break;

                case "login_required":
                  setShowLoginPrompt(true);
                  break;

                case "listing_draft": {
                  const textDraft: ListingDraft = {
                    images: (parsed.image_urls || []).map((url: string) => ({
                      previewUrl: url,
                      s3Url: url,
                    })),
                    title: (parsed.title as string) || "Untitled",
                    titleAr: (parsed.title_ar as string) || undefined,
                    description: (parsed.description as string) || "",
                    descriptionAr: (parsed.description_ar as string) || undefined,
                    category: (parsed.category as string) || "other",
                    condition: (parsed.condition as string) || "good",
                    price: "",
                  };
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId ? { ...m, draft: textDraft, contentLanguage: parsed.language as string } : m
                    )
                  );
                  break;
                }

                case "seller_action_required":
                  if (parsed.action === "complete_profile") {
                    setShowSellerProfileModal(true);
                  }
                  break;

                case "done": {
                  setStreamingStatus(null);
                  const newSessionId = parsed.session_id;

                  if (newSessionId && newSessionId !== sessionId) {
                    setSessionId(newSessionId);
                    if (authUser && appModeCtx) {
                      appModeCtx.refreshChats();
                      skipNextReload.current = true;
                      appModeCtx.selectChat(newSessionId);
                    }
                  }

                  // If we received an analysis (sell flow) but no listing_draft was emitted,
                  // create a fallback draft from the image analysis (includes bilingual fields)
                  if (receivedAnalysis && imageUrl) {
                    const imgAnalysis = receivedAnalysis as Record<string, unknown>;

                    setMessages((prev) => {
                      const aiMsg = prev.find((m) => m.id === aiMsgId);
                      // Skip if listing_draft already set a proper draft
                      if (aiMsg?.draft) return prev;

                      const suggestedPrice = "";

                      const previewUrl =
                        prev.find((m) => m.id === userMsgId)?.image || imageUrl;

                      const draft: ListingDraft = {
                        images: [{ previewUrl, s3Url: imageUrl }],
                        title: (imgAnalysis.title as string) || "Untitled",
                        titleAr: (imgAnalysis.title_ar as string) || undefined,
                        description: (imgAnalysis.description as string) || "",
                        descriptionAr: (imgAnalysis.description_ar as string) || undefined,
                        category: (imgAnalysis.category as string) || "other",
                        condition: "good",
                        price: suggestedPrice,
                      };

                      // Detect language from user's original message text
                      const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
                      const detectedLang = hasArabic ? "ar" : "en";

                      return prev.map((m) =>
                        m.id === aiMsgId ? { ...m, draft, contentLanguage: detectedLang } : m
                      );
                    });
                  }
                  break;
                }
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        // Ignore AbortError — triggered by unmount or new message starting
        if (err instanceof Error && err.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, text: m.text || t("chat.error") }
              : m
          )
        );
      } finally {
        setIsLoading(false);
        setStreamingStatus(null);
      }
    },
    [sessionId, locale, t, authUser, appModeCtx, messages, parseSSEEvents]
  );

  // Main send handler: text + optional file
  const sendMessage = useCallback(
    async (text: string, file?: File | null) => {
      if (!text && !file) return;

      const localPreview = file ? URL.createObjectURL(file) : undefined;
      const userMsgId = Date.now().toString();

      // If image only (no text) → show intent picker
      if (file && !text.trim()) {
        const userMsg: ChatMessage = {
          id: userMsgId,
          role: "user",
          text: locale === "ar" ? "صورة مرفقة" : "Image attached",
          image: localPreview,
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setImagePreview(null);
        setImageFile(null);
        setIsLoading(true);

        try {
          // Upload image to S3 first
          const imageUrl = await uploadImageToS3(file);
          // Replace blob URL with S3 URL
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId ? { ...m, image: imageUrl } : m
            )
          );

          // Show intent picker
          const pickerMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            text:
              locale === "ar"
                ? "ماذا تريد أن تفعل بهذه الصورة؟"
                : "What would you like to do with this image?",
            intentPicker: { imageUrl, previewUrl: localPreview || imageUrl },
          };
          setMessages((prev) => [...prev, pickerMsg]);
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              text: t("chat.error"),
            },
          ]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Text message (with or without image)
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: "user",
        text: text,
        image: localPreview,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setImagePreview(null);
      setImageFile(null);

      let imageUrl: string | undefined;
      if (file) {
        setIsLoading(true);
        try {
          imageUrl = await uploadImageToS3(file);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId ? { ...m, image: imageUrl } : m
            )
          );
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              text: t("chat.error"),
            },
          ]);
          setIsLoading(false);
          return;
        }
      }

      await sendMessageToAPI(text, imageUrl, userMsgId);
    },
    [uploadImageToS3, locale, t, sendMessageToAPI]
  );

  // Intent picker: user chose "Buy / Find similar"
  const handleIntentBuy = useCallback(
    (imageUrl: string, pickerMsgId: string) => {
      // Remove the intent picker from the message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pickerMsgId ? { ...m, intentPicker: undefined } : m
        )
      );
      const buyText =
        locale === "ar"
          ? "أريد البحث عن منتجات مشابهة لهذه الصورة"
          : "I want to find products similar to this image";
      // Add user choice as a message
      const choiceMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        text: buyText,
      };
      setMessages((prev) => [...prev, choiceMsg]);
      sendMessageToAPI(buyText, imageUrl);
    },
    [locale, sendMessageToAPI]
  );

  // Intent picker: user chose "Sell this item"
  const handleIntentSell = useCallback(
    (imageUrl: string, previewUrl: string, pickerMsgId: string) => {
      // Remove the intent picker from the message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pickerMsgId ? { ...m, intentPicker: undefined } : m
        )
      );
      const sellText =
        locale === "ar"
          ? "أريد بيع هذا المنتج"
          : "I want to sell this item";
      const choiceMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        text: sellText,
      };
      setMessages((prev) => [...prev, choiceMsg]);

      // Find the user msg ID that has this image
      const userMsgId = messages.find(
        (m) => m.role === "user" && (m.image === imageUrl || m.image === previewUrl)
      )?.id;

      sendMessageToAPI(sellText, imageUrl, userMsgId);
    },
    [locale, sendMessageToAPI, messages]
  );

  // Publish a listing draft
  const handlePublish = useCallback(
    async (draft: ListingDraft, msgId: string) => {
      if (!authUser) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text:
              locale === "ar"
                ? "يرجى تسجيل الدخول لنشر الإعلان"
                : "Please log in to publish your listing",
          },
        ]);
        return;
      }

      const imageUrls = draft.images
        .map((img) => img.s3Url)
        .filter(Boolean) as string[];
      // Physical products require at least one image; text-only categories (property, services, jobs, other) do not
      const isDescriptionBased = ["property", "services", "jobs", "other"].includes(draft.category || "");
      if (imageUrls.length === 0 && !isDescriptionBased) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text:
              locale === "ar"
                ? "يرجى إضافة صورة واحدة على الأقل قبل نشر الإعلان"
                : "Please add at least one photo before publishing your listing",
          },
        ]);
        return;
      }

      setIsPublishing(true);

      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            titleAr: draft.titleAr || undefined,
            description: draft.description,
            descriptionAr: draft.descriptionAr || undefined,
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

        const publishedText =
          locale === "ar"
            ? "تم نشر إعلانك بنجاح!"
            : "Your listing has been published successfully!";

        // Clear the draft card and append published confirmation
        setMessages((prev) =>
          prev
            .map((m) => (m.id === msgId ? { ...m, draft: undefined } : m))
            .concat({
              id: Date.now().toString(),
              role: "assistant",
              text: publishedText,
              published: { id: data.product.id, title: data.product.title },
            })
        );

        // Persist to DB: clear draft metadata + save published message
        if (sessionId) {
          fetch(`/api/chats/${sessionId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "publish_listing",
              draftMessageId: msgId,
              productId: data.product.id,
              productTitle: data.product.title,
              text: publishedText,
            }),
          }).catch((err) => console.error("Failed to persist publish:", err));
        }

        // Update sidebar title
        if (appModeCtx) {
          appModeCtx.updateChatTitle(data.product.title || draft.title);
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Something went wrong";
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            text: `${locale === "ar" ? "فشل النشر" : "Publishing failed"}: ${msg}`,
          },
        ]);
      } finally {
        setIsPublishing(false);
      }
    },
    [authUser, locale, appModeCtx, sessionId]
  );

  // Add additional image to a listing draft
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
        const s3Url = await uploadImageToS3(file);
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
    [uploadImageToS3]
  );

  const handleSend = () => {
    sendMessage(inputValue, imageFile);
  };

  const handleVoiceTranscript = (transcript: string) => {
    sendMessage(transcript);
  };

  // Check if user is logged in before allowing image upload
  const handleImageButtonClick = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (!authUser) {
      setShowLoginPrompt(true);
      return;
    }
    ref.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleBuyStart = useCallback(() => {
    if (messages.length > 0) return;
    
    const welcomeMsg: ChatMessage = {
      id: "buy-welcome-" + Date.now(),
      role: "assistant",
      text: t("chat.buyWelcome")
    };
    
    setMessages([welcomeMsg]);
    setShowSellOptions(false);
    
    // Focus input after state update
    setTimeout(() => {
      inputRef?.current?.focus();
    }, 100);
  }, [messages.length, t, setShowSellOptions]);

  const showWelcome = messages.length === 0 && !messagesLoading;

  return (
    <div className={cn("flex flex-col relative", className)}>
      {/* Messages area */}
      <ScrollArea className={cn("flex-1", isWidget ? "p-3" : "p-4 md:p-6")}>
        <div
          className={cn(
            "space-y-4 mx-auto",
            isWidget ? "max-w-full" : "max-w-2xl"
          )}
        >
          {/* Loading messages from server */}
          {messagesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Welcome screen */}
          {showWelcome && (
            <div
              className={cn(
                "flex flex-col items-center text-center",
                isWidget ? "py-6" : "py-12 md:py-20"
              )}
            >
              <div
                className={cn(
                  "rounded-full bg-primary/10 flex items-center justify-center mb-4",
                  isWidget ? "h-12 w-12" : "h-16 w-16"
                )}
              >
                <Bot
                  className={cn(
                    "text-primary",
                    isWidget ? "h-6 w-6" : "h-8 w-8"
                  )}
                />
              </div>
              <h2
                className={cn(
                  "font-bold",
                  isWidget ? "text-lg" : "text-2xl md:text-3xl"
                )}
              >
                {t("chat.welcome")}
              </h2>
              <p
                className={cn(
                  "text-muted-foreground mt-2",
                  isWidget ? "text-sm" : "text-base"
                )}
              >
                {t("chat.subtitle")}
              </p>

              <div className="w-full mt-6 max-w-xs space-y-3">
                {/* Buy / Sell intent buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    data-testid="buy-suggestion"
                    onClick={() => {
                      setShowBuyOptions((v) => !v);
                      setShowSellOptions(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors",
                      showBuyOptions ? "bg-primary/10 border-primary" : "hover:bg-primary/5 hover:border-primary/40"
                    )}
                  >
                    <ShoppingBag className="h-6 w-6 text-primary" />
                    <span>{t("chat.mode.buy")}</span>
                  </button>
                  <button
                    data-testid="sell-suggestion"
                    onClick={() => {
                      setShowSellOptions((v) => !v);
                      setShowBuyOptions(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors",
                      showSellOptions ? "bg-primary/10 border-primary" : "hover:bg-primary/5 hover:border-primary/40"
                    )}
                  >
                    <Store className="h-6 w-6 text-primary" />
                    <span>{t("chat.mode.sell")}</span>
                  </button>
                </div>

                {/* Sub-options for Buy / Sell */}
                <AnimatePresence mode="wait">
                  {showBuyOptions && (
                    <motion.div
                      key="buy-options"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-2 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setShowBuyOptions(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <ImageIcon className="h-4 w-4 shrink-0" />
                        <span>{t("chat.mode.uploadPhoto")}</span>
                      </button>
                      <button
                        onClick={() => {
                          setInputValue(t("chat.buySearchPrompt"));
                          setShowBuyOptions(false);
                          inputRef?.current?.focus?.();
                        }}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <Send className="h-4 w-4 shrink-0" />
                        <span>{t("chat.mode.searchChat")}</span>
                      </button>
                    </motion.div>
                  )}

                  {showSellOptions && (
                    <motion.div
                      key="sell-options"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-2 overflow-hidden"
                    >
                      <button
                        onClick={() => {
                          setShowSellOptions(false);
                          fileInputRef.current?.click();
                        }}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <ImageIcon className="h-4 w-4 shrink-0" />
                        <span>{t("chat.mode.uploadPhoto")}</span>
                      </button>
                      <button
                        onClick={() => {
                          setInputValue(t("chat.sellDescribePrompt"));
                          setShowSellOptions(false);
                          inputRef?.current?.focus?.();
                        }}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                      >
                        <Pencil className="h-4 w-4 shrink-0" />
                        <span>{t("chat.mode.describeItem")}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    "rounded-full flex items-center justify-center shrink-0",
                    isWidget ? "h-7 w-7" : "h-8 w-8",
                    msg.role === "user" ? "bg-muted" : "bg-primary/10"
                  )}
                >
                  {msg.role === "user" ? (
                    <User
                      className={cn(isWidget ? "h-3.5 w-3.5" : "h-4 w-4")}
                    />
                  ) : (
                    <Bot
                      className={cn(isWidget ? "h-3.5 w-3.5" : "h-4 w-4")}
                    />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg p-3 text-sm",
                    isWidget ? "max-w-[80%]" : "max-w-[70%]",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.image && (
                    <Image
                      src={msg.image}
                      alt="Uploaded"
                      width={isWidget ? 120 : 200}
                      height={isWidget ? 120 : 200}
                      className="rounded-md mb-2"
                    />
                  )}
                  {/* Skeleton typing indicator for empty streaming assistant messages */}
                  {msg.role === "assistant" && !msg.text && !msg.intentPicker && isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={streamingStatus || "thinking"}
                          className="text-muted-foreground"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {streamingStatus || (locale === "ar" ? "جاري التفكير..." : "Thinking...")}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  ) : msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 last:mb-0">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 last:mb-0">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        h1: ({ children }) => <h1 className="text-base font-bold mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
                        code: ({ children }) => <code className="bg-background/50 rounded px-1 py-0.5 text-xs">{children}</code>,
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
              {/* Intent Picker (buy or sell?) */}
              {msg.intentPicker && (
                <div
                  className={cn(
                    "mt-3 space-y-2",
                    isWidget ? "ml-9" : "ml-10"
                  )}
                >
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() =>
                        handleIntentBuy(msg.intentPicker!.imageUrl, msg.id)
                      }
                      disabled={isLoading}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {locale === "ar" ? "البحث عن مشابه" : "Find similar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() =>
                        handleIntentSell(
                          msg.intentPicker!.imageUrl,
                          msg.intentPicker!.previewUrl,
                          msg.id
                        )
                      }
                      disabled={isLoading}
                    >
                      <Store className="h-4 w-4" />
                      {locale === "ar" ? "بيع هذا المنتج" : "Sell this item"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Product cards (buy flow) — max 3 inline */}
              {msg.products && msg.products.length > 0 && (
                <div
                  className={cn(
                    "mt-2 space-y-2",
                    isWidget ? "ml-9" : "ml-10"
                  )}
                >
                  {msg.products.slice(0, 3).map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.25, ease: "easeOut" }}
                    >
                      <ProductCard
                        product={p}
                        locale={msg.contentLanguage || locale}
                        t={t}
                        onViewDetails={() => { setSelectedProduct(p); setProductContentLanguage(msg.contentLanguage || null); }}
                      />
                    </motion.div>
                  ))}
                  {msg.products.length > 3 && (
                    <button
                      onClick={() => { setOverlayProducts(msg.products!); setProductContentLanguage(msg.contentLanguage || null); }}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      {locale === "ar"
                        ? `عرض جميع النتائج (${msg.products.length})`
                        : `See all ${msg.products.length} results`}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Listing Draft Card (sell flow) */}
              {msg.draft && (
                <motion.div
                  className={cn(
                    "mt-3",
                    isWidget ? "ml-9" : "ml-10"
                  )}
                  initial={{ opacity: 0, scale: 0.97, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <ListingDraftCard
                    draft={msg.draft}
                    onUpdate={(updated) => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === msg.id ? { ...m, draft: updated } : m
                        )
                      );
                    }}
                    onPublish={() => handlePublish(msg.draft!, msg.id)}
                    onAddImage={(file) => handleAddImageToDraft(file, msg.id)}
                    isPublishing={isPublishing}
                    t={t}
                    locale={msg.contentLanguage || locale}
                  />
                </motion.div>
              )}

              {/* Published success (sell flow) */}
              {msg.published && (
                <div
                  className={cn(
                    "mt-3",
                    isWidget ? "ml-9" : "ml-10"
                  )}
                >
                  <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">
                        {locale === "ar"
                          ? "تم نشر إعلانك!"
                          : "Listing published!"}
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

          {/* No separate loading indicator needed — skeleton is inline in the streaming message bubble */}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div
        className={cn(
          "border-t bg-background",
          isWidget ? "p-2.5" : "p-4"
        )}
      >
        <div className={cn("mx-auto", isWidget ? "max-w-full" : "max-w-2xl")}>
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
                &times;
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 items-center"
          >
            {/* Gallery pick */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => handleImageButtonClick(fileInputRef)}
              disabled={isLoading}
              title={t("chat.imageSearch")}
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

            {/* Camera capture */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => handleImageButtonClick(cameraInputRef)}
              disabled={isLoading}
              title={t("chat.camera")}
            >
              <Camera className="h-5 w-5" />
            </Button>
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleImageChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {/* Text input */}
            <Input
              ref={inputRef}
              placeholder={t("chat.placeholder")}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />

            {/* Voice - now on right side of input */}
            <VoiceButton
              onTranscript={handleVoiceTranscript}
              disabled={isLoading}
            />

            {/* Send */}
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

      {/* Products Overlay — covers chat area when "See more" is clicked */}
      {overlayProducts && (
        <div className="absolute inset-0 z-20 bg-background flex flex-col">
          {/* Overlay header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold text-base">
              {locale === "ar"
                ? `${overlayProducts.length} نتيجة`
                : `${overlayProducts.length} results`}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOverlayProducts(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {/* Overlay body — scrollable list of all products */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2 max-w-2xl mx-auto">
              {overlayProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  locale={productContentLanguage || locale}
                  t={t}
                  onViewDetails={() => setSelectedProduct(p)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) setSelectedProduct(null);
        }}
        locale={productContentLanguage || locale}
        t={t}
      />

      {/* Seller Profile Required Dialog */}
      <Dialog open={showSellerProfileModal} onOpenChange={setShowSellerProfileModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            {t("seller.profileRequired" as TranslationKey)}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("seller.profileRequiredDesc" as TranslationKey)}
          </p>
          <div className="flex gap-3 mt-2">
            <Button
              className="flex-1"
              onClick={() => {
                setShowSellerProfileModal(false);
                appModeCtx?.setCurrentView("settings");
              }}
            >
              {t("seller.goToProfile" as TranslationKey)}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowSellerProfileModal(false)}>
              {t("seller.dismiss" as TranslationKey)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Required Dialog - shown when unauthenticated user tries to upload image or sell */}
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            {locale === "ar" ? "تسجيل الدخول مطلوب" : "Login Required"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {locale === "ar"
              ? "يرجى تسجيل الدخول أو إنشاء حساب للمتابعة."
              : "Please log in or create an account to continue."}
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

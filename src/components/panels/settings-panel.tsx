"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useAppMode } from "@/context/app-mode-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  ArrowLeft,
  User,
  Phone,
  Globe,
  LogOut,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/translations";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  countryCode: string;
  preferredLanguage: string;
  avatarUrl?: string;
  role: string;
  createdAt: string;
}

interface SellerProfile {
  phonePublic?: string;
  isProfileComplete?: boolean;
}

export function SettingsPanel() {
  const { user, signOut } = useAuth();
  const { t, locale } = useLanguage();
  const { setCurrentView } = useAppMode();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, sellerRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/seller/profile"),
      ]);

      let userPhone = "";
      if (meRes.ok) {
        const data = await meRes.json();
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || "");
          userPhone = data.user.phone || "";
        }
      }

      if (sellerRes.ok) {
        const data = await sellerRes.json();
        if (data.profile) {
          setSellerProfile(data.profile);
          setPhone(userPhone || data.profile.phonePublic || "");
        } else {
          setPhone(userPhone);
        }
      } else {
        setPhone(userPhone);
      }
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Save name + phone — syncs phone to seller.phonePublic & whatsappNumber
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await Promise.all([
        fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone }),
        }),
        fetch("/api/seller/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phonePublic: phone,
            whatsappNumber: phone,
          }),
        }),
      ]);
      await fetchAll();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {t("sell.loginRequired" as TranslationKey)}
        </h2>
        <Button onClick={() => setCurrentView("chat")} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("settings.backToChat" as TranslationKey)}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView("chat")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">
          {t("sidebar.settings" as TranslationKey)}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-lg mx-auto space-y-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ── Profile Section ── */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {(profile?.name || profile?.email || "U")
                        .substring(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {profile?.name || profile?.email}
                      </h2>
                      {sellerProfile !== null && (
                        sellerProfile.isProfileComplete ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="h-3 w-3" />
                            {t("settings.profileComplete" as TranslationKey)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full shrink-0">
                            <AlertCircle className="h-3 w-3" />
                            {t("settings.profileIncomplete" as TranslationKey)}
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("settings.name" as TranslationKey)}
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("settings.namePlaceholder" as TranslationKey)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("settings.phone" as TranslationKey)}
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+965 XXXX XXXX"
                      type="tel"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2 mb-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("settings.language" as TranslationKey)}
                    </label>
                    <div className="flex items-center gap-2">
                      <LanguageSwitcher />
                      <span className="text-sm text-muted-foreground">
                        {locale === "ar" ? "العربية" : "English"}
                      </span>
                    </div>
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />{t("dashboard.saving" as TranslationKey)}</>
                    ) : saved ? (
                      <><Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />{t("settings.saved" as TranslationKey)}</>
                    ) : (
                      <><Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />{t("dashboard.save" as TranslationKey)}</>
                    )}
                  </Button>
                </div>
              </div>

              {/* ── Sign out ── */}
              <div className="border-t pt-6">
                <Button
                  variant="outline"
                  onClick={() => signOut()}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("nav.logout" as TranslationKey)}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

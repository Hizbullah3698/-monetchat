"use client";

import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  const toggle = () => {
    setLocale(locale === "en" ? "ar" : "en");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="gap-1.5 text-sm font-medium"
      title={locale === "en" ? "Switch to Arabic" : "Switch to English"}
    >
      <Globe className="h-4 w-4" />
      <span>{locale === "en" ? "عربي" : "EN"}</span>
    </Button>
  );
}

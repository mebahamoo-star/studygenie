import React from "react";
import { statsConfig } from "./stats-config";
import { LandingTranslations } from "./i18n/types";

interface StatsBarProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function StatsBar({ t, lang }: StatsBarProps) {
  // If disabled in config (default), render nothing to comply with strict requirement
  // forbidding fake or made-up numbers.
  if (!statsConfig.enabled) {
    return null;
  }

  return (
    <section
      aria-label={t.stats.title}
      className="relative z-10 mx-auto max-w-6xl px-6 py-8"
    >
      <div className="rounded-3xl border border-border/80 bg-card/80 p-6 md:p-8 backdrop-blur-md shadow-soft">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:divide-x md:divide-border/60 rtl:md:divide-x-reverse">
          {statsConfig.items.map((item) => (
            <div key={item.id} className="text-center px-4">
              <span className="text-3xl sm:text-4xl font-extrabold text-foreground font-display tracking-tight text-gradient-magic">
                {item.value}
              </span>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                {lang === "ar" ? item.labelAr : item.labelEn}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

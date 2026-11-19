import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { HelpCircle, ChevronDown, ShieldCheck, AlertCircle } from "lucide-react";
import { LandingTranslations } from "./i18n/types";

interface FaqSectionProps {
  t: LandingTranslations;
  lang: "ar" | "en";
}

export function FaqSection({ t, lang }: FaqSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [openId, setOpenId] = useState<string | null>("is-free");

  const toggleQuestion = (id: string) => {
    setOpenId((curr) => (curr === id ? null : id));
  };

  return (
    <section className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
          <HelpCircle className="h-3.5 w-3.5 text-primary" />
          <span>{t.faq.badge}</span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground font-display">
          {t.faq.title}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t.faq.subtitle}
        </p>
      </div>

      {/* Accordion Questions */}
      <div className="space-y-3.5">
        {t.faq.questions.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden text-start ${
                isOpen
                  ? "border-primary/50 bg-card shadow-soft"
                  : "border-border/70 bg-card/70 hover:border-border hover:bg-card/90"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleQuestion(item.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between p-5 text-start font-bold text-sm sm:text-base text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="pe-4">{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={shouldReduceMotion ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={shouldReduceMotion ? { opacity: 0, height: "auto" } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 mt-1">
                      
                      {/* Standard answer */}
                      <p>{item.answer}</p>

                      {/* 
                        TODO: [PRIVACY POLICY COMPLIANCE]
                        Replace this temporary privacy placeholder with official institutional data retention,
                        encryption-at-rest, and file deletion terms once finalized by legal/security team.
                        DO NOT fabricate retention periods or third-party sharing policies.
                      */}
                      {item.isPrivacy && (
                        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                          <div>
                            <span className="font-bold">TODO (ملاحظة خصوصية مؤقتة):</span> سيتم نشر وثيقة الخصوصية وسياسة الاحتفاظ بالملفات الرسمية بعد اعتمادها قانونياً. بياناتك لا تباع ولا تستخدم للإعلانات.
                          </div>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

    </section>
  );
}

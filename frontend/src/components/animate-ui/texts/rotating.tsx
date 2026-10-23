import React, { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface RotatingTextContextType {
  currentText: string;
  y: number;
}

const RotatingTextContext = createContext<RotatingTextContextType | null>(null);

export interface RotatingTextContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  text: string | string[];
  duration?: number;
  y?: number;
  delay?: number;
  align?: "none" | "start" | "center" | "end";
  children: React.ReactNode;
}

export function RotatingTextContainer({
  text,
  y = -50,
  duration = 2000,
  delay = 0,
  align = "start",
  className,
  style,
  children,
  ...props
}: RotatingTextContainerProps) {
  const texts = Array.isArray(text) ? text : [text];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (texts.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % texts.length);
    }, duration);
    return () => clearInterval(interval);
  }, [texts.length, duration]);

  const currentText = texts[index] || "";

  return (
    <RotatingTextContext.Provider value={{ currentText, y }}>
      <div
        className={className}
        style={{
          display: "inline-block",
          overflow: "hidden",
          verticalAlign: "bottom",
          ...style,
        }}
        {...props}
      >
        {align && align !== "none" ? (
          <div
            style={{
              display: "grid",
              justifyItems: align,
              alignItems: "baseline",
            }}
          >
            {/* Ghost placeholder so container width matches the widest text without layout jitter */}
            {[...new Set(texts)].map((item) => (
              <span
                key={item}
                aria-hidden="true"
                style={{
                  gridArea: "1 / 1",
                  visibility: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {item}
              </span>
            ))}
            <div style={{ gridArea: "1 / 1", whiteSpace: "nowrap" }}>
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </RotatingTextContext.Provider>
  );
}

export function RotatingText() {
  const context = useContext(RotatingTextContext);
  if (!context) {
    throw new Error("RotatingText must be used inside RotatingTextContainer");
  }

  const { currentText, y } = context;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={currentText}
        initial={{ opacity: 0, y: -y }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ display: "inline-block" }}
      >
        {currentText}
      </motion.span>
    </AnimatePresence>
  );
}

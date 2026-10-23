"use client";

import * as React from "react";
import { animate, useInView } from "framer-motion";

export interface CountingNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  number: number;
  fromNumber?: number;
  padStart?: boolean;
  decimalSeparator?: string;
  decimalPlaces?: number;
  thousandSeparator?: string;
  delay?: number;
  duration?: number;
  inView?: boolean;
  inViewOnce?: boolean;
}

export function CountingNumber({
  number,
  fromNumber = 0,
  padStart = false,
  decimalSeparator = ".",
  decimalPlaces = 0,
  thousandSeparator,
  delay = 0,
  duration = 1.2,
  inView = false,
  inViewOnce = true,
  className,
  ...props
}: CountingNumberProps) {
  const spanRef = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(spanRef, { once: inViewOnce });

  const formatNumber = React.useCallback(
    (value: number) => {
      const fixed = Math.abs(value).toFixed(decimalPlaces);
      const sign = value < 0 && Number(fixed) !== 0 ? "-" : "";
      const [intPart = "0", fracPart] = fixed.split(".");
      const padLength = padStart ? Math.floor(Math.abs(number)).toString().length : 0;
      const padded = intPart.padStart(padLength, "0");
      const paddedInt =
        thousandSeparator === undefined
          ? padded
          : padded.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
      return fracPart
        ? `${sign}${paddedInt}${decimalSeparator}${fracPart}`
        : `${sign}${paddedInt}`;
    },
    [decimalPlaces, padStart, number, thousandSeparator, decimalSeparator]
  );

  React.useEffect(() => {
    if (inView && !isInView) return;

    // Support both second-based delay (e.g. 0.5) and ms-based delay (e.g. 500)
    const delayMs = delay > 0 && delay < 10 ? delay * 1000 : delay;

    let controls: { stop: () => void } | null = null;
    const timeout = setTimeout(() => {
      controls = animate(fromNumber, number, {
        duration,
        ease: [0.16, 1, 0.3, 1], // easeOutExpo
        onUpdate: (latest) => {
          if (spanRef.current) {
            spanRef.current.textContent = formatNumber(latest);
          }
        },
      });
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      if (controls) controls.stop();
    };
  }, [number, fromNumber, duration, delay, inView, isInView, formatNumber]);

  return (
    <span
      ref={spanRef}
      className={className}
      {...props}
    >
      {formatNumber(fromNumber)}
    </span>
  );
}

export default CountingNumber;

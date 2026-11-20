import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X, ZoomIn } from "lucide-react";

export interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onApply: (croppedDataUrl: string) => void;
  onClose: () => void;
}

export function AvatarCropModal({
  isOpen,
  imageSrc,
  onApply,
  onClose,
}: AvatarCropModalProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.15);

  useEffect(() => {
    if (!isOpen || !imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageObjRef.current = img;
      drawCanvas(img, zoom);
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc]);

  useEffect(() => {
    if (isOpen && imageObjRef.current) {
      drawCanvas(imageObjRef.current, zoom);
    }
  }, [zoom, isOpen]);

  const drawCanvas = (img: HTMLImageElement, scale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 240;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    const minDim = Math.min(img.width, img.height);
    const cropSize = minDim / scale;
    const sx = (img.width - cropSize) / 2;
    const sy = (img.height - cropSize) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, size, size);
    ctx.restore();
  };

  if (!isOpen || !imageSrc) return null;

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png", 0.92);
    onApply(dataUrl);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("profile.cropModalTitle")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[16px] border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            {t("profile.cropModalTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("page.close")}
            className="rounded-[8px] p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-5 flex flex-col items-center gap-4">
          <div className="rounded-full border-4 border-indigo-50 p-1 shadow-sm">
            <canvas
              ref={canvasRef}
              width={240}
              height={240}
              className="h-44 w-44 rounded-full bg-slate-100"
            />
          </div>

          <div className="flex w-full items-center gap-3 px-2">
            <ZoomIn className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              aria-label={t("profile.cropZoom")}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-indigo-600"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            {t("page.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-[12px] bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{t("profile.applyCrop")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

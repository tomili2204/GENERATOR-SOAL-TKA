"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";

interface SvgIllustrationProps {
  svgContent: string | null | undefined;
  altText?: string;
  className?: string;
}

/**
 * Render tunggal & konsisten untuk diagram SVG mandiri yang dihasilkan AI atau diketik manual.
 * Dipakai di validator, pembuat soal, dan admin agar diagram selalu tampil utuh (responsif,
 * tanpa terpotong/scroll paksa) dan sudah disanitasi sebelum di-inject ke DOM.
 */
export function SvgIllustration({ svgContent, altText, className = "" }: SvgIllustrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // undefined = belum diproses (loading), null = gagal/tidak valid, string = siap ditampilkan
  const [sanitized, setSanitized] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setSanitized(undefined);

    if (!svgContent || !svgContent.trim().toLowerCase().startsWith("<svg")) {
      setSanitized(null);
      return;
    }

    import("dompurify").then(({ default: DOMPurify }) => {
      if (cancelled) return;

      const stripDisallowedHref = (_node: Element, data: { attrName: string; attrValue: string; keepAttr: boolean }) => {
        if (
          (data.attrName === "href" || data.attrName === "xlink:href") &&
          data.attrValue &&
          !data.attrValue.startsWith("#")
        ) {
          data.keepAttr = false;
        }
      };

      DOMPurify.addHook("uponSanitizeAttribute", stripDisallowedHref as any);
      const clean = DOMPurify.sanitize(svgContent, {
        USE_PROFILES: { svg: true, svgFilters: true },
        FORBID_TAGS: ["foreignObject", "script"],
      });
      DOMPurify.removeHook("uponSanitizeAttribute");

      setSanitized(clean.trim().toLowerCase().startsWith("<svg") ? clean : null);
    });

    return () => {
      cancelled = true;
    };
  }, [svgContent]);

  useEffect(() => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (svgEl) {
      svgEl.removeAttribute("height");
      svgEl.setAttribute("width", "100%");
      svgEl.style.height = "auto";
      svgEl.style.maxHeight = "440px";
      svgEl.style.display = "block";
      svgEl.style.margin = "0 auto";
    }
  }, [sanitized]);

  if (sanitized === undefined) {
    return <div className="h-16 w-full max-w-xl mx-auto animate-pulse rounded-lg bg-slate-100" />;
  }

  if (sanitized === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-slate-400">
        <ImageOff className="w-6 h-6" />
        <span className="text-xs font-mono">Ilustrasi tidak dapat ditampilkan</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-xl mx-auto flex justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
      role="img"
      aria-label={altText || "Ilustrasi soal"}
    />
  );
}

export default SvgIllustration;

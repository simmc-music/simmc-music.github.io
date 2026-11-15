"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { coverLines, coverPalette, coverTypography, type CoverKind } from "@/lib/cover-placeholder";
import "./cover-image.css";

type SizeListener = (width: number, height: number) => void;
const sizeListeners = new Map<Element, SizeListener>();
let observer: ResizeObserver | undefined;
let measurementContext: CanvasRenderingContext2D | null | undefined;
const textWidths = new Map<string, number>();

function measureLine(line: string, font: string) {
  const key = `${font}\n${line}`;
  const cached = textWidths.get(key);
  if (cached !== undefined) return cached;
  if (measurementContext === undefined) measurementContext = document.createElement("canvas").getContext("2d");
  if (!measurementContext) return Array.from(line).length;
  measurementContext.font = font;
  const width = measurementContext.measureText(line).width / 100;
  if (textWidths.size >= 512) textWidths.clear();
  textWidths.set(key, width);
  return width;
}

function observeSize(element: Element, listener: SizeListener) {
  if (typeof ResizeObserver !== "undefined") {
    observer ??= new ResizeObserver(entries => {
      for (const entry of entries) sizeListeners.get(entry.target)?.(entry.contentRect.width, entry.contentRect.height);
    });
    sizeListeners.set(element, listener);
    observer.observe(element);
    return () => {
      sizeListeners.delete(element);
      observer?.unobserve(element);
      if (!sizeListeners.size) { observer?.disconnect(); observer = undefined; }
    };
  }
  const update = () => { const box = element.getBoundingClientRect(); listener(box.width, box.height); };
  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}

export type CoverImageProps = {
  src?: string | null;
  name: string;
  identity: string;
  kind: CoverKind;
  className?: string;
  loading?: "lazy" | "eager";
};

export function CoverImage({ src, name, identity, kind, className = "", loading }: CoverImageProps) {
  return <CoverImageContent key={src || ""} src={src} name={name} identity={identity} kind={kind} className={className} loading={loading} />;
}

function CoverImageContent({ src, name, identity, kind, className, loading }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number>();
  const palette = coverPalette(identity || name, kind);
  const typography = coverTypography(identity || name, kind);
  const lines = useMemo(() => coverLines(name, kind), [name, kind]);
  const [fittedLines, setFittedLines] = useState(lines);
  const placeholder = !src || failed;

  useEffect(() => {
    if (!placeholder || kind === "avatar" || !root.current) return;
    // One shared observer and a bounded metrics cache cover all cards. No image is generated.
    const font = `${typography.weight} 100px ${typography.family}`;
    return observeSize(root.current, (width, height) => {
      if (!width || !height) return;
      const nominal = kind === "song" ? 28 : 32;
      const arranged = lines.flatMap(line => {
        if (/\s|[\p{Script=Han}]/u.test(line) || Array.from(line).length <= 10 || measureLine(line, font) * nominal <= width * .82) return [line];
        const parts: string[] = []; let part = "";
        for (const letter of Array.from(line)) {
          if (part && measureLine(part + letter, font) * nominal > width * .82) { parts.push(part); part = ""; }
          part += letter;
        }
        if (part) parts.push(part);
        return parts;
      }).slice(0, 3);
      setFittedLines(previous => previous.join("\n") === arranged.join("\n") ? previous : arranged);
      const widthInEm = Math.max(...arranged.map(line => measureLine(line, font)), 1);
      const fitted = Math.min(width * .82 / widthInEm, height * .78 / (arranged.length * 1.18), 44, width * .28, height * .36);
      const next = Math.max(1, Math.floor(fitted * (kind === "song" ? .8 : 1) * 2) / 2);
      setFontSize(previous => previous === next ? previous : next);
    });
  }, [placeholder, kind, lines, typography.family, typography.weight]);

  return <span
    ref={root}
    className={`cover-image cover-image--${kind} ${className || ""}`}
    style={{ backgroundColor: palette.background, color: palette.foreground }}
    data-cover-font={typography.key}
    role="img"
    aria-label={`${name || "未命名"}${kind === "avatar" ? "的头像" : "的封面"}`}
  >
    {src && !failed
      ? <img className="cover-image__photo" src={src} alt="" aria-hidden="true" loading={loading ?? (kind === "avatar" ? "eager" : "lazy")} decoding="async" onError={() => setFailed(true)} />
      : <span className="cover-image__text" aria-hidden="true" style={{fontFamily: typography.family, fontWeight: typography.weight, fontSize: kind === "avatar" ? undefined : fontSize}}>
        {(kind === "avatar" ? lines : fittedLines).map((line, index) => <span className="cover-image__line" key={index}>{line}</span>)}
      </span>}
  </span>;
}

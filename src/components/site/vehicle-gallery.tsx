"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function VehicleGallery({ images, title }: { images: { url: string; alt: string | null }[]; title: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-ink font-display text-3xl text-gold-light/60">{title}</div>
    );
  }
  const go = (d: number) => setI((x) => (x + d + images.length) % images.length);
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
        <Image key={images[i].url} src={images[i].url} alt={images[i].alt ?? title} fill priority sizes="(min-width: 1024px) 60vw, 100vw" className="animate-in fade-in object-cover duration-500" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Image précédente" className="absolute top-1/2 left-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur hover:bg-ink">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Image suivante" className="absolute top-1/2 right-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur hover:bg-ink">
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/70 px-3 py-1 text-xs text-white">
              {i + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, idx) => (
            <button
              key={img.url + idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Afficher l'image ${idx + 1}`}
              className={cn("relative aspect-[4/3] overflow-hidden rounded-lg ring-2 ring-transparent", idx === i && "ring-gold")}
            >
              <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

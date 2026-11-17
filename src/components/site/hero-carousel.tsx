"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function HeroCarousel({ images }: { images: { src: string; alt: string }[] }) {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || images.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % images.length), 6500);
    return () => clearInterval(t);
  }, [images.length, reduce]);

  return (
    <div className="absolute inset-0 -z-10">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.4 }, scale: { duration: 7, ease: "linear" } }}
        >
          <Image src={images[index].src} alt={images[index].alt} fill priority={index === 0} sizes="100vw" className="object-cover" />
        </motion.div>
      </AnimatePresence>
      {images.length > 1 && (
        <div className="absolute right-5 bottom-8 z-10 flex gap-2 md:right-10">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Afficher l'image ${i + 1}`}
              aria-current={i === index}
              className={`h-1 rounded-full transition-all ${i === index ? "w-10 bg-gold" : "w-5 bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

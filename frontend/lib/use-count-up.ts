"use client";

import { useEffect, useRef, useState } from "react";

// Fait défiler un nombre de sa valeur affichée vers `target` au lieu de sauter —
// requestAnimationFrame natif, aucune dépendance JS d'animation (évite les soucis
// rencontrés avec framer-motion dans cet environnement). `displayRef` suit la valeur
// réellement à l'écran à chaque frame : si `target` change avant la fin d'un défilement,
// le suivant reprend depuis là où l'affichage en est, sans saut.
export function useCountUp(target: number, durationMs = 500): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    const from = displayRef.current;
    const to = target;
    if (from === to) return;

    let frame: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + (to - from) * eased;
      displayRef.current = value;
      setDisplay(value);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return display;
}

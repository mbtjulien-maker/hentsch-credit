"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const ROTATE_INTERVAL_MS = 3000;

// Bandeau façon carrousel publicitaire en tête de la vitrine (retour client : faire
// alterner le hero crédit gagé et le hero investissement direct plutôt que les empiler
// l'un sous l'autre) — les deux <section> passées en `slides` restent identiques à ce
// qu'elles étaient (JSX rendu tel quel par la page serveur, chaînes déjà traduites côté
// serveur), seul l'affichage devient alterné. Empilement par CSS Grid (les deux slides
// posées sur la même cellule col-start-1/row-start-1) : la hauteur du conteneur suit
// naturellement la plus grande des deux sans avoir à mesurer quoi que ce soit en JS.
// En pause au survol (même principe que .ticker-track, cf. MarketView) ; désactivé sous
// prefers-reduced-motion (première slide fixe, jamais de mouvement forcé). `inert` sur
// la/les slides non actives : contrairement à pointer-events-none seul, ça retire aussi
// leurs liens du focus clavier, pour qu'un slide invisible ne soit jamais atteignable.
export function HeroCarousel({ slides }: { slides: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotionRef.current || slides.length <= 1) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  if (slides.length <= 1) {
    return <>{slides[0] ?? null}</>;
  }

  // bg-slate-950 sur le conteneur — c'est le ton le plus sombre commun aux deux hero
  // (fond du hero crédit, extrémité du dégradé du hero investissement) : sans lui, le
  // fond clair de la page passait à travers pendant les ~700ms où les deux slides sont
  // simultanément semi-transparentes (le fondu croisé se fait par opacité, jamais par un
  // slide qui recouvre totalement l'autre) — perçu comme "le fond qui disparaît" au
  // moment du switch. Avec ce fond posé derrière, plus aucun flash pendant la transition.
  return (
    <div
      className="relative isolate bg-slate-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`col-start-1 row-start-1 transition-opacity duration-700 ease-in-out ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== active}
            inert={index !== active ? true : undefined}
          >
            {slide}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2 sm:bottom-6">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`${index + 1}/${slides.length}`}
            aria-current={index === active}
            className={`pointer-events-auto h-2 rounded-full transition-all duration-300 ${
              index === active ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

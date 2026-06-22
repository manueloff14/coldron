"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { label: "Mapa", id: "map" },
  { label: "Detalle", id: "details" },
  { label: "Eventos", id: "timeline" },
];
const TAB_W = 96; // ancho fijo por pestaña (px)

export default function HeaderCenter() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const current = hovered ?? active;

  // scroll nativo: la seccion activa = scrollTop / altura de pantalla
  // (todas las secciones miden exactamente 100vh, asi que es exacto)
  useEffect(() => {
    const first = document.getElementById(SECTIONS[0].id);
    const scroller = first?.parentElement; // <main> (contenedor con scroll)
    if (!scroller) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const i = Math.round(scroller.scrollTop / scroller.clientHeight);
        setActive(Math.max(0, Math.min(SECTIONS.length - 1, i)));
      });
    };

    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, []);

  function goTo(i: number) {
    document
      .getElementById(SECTIONS[i].id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pointer-events-auto hidden basis-1/3 items-center justify-center sm:flex">
      <nav
        className="relative flex items-center rounded-full p-1 text-sm"
        onMouseLeave={() => setHovered(null)}
      >
        {/* Pildora roja que se arrastra */}
        <span
          className="absolute left-1 top-1 bottom-1 rounded-full bg-red-500/90 transition-transform duration-300 ease-out"
          style={{ width: TAB_W, transform: `translateX(${current * TAB_W}px)` }}
        />
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onMouseEnter={() => setHovered(i)}
            onClick={() => goTo(i)}
            style={{ width: TAB_W }}
            className={`relative z-10 cursor-pointer py-1.5 font-medium transition-colors ${
              current === i ? "text-white" : "text-zinc-300 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

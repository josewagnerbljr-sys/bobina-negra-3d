import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: "1em",
  height: "1em",
  ...p,
});

export const ArrowLeft = (p: P) => (
  <svg {...base(p)}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
export const ArrowRight = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);
export const ArrowUp = (p: P) => (
  <svg {...base(p)}><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
export const ArrowDown = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
);
export const Heart = (p: P) => (
  <svg {...base(p)}><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" /></svg>
);
export const Pause = (p: P) => (
  <svg {...base(p)}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);
export const Volume2 = (p: P) => (
  <svg {...base(p)}><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>
);
export const VolumeX = (p: P) => (
  <svg {...base(p)}><path d="M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6" /></svg>
);

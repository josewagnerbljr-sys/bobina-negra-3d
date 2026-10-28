import { useId, type ReactNode } from "react";
import { RARITY_COLOR, baseOf } from "../game/items";
import type { Item } from "../game/types";

/** miniaturas dos itens em SVG: cada família de objeto tem silhueta, gradiente e brilho próprios */

const DARK = "#140a10";

function rgb(c: string): [number, number, number] {
  const h = c.replace("#", "");
  const f = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(c: string, to: string, k: number) {
  const a = rgb(c);
  const b = rgb(to);
  const m = a.map((v, i) => Math.round(v + (b[i]! - v) * k));
  return "#" + m.map((v) => v.toString(16).padStart(2, "0")).join("");
}
const light = (c: string, k = 0.45) => mixHex(c, "#ffffff", k);
const dark = (c: string, k = 0.45) => mixHex(c, "#000000", k);

type Ctx = { c: string; a: string; g: (n: string) => string; rarity: number };

/** ponta de brilho de 4 raios */
function Spark({ x, y, s = 2.2, f = "#fff" }: { x: number; y: number; s?: number; f?: string }) {
  return <path d={`M${x} ${y - s}L${x + s * 0.28} ${y - s * 0.28}L${x + s} ${y}L${x + s * 0.28} ${y + s * 0.28}L${x} ${y + s}L${x - s * 0.28} ${y + s * 0.28}L${x - s} ${y}L${x - s * 0.28} ${y - s * 0.28}Z`} fill={f} />;
}

const S = { stroke: DARK, strokeWidth: 1.3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function shape(fam: string, id: string, x: Ctx): ReactNode {
  const { c, a, g } = x;
  const steel = g("steel");
  const wood = g("wood");
  const gold = g("gold");
  const main = g("main");
  const acc = g("acc");
  switch (fam) {
    case "flask":
      return (
        <g {...S}>
          <rect x="13" y="3" width="6" height="4" rx="1" fill={wood} />
          <path d="M13.5 7h5v5.5L25 22a5 5 0 0 1-4.3 7.5h-9.4A5 5 0 0 1 7 22l6.5-9.5z" fill="#dfeaf4" fillOpacity=".55" />
          <path d="M9.6 19.5h12.8l2.4 3.5a4 4 0 0 1-3.5 5.5h-10.6a4 4 0 0 1-3.5-5.5z" fill={main} />
          <path d="M11 22c2-1 8-1 10 0" stroke="#fff8" fill="none" strokeWidth="1" />
          <circle cx="13" cy="25" r="1.4" fill="#fffa" stroke="none" />
          {id === "pot_royal" && <path d="M12 5l1.5 1.5L16 4.5l2.5 2L20 5" stroke={a} fill="none" />}
          {id === "pot3" && <circle cx="19" cy="25.5" r="1" fill="#fff9" stroke="none" />}
        </g>
      );
    case "bottle":
      return (
        <g {...S}>
          <rect x="13.2" y="2.5" width="5.6" height="3.5" rx="1" fill={wood} />
          <path d="M14 6h4v4.5c4 1.5 6.5 4.5 6.5 9.5a8 8 0 0 1-8 8h-1a8 8 0 0 1-8-8c0-5 2.5-8 6.5-9.5z" fill="#dfeaf4" fillOpacity=".5" />
          <path d="M8.3 19c3-1.6 12-1.6 15.4 0a8 8 0 0 1-7.7 8.8 8 8 0 0 1-7.7-8.8z" fill={main} />
          <path d="M16 13.5v-1" stroke="#fff8" />
          <path d={id === "elx_haste" || id === "elx_swift" ? "M13 22l4-3.5v2.2l3-2.7-3.6 5.8v-2z" : id === "elx_fury" || id === "elx_rage" ? "M16 17.5c2 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1-3 1 1 2 1 2-2z" : id === "elx_ward" || id === "elx_aegis" ? "M16 17l4 1.5v3c0 2-2 3.4-4 4.5-2-1.100-4-2.500-4-4.500v-3z" : "M16 17.5l1.200 2.500 2.800.4-2 2 .5 2.800-2.500-1.300-2.500 1.300.5-2.800-2-2 2.800-.4z"} fill="#fffc" stroke="none" />
          <circle cx="11.5" cy="16" r="1.2" fill="#fff9" stroke="none" />
        </g>
      );
    case "bread":
      return (
        <g {...S}>
          <path d="M5 20c0-6 5-10 11-10s11 4 11 10c0 3-2 5-5 5H10c-3 0-5-2-5-5z" fill="#d9a050" />
          <path d="M5 20c0-6 5-10 11-10s11 4 11 10" fill="#f0c070" stroke="none" opacity=".5" />
          <path d="M10 14l3 4M15 12l3 5M20 13l3 4" stroke="#8a5a28" fill="none" strokeWidth="1.4" />
          <path d="M9 22h14" stroke="#fff6" fill="none" />
        </g>
      );
    case "scroll":
      return (
        <g {...S}>
          <rect x="6" y="6" width="20" height="21" rx="2" fill="#f0e2bc" />
          <path d="M6 8c0-3 4-3 4 0s-4 3-4 0zM22 25c0-3 4-3 4 0s-4 3-4 0z" fill="#d9c694" />
          <path d="M10 11h12M10 14.5h12M10 18h8" stroke="#8a7a52" fill="none" strokeWidth="1" />
          <circle cx="21" cy="22" r="3.4" fill={main} />
          <path d="M19.400 22l1.200 1.200 2-2.400" stroke="#fff" fill="none" />
        </g>
      );
    case "knife":
      return (
        <g {...S} transform="rotate(45 16 16)">
          <path d="M16 3l3.600 14h-7.200z" fill={id === "dagger_bone" ? main : steel} />
          <path d="M16 4v12" stroke="#fffb" fill="none" strokeWidth="1" />
          <rect x="11" y="17" width="10" height="2.600" rx="1.200" fill={gold} />
          <rect x="14" y="19.500" width="4" height="7" rx="1.500" fill={wood} />
          <circle cx="16" cy="27.500" r="1.800" fill={main} />
        </g>
      );
    case "claws":
      return (
        <g {...S}>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${9 + i * 6} 28C${6 + i * 6} 18 ${8 + i * 6} 9 ${14 + i * 5} 4c0 8-1 16-${i === 1 ? 1 : 0} 24z`} fill={steel} />
          ))}
          <rect x="6" y="24" width="20" height="4" rx="2" fill={wood} />
          <rect x="6" y="24" width="20" height="1.600" rx="0.8" fill={a} stroke="none" />
        </g>
      );
    case "wand":
      return (
        <g {...S} transform="rotate(40 16 16)">
          <rect x="14.800" y="9" width="2.400" height="19" rx="1.200" fill={wood} />
          <rect x="14" y="19" width="4" height="1.800" fill={gold} />
          <path d="M16 1.500l2.200 5 5.300.6-4 3.600 1.200 5.200-4.700-2.800-4.700 2.800 1.200-5.200-4-3.600 5.300-.6z" fill={main} />
          <circle cx="16" cy="8.500" r="1.600" fill="#fff" stroke="none" opacity=".8" />
        </g>
      );
    case "sword":
      return (
        <g {...S} transform="rotate(45 16 16)">
          <path d="M16 0.500l3.200 17h-6.400z" fill={steel} />
          <path d="M16 2v15" stroke="#fffb" fill="none" />
          <rect x="8.500" y="17" width="15" height="3.200" rx="1.400" fill={gold} />
          <rect x="14" y="20" width="4" height="6" rx="1.500" fill={wood} />
          <circle cx="16" cy="27.500" r="2.200" fill={main} />
        </g>
      );
    case "foil":
      return (
        <g {...S} transform="rotate(45 16 16)">
          <path d="M16 0.500l1.600 18h-3.200z" fill={steel} />
          <path d="M9 21c0-4 4-4 7-2.600 3-1.400 7-1.400 7 2.600z" fill={gold} />
          <rect x="14.600" y="21" width="2.800" height="6" rx="1.200" fill={wood} />
          <circle cx="16" cy="28" r="1.600" fill={main} />
        </g>
      );
    case "scimitar":
      return (
        <g {...S}>
          <path d="M24 3C25 16 15 21 9 21c6-3 10-8 9-14 1-.5 4-2 6-4z" fill={steel} />
          <path d="M22 5c0 7-4 11-9 14" stroke="#fffc" fill="none" />
          <rect x="6" y="19" width="9" height="3" rx="1.200" fill={gold} transform="rotate(-35 10 20)" />
          <rect x="5" y="22" width="3.200" height="7" rx="1.400" fill={wood} transform="rotate(-35 6 24)" />
        </g>
      );
    case "spear":
      return (
        <g {...S} transform="rotate(40 16 16)">
          <rect x="14.900" y="9" width="2.200" height="22" rx="1" fill={wood} />
          <path d="M16 0.500l4 9-4 2.500-4-2.500z" fill={steel} />
          <path d="M16 2v8" stroke="#fffb" fill="none" />
          <rect x="13" y="12" width="6" height="2" fill={a} />
        </g>
      );
    case "crossbow":
      return (
        <g {...S}>
          <rect x="14.200" y="6" width="3.600" height="22" rx="1.500" fill={wood} />
          <path d="M3 10c6 4 20 4 26 0-2 6-5 8-13 8S5 16 3 10z" fill={a} />
          <path d="M4 11l12 6 12-6" stroke="#f4efe0" fill="none" strokeWidth=".9" />
          <path d="M16 6l-2 4h4z" fill={steel} />
          <rect x="12.500" y="20" width="7" height="2" fill={gold} />
        </g>
      );
    case "bow":
      return (
        <g {...S}>
          <path d="M9 3c15 5 15 21 0 26" stroke={DARK} strokeWidth="4.200" fill="none" />
          <path d="M9 3c15 5 15 21 0 26" stroke={id === "longbow" ? a : "#a06a3a"} strokeWidth="2.600" fill="none" />
          <path d="M9 3v26" stroke="#f4f0e0" strokeWidth=".9" fill="none" />
          <path d="M5 16h18" stroke={steel} strokeWidth="1.400" fill="none" />
          <path d="M23 16l-4-2.600v5.200z" fill={steel} />
          <path d="M5 16l-2-2M5 16l-2 2" stroke={a} fill="none" />
        </g>
      );
    case "staff":
      return (
        <g {...S} transform="rotate(40 16 16)">
          <rect x="14.800" y="9" width="2.400" height="22" rx="1.200" fill={wood} />
          <path d="M9 6c1-4 3-5 7-5s6 1 7 5" stroke={gold} fill="none" strokeWidth="1.800" />
          <circle cx="16" cy="6.500" r="4.800" fill={main} />
          <circle cx="14.200" cy="4.800" r="1.600" fill="#fff" stroke="none" opacity=".85" />
          <rect x="13.600" y="12" width="4.800" height="1.800" rx=".9" fill={gold} />
        </g>
      );
    case "scepter":
      return (
        <g {...S} transform="rotate(40 16 16)">
          <rect x="14.800" y="10" width="2.400" height="21" rx="1.200" fill={gold} />
          <path d="M16 0.500l4 4.500-1.400 5.500h-5.200L12 5z" fill={main} />
          <rect x="11" y="10" width="10" height="2.600" rx="1.200" fill={gold} />
          <circle cx="16" cy="5.500" r="1.400" fill="#fff" stroke="none" opacity=".8" />
          <rect x="13.600" y="17" width="4.800" height="2" rx="1" fill={a} />
        </g>
      );
    case "axe":
      return (
        <g {...S} transform="rotate(35 16 16)">
          <rect x="14.800" y="3" width="2.600" height="28" rx="1.200" fill={wood} />
          <path d="M17 4c8-2 12 3 12 7s-4 7-12 6z" fill={id === "axe_great" ? steel : main} />
          <path d="M17 7c4-.8 7 .8 7 4" stroke="#fffb" fill="none" />
          <path d="M14 7c-5-2-9 1-9 4s4 5 9 4z" fill={id === "axe_great" ? steel : main} />
        </g>
      );
    case "hammer":
      return (
        <g {...S} transform="rotate(35 16 16)">
          <rect x="14.800" y="7" width="2.600" height="24" rx="1.200" fill={wood} />
          {id === "mace" ? (
            <g>
              <circle cx="16" cy="7" r="6.200" fill={main} />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M${16 + Math.cos(i * 1.047) * 5.200} ${7 + Math.sin(i * 1.047) * 5.200}l${Math.cos(i * 1.047) * 3} ${Math.sin(i * 1.047) * 3}`} stroke={steel} strokeWidth="2" fill="none" />
              ))}
              <circle cx="14" cy="5" r="1.600" fill="#fff" stroke="none" opacity=".5" />
            </g>
          ) : (
            <g>
              <rect x="6" y="1.500" width="20" height="10" rx="2" fill={main} />
              <rect x="6" y="1.500" width="20" height="3" rx="1.500" fill="#fff" opacity=".35" stroke="none" />
              <rect x="13.500" y="1.500" width="5" height="10" fill={a} />
            </g>
          )}
        </g>
      );
    case "shield":
      return (
        <g {...S}>
          <circle cx="16" cy="16" r="12.500" fill={a} />
          <circle cx="16" cy="16" r="10" fill={main} />
          <circle cx="16" cy="16" r="3.600" fill={gold} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <circle key={i} cx={16 + Math.cos(i * 0.785) * 8} cy={16 + Math.sin(i * 0.785) * 8} r="0.900" fill="#fff" stroke="none" />
          ))}
          <path d="M9 11c3-4 8-5 11-3" stroke="#fffa" fill="none" strokeWidth="1.400" />
        </g>
      );
    case "tome":
      return (
        <g {...S}>
          <path d="M6 4h18a2 2 0 0 1 2 2v21H8a2 2 0 0 1-2-2z" fill={main} />
          <path d="M8 27h18v2H8a2 2 0 0 1 0-2z" fill="#f4eed8" />
          <path d="M6 4v21a2 2 0 0 0 2 2" fill="none" />
          <rect x="22" y="4" width="2" height="23" fill={dark(c, 0.3)} stroke="none" />
          <circle cx="15" cy="14" r="4.400" fill="none" stroke={a} strokeWidth="1.400" />
          <path d="M15 10.500v7M11.500 14h7" stroke={a} strokeWidth="1.200" fill="none" />
          <rect x="9" y="22" width="12" height="1.800" rx=".9" fill={gold} />
        </g>
      );
    case "lantern":
      return (
        <g {...S}>
          <path d="M11 6c0-4 10-4 10 0" fill="none" strokeWidth="1.600" />
          <rect x="9" y="6" width="14" height="3" rx="1.200" fill={gold} />
          <path d="M10 9h12l1.500 15h-15z" fill={main} fillOpacity=".7" />
          <ellipse cx="16" cy="17" rx="3.200" ry="5" fill="#fff" opacity=".85" stroke="none" />
          <rect x="8" y="24" width="16" height="3.200" rx="1.200" fill={gold} />
          <path d="M13 9v15M19 9v15" stroke={DARK} strokeWidth=".8" fill="none" />
        </g>
      );
    case "quiver":
      return (
        <g {...S}>
          <path d="M10 8h12l-1.500 21h-9z" fill={wood} />
          <path d="M10 8h12v3H10z" fill={a} />
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`rotate(${-14 + i * 14} 16 8)`}>
              <rect x="15" y="0.500" width="2" height="9" fill="#e8dcc0" />
              <path d="M14 0.500h4l-2 -2z" fill={steel} />
            </g>
          ))}
          <path d="M12 14h8M12 19h8" stroke={a} fill="none" />
        </g>
      );
    case "orb":
      return (
        <g {...S}>
          <path d="M9 28h14l-2-5H11z" fill={gold} />
          <circle cx="16" cy="14" r="10.500" fill={main} />
          <path d="M8 10c1-3 4-5 7-5.500M20 22c2-2 4-5 3-8" stroke="#fff6" fill="none" />
          <circle cx="12" cy="9.500" r="3" fill="#fff" opacity=".7" stroke="none" />
          <Spark x={21} y={11} s={2} />
        </g>
      );
    case "cap":
      return (
        <g {...S}>
          <path d="M6 20c0-8 5-12 11-12s9 4 9 12z" fill={main} />
          <path d="M5 20h22c0 3-5 4-11 4S5 23 5 20z" fill={dark(c, 0.25)} />
          <circle cx="16" cy="8" r="1.800" fill={a} />
          <path d="M9 15c2-3 6-4 9-3" stroke="#fff7" fill="none" />
        </g>
      );
    case "tophat":
      return (
        <g {...S}>
          <rect x="9" y="4" width="14" height="19" rx="2" fill={main} />
          <ellipse cx="16" cy="24" rx="12.500" ry="3.200" fill={dark(c, 0.2)} />
          <rect x="9" y="17" width="14" height="4" fill={a} stroke="none" />
          <path d="M11 6v11" stroke="#fff5" fill="none" strokeWidth="1.400" />
          {id === "tophat_magic" && <Spark x={20} y={11} s={2.200} f="#ffe88a" />}
        </g>
      );
    case "hood":
      return (
        <g {...S}>
          <path d="M16 3c8 0 12 7 12 14 0 4-2 7-4 9l-4-4h-8l-4 4c-2-2-4-5-4-9 0-7 4-14 12-14z" fill={main} />
          <ellipse cx="16" cy="16" rx="5.400" ry="6.600" fill="#0c0610" />
          <path d="M9 9c2-3 5-4 8-4" stroke="#fff6" fill="none" />
          <circle cx="14" cy="15" r=".9" fill={a} stroke="none" />
          <circle cx="18" cy="15" r=".9" fill={a} stroke="none" />
        </g>
      );
    case "helm":
      return (
        <g {...S}>
          <path d="M5 21c0-9 5-16 11-16s11 7 11 16l-3 5H8z" fill={steel} />
          <rect x="14.500" y="5" width="3" height="21" fill={a} />
          <rect x="8" y="16" width="16" height="3" rx="1" fill="#0c0610" />
          <path d="M8 10c2-3 5-4 8-4" stroke="#fffb" fill="none" />
          {id === "helm_wing" && (
            <g>
              <path d="M5 14c-4-1-5-5-3-8 1 3 3 4 5 4z" fill="#f4f7fb" />
              <path d="M27 14c4-1 5-5 3-8-1 3-3 4-5 4z" fill="#f4f7fb" />
            </g>
          )}
        </g>
      );
    case "crown":
      return (
        <g {...S}>
          <path d="M4 24L3 9l7 6 6-9 6 9 7-6-1 15z" fill={id === "crown_ice" ? main : gold} />
          <rect x="4" y="22" width="24" height="4" rx="1" fill={dark(id === "crown_ice" ? c : "#d9a830", 0.2)} />
          {[8, 16, 24].map((x, i) => (
            <circle key={i} cx={x} cy={i === 1 ? 14 : 18} r="1.800" fill={i === 1 ? a : "#e0527a"} />
          ))}
          <path d="M6 19l-.5-6" stroke="#fffa" fill="none" />
        </g>
      );
    case "mask":
      return (
        <g {...S}>
          <path d="M5 8c4-3 18-3 22 0 1 8-3 18-11 20-8-2-12-12-11-20z" fill="#f4efe4" />
          <path d="M9 13c2-1.600 4-1.600 5 .5-1 2-4 2-5-.5zM23 13c-2-1.600-4-1.600-5 .5 1 2 4 2 5-.5z" fill="#140a10" />
          <path d="M11 22c3 3 7 3 10 0" stroke={a} strokeWidth="2" fill="none" />
          <circle cx="9" cy="19" r="2" fill={a} stroke="none" opacity=".7" />
          <circle cx="23" cy="19" r="2" fill={a} stroke="none" opacity=".7" />
        </g>
      );
    case "amulet":
      return (
        <g {...S}>
          <path d="M5 2c1 11 21 11 22 0" fill="none" stroke="#bfa070" strokeWidth="1.400" />
          <path d="M16 11c7 5 8 11 0 19-8-8-7-14 0-19z" fill={main} />
          <path d="M16 11c-4 4-5 8-3 12" stroke="#fff8" fill="none" strokeWidth="1.200" />
          <circle cx="16" cy="19" r="3" fill={a} />
          <circle cx="15" cy="18" r="1" fill="#fff" stroke="none" />
        </g>
      );
    case "charm":
      return (
        <g {...S}>
          <path d="M5 2c1 8 21 8 22 0" fill="none" stroke="#bfa070" strokeWidth="1.400" />
          {id === "fang" ? (
            <path d="M10 9c8-1 13 1 14 4-1 7-6 14-12 17-2-6-3-14-2-21z" fill={main} />
          ) : (
            <path d="M16 8l9 8-9 14-9-14z" fill={main} />
          )}
          <path d="M16 8v22M7 16h18" stroke="#fff5" fill="none" />
          <circle cx="16" cy="16" r="2.200" fill={a} />
        </g>
      );
    case "locket":
      return (
        <g {...S}>
          <path d="M6 2c2 8 18 8 20 0" fill="none" stroke="#bfa070" strokeWidth="1.400" />
          <circle cx="16" cy="19" r="9.500" fill={gold} />
          <circle cx="16" cy="19" r="6.600" fill={main} />
          <path d="M12 16c1-2 3-3 5-3" stroke="#fffa" fill="none" />
          <rect x="14" y="8" width="4" height="3" rx="1" fill={gold} />
        </g>
      );
    case "whistle":
      return (
        <g {...S}>
          <path d="M5 2c1 7 16 7 18 3" fill="none" stroke="#bfa070" strokeWidth="1.400" />
          <path d="M5 16h13a7 7 0 1 1 0 12 7 7 0 0 1-7-6H5z" fill={steel} />
          <circle cx="18" cy="22" r="3" fill="#0c0610" />
          <rect x="8" y="16" width="5" height="3" fill={a} stroke="none" />
        </g>
      );
    case "pearls":
      return (
        <g {...S}>
          {Array.from({ length: 9 }, (_, i) => {
            const t = i / 8;
            const x = 5 + t * 22;
            const y = 7 + Math.sin(t * Math.PI) * 17;
            return <circle key={i} cx={x} cy={y} r={i === 4 ? 3.400 : 2.500} fill={i === 4 ? a : main} />;
          })}
          <circle cx="15" cy="23" r="1" fill="#fff" stroke="none" />
        </g>
      );
    case "scarab":
      return (
        <g {...S}>
          <ellipse cx="16" cy="18" rx="9" ry="10.500" fill={gold} />
          <path d="M16 8v21M7.500 14c4 2 13 2 17 0" stroke={DARK} fill="none" />
          <circle cx="16" cy="9" r="3.600" fill={a} />
          <path d="M9 9l-4-3M23 9l4-3M7 18l-4 1M25 18l4 1M9 25l-3 3M23 25l3 3" stroke={DARK} fill="none" strokeWidth="1.600" />
          <circle cx="13" cy="15" r="1.600" fill="#fff" opacity=".6" stroke="none" />
        </g>
      );
    case "medal":
      return (
        <g {...S}>
          <path d="M9 2h6l3 9h-6zM23 2h-6l-3 9h6z" fill={a} />
          <circle cx="16" cy="20" r="9" fill={gold} />
          <circle cx="16" cy="20" r="6" fill={mixHex("#d9a830", "#ffffff", 0.2)} />
          <path d="M16 15l1.600 3.200 3.500.5-2.500 2.500.6 3.500-3.200-1.700-3.200 1.700.6-3.500-2.500-2.500 3.500-.5z" fill={a} stroke="none" />
        </g>
      );
    case "vest":
      return (
        <g {...S}>
          <path d="M9 3l7 3 7-3 6 7-4 4v14H7V14l-4-4z" fill={main} />
          <path d="M16 6v21" stroke={DARK} fill="none" />
          <path d="M12 12v13M20 12v13" stroke={a} strokeWidth="1.400" fill="none" />
          {[11, 16, 21].map((y) => (
            <circle key={y} cx="14" cy={y} r=".9" fill={a} stroke="none" />
          ))}
          <path d="M8 12l-3-2" stroke="#fff6" fill="none" />
        </g>
      );
    case "plate":
      return (
        <g {...S}>
          <path d="M3 8l7-4c1 3 11 3 12 0l7 4 2 7-6 3v11H7V18l-6-3z" fill={steel} />
          <path d="M16 8v22M9 15h14" stroke={DARK} fill="none" strokeWidth=".9" />
          <path d="M16 12l4 4-4 5-4-5z" fill={id === "plate_ice" ? "#fff" : main} />
          <circle cx="16" cy="16.500" r="1.800" fill={a} />
          <path d="M5 10l3-2" stroke="#fffb" fill="none" />
          <path d="M7 26h18" stroke={a} strokeWidth="1.600" fill="none" />
        </g>
      );
    case "robe":
      return (
        <g {...S}>
          <path d="M11 3h10l2 7 7 19H2l7-19z" fill={main} />
          <path d="M11 3l5 8 5-8" fill={light(c, 0.55)} />
          <path d="M16 11v18" stroke={a} strokeWidth="2" fill="none" />
          {[16, 21, 26].map((y) => (
            <path key={y} d={`M10 ${y}l6 2 6-2`} stroke={a} fill="none" strokeWidth="1" />
          ))}
          {id === "robe_star" && (
            <g>
              <Spark x={9} y={19} s={1.600} f="#ffe88a" />
              <Spark x={23} y={24} s={1.600} f="#ffe88a" />
            </g>
          )}
        </g>
      );
    case "tunic":
      return (
        <g {...S}>
          <path d="M10 3c2 3 10 3 12 0l8 6-3 6-4-1v15H9V14l-4 1-3-6z" fill={main} />
          <path d="M16 6v22" stroke={DARK} fill="none" />
          {[10, 15, 20].map((y) => (
            <circle key={y} cx="16" cy={y} r="1.300" fill={a} />
          ))}
          <path d="M9 24h14" stroke={a} strokeWidth="1.600" fill="none" />
          <path d="M6 10l-3 .5" stroke="#fff6" fill="none" />
        </g>
      );
    case "cape":
      return (
        <g {...S}>
          <path d="M8 3h16l5 24c-4-2.500-8-2-13-2s-9-.5-13 2z" fill={main} />
          <path d="M8 3c3 5 13 5 16 0" fill="none" stroke={a} strokeWidth="2" />
          <path d="M12 9c-1 5-2 10-4 14M20 9c1 5 2 10 4 14" stroke="#fff3" fill="none" />
          <circle cx="16" cy="7.500" r="2" fill={a} />
          {id === "cape_star" || id === "cape_moon" ? <Spark x={14} y={18} s={1.800} f="#ffe88a" /> : null}
        </g>
      );
    case "cloak":
      return (
        <g {...S}>
          <path d="M16 2c6 0 8 4 8 8l6 17c-5-2-9-2-14-2s-9 0-14 2l6-17c0-4 2-8 8-8z" fill={main} />
          <ellipse cx="16" cy="11" rx="4.400" ry="5.400" fill="#0c0610" />
          <path d="M12 16l-3 9M20 16l3 9" stroke="#fff3" fill="none" />
          <path d="M11 17c3 2 7 2 10 0" stroke={a} strokeWidth="1.800" fill="none" />
        </g>
      );
    case "gloves":
      return (
        <g {...S}>
          <path d="M9 28V19L6 14c-1-2 1-3.500 3-2l2 2V6c0-2 3-2 3 0v6V5c0-2 3-2 3 0v7V6c0-2 3-2 3 0v8V9c0-2 3-2 3 0v13c0 4-2 6-5 6z" fill={main} />
          <rect x="8" y="24" width="15" height="4.500" rx="1.200" fill={a} />
          <path d="M12 13v5M16 12v6M20 13v5" stroke="#0004" fill="none" strokeWidth=".9" />
        </g>
      );
    case "gauntlet":
      return (
        <g {...S}>
          <path d="M9 26V18L6 14c-1-2 1-3 3-2l2 2V6c0-2 3-2 3 0v6V5c0-2 3-2 3 0v7V6c0-2 3-2 3 0v8V9c0-2 3-2 3 0v13c0 3-2 4-4 4z" fill={steel} />
          <path d="M11 9h3M16 8h3M21 10h3" stroke="#fff9" fill="none" />
          <path d="M6 24h20v6H6z" fill={id === "gauntlet_gold" ? gold : main} />
          <path d="M9 24v6M16 24v6M23 24v6" stroke={DARK} fill="none" strokeWidth=".9" />
        </g>
      );
    case "boxing":
      return (
        <g {...S}>
          <path d="M8 26V14c0-6 5-10 11-10s9 4 9 9c0 4-2 5-4 6l-3 1v6c0 2-1 3-3 3H11c-2 0-3-1-3-3z" fill={main} />
          <path d="M9 11c2-4 6-5 10-4" stroke="#fff9" fill="none" strokeWidth="1.600" />
          <rect x="8" y="24" width="14" height="5.500" rx="1.500" fill="#f4efe4" />
          <path d="M20 14c-2 0-4 1-4 3" stroke="#0005" fill="none" />
        </g>
      );
    case "pants":
      return (
        <g {...S}>
          <path d="M8 3h16l2 25h-8l-2-14-2 14H6z" fill={main} />
          <rect x="8" y="3" width="16" height="3.200" fill={a} />
          <path d="M11 8l-2 18M21 8l2 18" stroke="#fff3" fill="none" />
          {id === "pants" && <path d="M10 9l-1 17M14 9l-1 17M18 9l1 17M22 9l1 17" stroke="#fff5" fill="none" strokeWidth=".9" />}
        </g>
      );
    case "greaves":
      return (
        <g {...S}>
          <path d="M8 3h16l2 25h-8l-2-14-2 14H6z" fill={dark(c, 0.3)} />
          <path d="M7 14h8l-1 14H6zM17 14h8l1 14h-8z" fill={steel} />
          <path d="M6 20h9M17 20h9" stroke={DARK} fill="none" />
          <rect x="8" y="3" width="16" height="3" fill={a} />
          <path d="M9 16l1 8" stroke="#fffb" fill="none" />
        </g>
      );
    case "boots":
      return (
        <g {...S}>
          <path d="M9 3h10v14l8 4c2 1 3 2 3 4v3H6V3z" fill={main} />
          <path d="M6 28h24v-3c0-1-.5-2-2-2.500l-9-4" fill={dark(c, 0.35)} stroke="none" />
          <rect x="9" y="3" width="10" height="4" fill={a} />
          <path d="M11 10v10M7 28h22" stroke="#fff4" fill="none" />
          <path d="M9 24h19" stroke={DARK} fill="none" />
          {id === "boots_heel" && <path d="M6 28v3h4v-3z" fill={a} />}
        </g>
      );
    case "slippers":
      return (
        <g {...S}>
          <path d="M6 20c3-3 7-4 10-2l11 5c2 1 3 4 0 5-6 2-13 2-18 0-3-1-4-5-3-8z" fill={main} />
          <path d="M10 18c-2-5 0-12 5-14" stroke={a} strokeWidth="1.800" fill="none" />
          <path d="M13 22c4 1 8 2 12 2" stroke="#fff7" fill="none" />
          <path d="M10 18c3 2 7 4 12 6" stroke={a} fill="none" />
        </g>
      );
    case "ring":
      return (
        <g {...S}>
          <circle cx="16" cy="19" r="8.500" fill="none" stroke={DARK} strokeWidth="5.600" />
          <circle cx="16" cy="19" r="8.500" fill="none" stroke={gold} strokeWidth="3.600" />
          <path d="M9 14c2-3 5-4 8-4" stroke="#fff9" fill="none" strokeWidth="1.200" />
          <path d="M11.500 8l2.500-4.500h4L20.500 8l-4.500 5z" fill={acc} />
          <path d="M14 4l2 4 2-4" stroke="#fff9" fill="none" strokeWidth=".8" />
        </g>
      );
    case "ringthin":
      return (
        <g {...S}>
          <circle cx="16" cy="17" r="9.500" fill="none" stroke={DARK} strokeWidth="3.600" />
          <circle cx="16" cy="17" r="9.500" fill="none" stroke={main} strokeWidth="2" />
          <path d="M7 11c-3-3-3-6 0-7s5 3 0 7z" fill={a} />
          <path d="M25 11c3-3 3-6 0-7s-5 3 0 7z" fill={a} />
        </g>
      );
    default:
      return <circle cx="16" cy="16" r="10" fill={main} {...S} />;
  }
}

export function ItemIcon({ item, size = 40, ring = true }: { item: Item; size?: number; ring?: boolean }) {
  const b = baseOf(item);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const edge = RARITY_COLOR[item.rarity] ?? "#cfc7b8";
  const c = b.color;
  const a = b.acc ?? light(c, 0.55);
  const gid = (n: string) => `url(#${uid}${n})`;
  const grad = (n: string, top: string, bot: string) => (
    <linearGradient id={uid + n} x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0" stopColor={top} />
      <stop offset="1" stopColor={bot} />
    </linearGradient>
  );
  const ctx: Ctx = { c, a, g: gid, rarity: item.rarity };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden style={{ filter: item.rarity > 0 ? `drop-shadow(0 0 ${2 + item.rarity}px ${edge})` : undefined }}>
      <defs>
        {grad("main", light(c, 0.35), dark(c, 0.3))}
        {grad("acc", light(a, 0.4), dark(a, 0.25))}
        {grad("steel", "#fbfdff", "#7c8796")}
        {grad("gold", "#ffe9a0", "#b98a1c")}
        {grad("wood", "#b0804f", "#5a3a22")}
      </defs>
      {ring && <rect x="0.7" y="0.7" width="30.600" height="30.600" rx="4" fill={`${edge}14`} stroke={edge} strokeOpacity={item.rarity > 0 ? 0.9 : 0.35} />}
      <g transform="translate(0 0)">{shape(b.fam, item.base, ctx)}</g>
      {item.rarity >= 2 && <Spark x={26} y={6} s={2.600} f={edge} />}
      {item.rarity >= 3 && <Spark x={5} y={26} s={2} f="#fff" />}
    </svg>
  );
}

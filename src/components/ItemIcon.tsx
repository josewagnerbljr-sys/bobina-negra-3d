import { RARITY_COLOR, baseOf } from "../game/items";
import type { Item } from "../game/types";

/** miniaturas dos itens, desenhadas em SVG: cada objeto tem silhueta própria */
function shape(id: string, c: string) {
  const dark = "#1a1014";
  const metal = "#d7dde6";
  switch (id) {
    case "pot":
    case "pot2":
      return (
        <g>
          <rect x="10" y="3" width="4" height="4" fill="#8a6a4a" stroke={dark} />
          <path d="M9 7h6l4 8a5 5 0 0 1-4.5 7h-5A5 5 0 0 1 5 15z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d="M8 14h8" stroke="#ffffff55" strokeWidth="1.4" />
          {id === "pot2" && <circle cx="12" cy="17" r="1.8" fill="#fff8" />}
        </g>
      );
    case "elx_haste":
    case "elx_fury":
    case "elx_ward":
      return (
        <g>
          <rect x="10" y="2" width="4" height="3" fill="#8a6a4a" stroke={dark} />
          <rect x="11" y="5" width="2" height="4" fill="#cfd8e6" stroke={dark} />
          <path d="M12 8c5 0 8 4 8 8a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6c0-4 3-8 8-8z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d={id === "elx_haste" ? "M8 15l4-3v2l4-3-4 6v-2z" : id === "elx_fury" ? "M12 11c2 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1-3 1 1 2 1 2-2z" : "M12 11l4 1.5v3c0 2-2 3.5-4 4.5-2-1-4-2.5-4-4.5v-3z"} fill="#fff9" />
        </g>
      );
    case "knife":
      return (
        <g transform="rotate(45 12 12)">
          <path d="M12 1l3 11h-6z" fill={metal} stroke={dark} strokeWidth="1.1" />
          <rect x="8" y="12" width="8" height="2.2" fill={c} stroke={dark} />
          <rect x="10.5" y="14" width="3" height="7" fill="#6a4a30" stroke={dark} />
        </g>
      );
    case "sword":
      return (
        <g transform="rotate(45 12 12)">
          <path d="M12 0l2.6 14h-5.2z" fill={metal} stroke={dark} strokeWidth="1.1" />
          <path d="M12 2v12" stroke="#fff9" />
          <rect x="6" y="14" width="12" height="2.6" rx="1" fill={c} stroke={dark} />
          <rect x="10.5" y="16.5" width="3" height="5" fill="#6a4a30" stroke={dark} />
          <circle cx="12" cy="22.5" r="1.6" fill={c} stroke={dark} />
        </g>
      );
    case "axe":
      return (
        <g transform="rotate(35 12 12)">
          <rect x="10.8" y="2" width="2.4" height="21" fill="#7a5436" stroke={dark} />
          <path d="M13 3c6-1 9 3 9 6s-3 5-9 4z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d="M13 6c3-.5 5 1 5 3" stroke="#fff8" fill="none" />
        </g>
      );
    case "staff":
      return (
        <g transform="rotate(35 12 12)">
          <rect x="11" y="6" width="2.2" height="17" fill="#6a4a30" stroke={dark} />
          <circle cx="12" cy="5" r="4.2" fill={c} stroke={dark} strokeWidth="1.2" />
          <circle cx="10.8" cy="3.8" r="1.2" fill="#fff9" />
          <path d="M7 8c1-4 2-5 5-5s4 1 5 5" stroke="#d9c88a" fill="none" strokeWidth="1.2" />
        </g>
      );
    case "scepter":
      return (
        <g transform="rotate(35 12 12)">
          <rect x="11" y="8" width="2.2" height="15" fill="#d9a830" stroke={dark} />
          <path d="M12 0l3 4-1 4h-4l-1-4z" fill={c} stroke={dark} strokeWidth="1.1" />
          <rect x="8.5" y="8" width="7" height="2" fill="#d9a830" stroke={dark} />
        </g>
      );
    case "bow":
      return (
        <g>
          <path d="M7 2c11 4 11 16 0 20" stroke="#6a4a30" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M7 2c11 4 11 16 0 20" stroke={c} strokeWidth="1" fill="none" />
          <path d="M7 2v20" stroke="#f4f0e0" strokeWidth="0.9" />
          <path d="M4 12h13" stroke={metal} strokeWidth="1.2" />
          <path d="M17 12l-3-2v4z" fill={metal} />
        </g>
      );
    case "cape":
      return (
        <g>
          <path d="M6 3h12l3 18c-3-2-6-2-9-2s-6 0-9 2z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d="M6 3c2 3 10 3 12 0" stroke="#e0b15a" strokeWidth="1.6" fill="none" />
          <circle cx="12" cy="5.6" r="1.4" fill="#e0b15a" stroke={dark} />
        </g>
      );
    case "vest":
      return (
        <g>
          <path d="M7 3l5 2 5-2 4 5-3 3v10H6V11L3 8z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d="M12 5v15" stroke={dark} />
          <path d="M9 12h-1M16 12h-1M9 15h-1M16 15h-1" stroke="#d7b25a" strokeWidth="1.4" />
        </g>
      );
    case "plate":
      return (
        <g>
          <path d="M4 5l5-2c1 2 5 2 6 0l5 2 2 5-4 2v9H6v-9l-4-2z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d="M12 8v13M8 13h8" stroke="#fff7" />
          <circle cx="12" cy="12" r="2.2" fill="#e0b15a" stroke={dark} />
        </g>
      );
    case "robe":
      return (
        <g>
          <path d="M8 2h8l1 6 4 14H3l4-14z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d="M8 2l4 6 4-6" fill="#c9b6e0" stroke={dark} />
          <path d="M9 14l3 2 3-2M9 18l3 2 3-2" stroke="#e0b15a" fill="none" />
        </g>
      );
    case "ring":
      return (
        <g>
          <circle cx="12" cy="14" r="7" fill="none" stroke="#e0b15a" strokeWidth="3.2" />
          <circle cx="12" cy="14" r="7" fill="none" stroke={dark} strokeWidth="0.8" />
          <path d="M9 4l3-2 3 2-3 4z" fill="#e0527a" stroke={dark} />
        </g>
      );
    case "amulet":
      return (
        <g>
          <path d="M5 2c2 8 12 8 14 0" stroke="#bfa070" strokeWidth="1.4" fill="none" />
          <path d="M12 9c5 4 6 8 0 14-6-6-5-10 0-14z" fill={c} stroke={dark} strokeWidth="1.2" />
          <circle cx="12" cy="15" r="2.4" fill="#fff8" />
        </g>
      );
    case "charm":
      return (
        <g>
          <path d="M12 2l9 8-9 12L3 10z" fill={c} stroke={dark} strokeWidth="1.2" />
          <path d="M12 2v20M3 10h18" stroke="#fff6" />
          <path d="M9 9l3 2 3-2" stroke={dark} fill="none" />
        </g>
      );
    case "orb":
      return (
        <g>
          <circle cx="12" cy="12" r="9" fill={c} stroke={dark} strokeWidth="1.3" />
          <path d="M8 6c-2 2-3 5-2 8M14 4l-3 5 3 3-2 5" stroke="#142a2a" strokeWidth="1" fill="none" />
          <circle cx="9" cy="8" r="2" fill="#fffa" />
        </g>
      );
    default:
      return <circle cx="12" cy="12" r="8" fill={c} stroke={dark} />;
  }
}

export function ItemIcon({ item, size = 40, ring = true }: { item: Item; size?: number; ring?: boolean }) {
  const b = baseOf(item);
  const edge = RARITY_COLOR[item.rarity] ?? "#cfc7b8";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ filter: item.rarity > 0 ? `drop-shadow(0 0 3px ${edge})` : undefined }}>
      {ring && <rect x="0.5" y="0.5" width="23" height="23" rx="3" fill="none" stroke={edge} strokeOpacity={item.rarity > 0 ? 0.9 : 0.35} />}
      {shape(item.base, b.color)}
    </svg>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Pause, Volume2, VolumeX } from "./icons";
import { CAM_MODES, MAIN_LEVELS, OPEN_INDEX } from "../game/types";
import { BONUS_NAMES, HEROES, MODES, REEL_NAMES, REGIONS, heroById } from "../game/content";
import { FORGE_CHANCE, BASE_BY_ID, fuseChance, RARITY_COLOR, RARITY_NAME, baseOf, compareItem, describeMods, itemInfo, itemName, itemSize, modText } from "../game/items";
import { ItemIcon } from "./ItemIcon";
import { terrainImage } from "../game/minimap";
import { HERO_CLASS } from "../game/spells";
import { BASE_STATS, STAT_INFO } from "../game/stats";
import { createRuntime, type Runtime } from "../game/runtime";
import { cycleQuality, qualityLabel, talkScreen } from "../game/render3d";
import { BAG_SIZE, EMPTY_STATS, EQUIP_KEYS, SLOT_LABEL, STAT_KEYS, type Action, type Item, type Snap, type StatKey } from "../game/types";

const BOOT: Snap = {
  mana: 0,
  maxMana: 0,
  screen: "title",
  hasSave: false,
  hero: "ivo",
  selectedHero: "ivo",
  next: 1,
  bonusOpen: 0,
  mode: 0,
  meleeCd: 0,
  meleeMax: 0.4,
  cine: false,
  level: 1,
  xp: 0,
  xpNeed: 40,
  stats: { ...EMPTY_STATS },
  alloc: { ...EMPTY_STATS },
  points: 0,
  hp: 5,
  maxHp: 5,
  reel: 0,
  reelName: "",
  worldName: "",
  bonus: false,
  bossAlive: false,
  bossName: "",
  bossHp: 0,
  bossMax: 0,
  formActive: false,
  formLeft: 0,
  formCd: 0,
  formDur: 7,
  lines: [],
  lineIndex: 0,
  deadLine: "",
  toast: "",
  mute: false,
  clearText: "",
  time: 0,
  best: 0,
  hint: false,
  progress: 0,
  skills: [],
  bag: [],
  equip: { helmet: null, necklace: null, armor: null, cape: null, gloves: null, pants: null, boots: null, weapon: null, offhand: null, ring1: null, ring2: null },
  bagUsed: 0,
  potions: 0,
  buffs: [],
  derived: {},
  levelupFresh: false,
  camMode: 3,
  pad: "",
};

function clock(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function Bobina() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rtRef = useRef<Runtime | null>(null);
  const [snap, setSnap] = useState<Snap>(BOOT);
  const [confirmNew, setConfirmNew] = useState(false);
  const [qv, setQv] = useState(0);
  const [credits, setCredits] = useState(false);
  const [mp, setMp] = useState(false);
  const [pick, setPick] = useState(1);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rt = createRuntime(canvas, setSnap);
    rtRef.current = rt;
    return () => {
      rt.destroy();
      rtRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (snap.screen === "map") setPick(Math.min(50, Math.max(1, snap.next)));
  }, [snap.screen, snap.next]);

  const hero = heroById(snap.hero);
  const selected = heroById(snap.selectedHero);
  // na escolha de personagem, o cartão selecionado sempre vem para o meio da fileira
  useEffect(() => {
    if (snap.screen !== "cast") return;
    document.querySelector(`[data-card="${snap.selectedHero}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [snap.screen, snap.selectedHero]);
  const stepHero = (d: number) => {
    const i = HEROES.findIndex((h) => h.id === snap.selectedHero);
    const n = HEROES[(i + d + HEROES.length) % HEROES.length]!;
    rtRef.current?.pickHero(n.id);
  };
  const line = snap.lines[snap.lineIndex];
  const playing = snap.screen === "play";
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.code === "KeyM" && !e.repeat) setShowMap((v) => !v); if (e.code === "Escape") setShowMap(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function hold(action: Action, down: boolean) {
    rtRef.current?.setHold(action, down);
  }

  return (
    <main className="sprocket fixed inset-0 select-none overflow-hidden bg-ink font-sans text-paper" onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-hidden />
      {snap.cine && snap.screen === "talk" && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[12%] bg-black" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[12%] bg-black" aria-hidden />
          <p className="pointer-events-none absolute inset-x-0 top-[3%] text-center font-display text-2xl tracking-widest text-brass sm:text-4xl">{snap.bossName}</p>
        </>
      )}
      <div className="safe-top hud-root pointer-events-none absolute inset-0 flex flex-col">
        {(playing || snap.screen === "pause" || snap.screen === "dead") && (
          <header className="pointer-events-none flex flex-col gap-2 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="hud-title font-display text-lg leading-none text-brass">
                  {snap.reel > OPEN_INDEX ? "Mundo" : snap.bonus ? "Bis" : "Reino"} {snap.reel > OPEN_INDEX ? "" : snap.bonus ? snap.reel - MAIN_LEVELS : snap.reel}
                  <span className="text-paper"> · {snap.reelName}</span>
                </p>
                <p className="hud-sub mt-1 text-sm text-paper/75">
                  {snap.worldName} · Nv {snap.level} · {clock(snap.time)}
                  {snap.buffs.map((b) => (
                    <span key={b.kind} className="ml-2 rounded bg-ink px-1.5 text-xs text-moon">
                      {b.kind === "haste" ? "Pressa" : b.kind === "fury" ? "Fúria" : "Escudo"} {Math.ceil(b.left)}s
                    </span>
                  ))}
                </p>
              </div>
              <div className="pointer-events-auto flex gap-2">
                <IconButton label={snap.mute ? "Ativar som" : "Silenciar"} onClick={() => rtRef.current?.toggleMute()}>
                  {snap.mute ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </IconButton>
                {(playing || snap.screen === "pause") && (
                  <button
                    type="button"
                    aria-label="Personagem e mochila"
                    onClick={() => rtRef.current?.openChar()}
                    className={"hud-ico relative grid size-11 place-items-center rounded-md border bg-panel font-display text-lg " + (snap.levelupFresh ? "animate-pulse border-brass text-brass" : "border-paper/30 text-paper")}
                  >
                    C
                    {snap.points > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-blood px-1 text-[11px] leading-5 text-paper">{snap.points}</span>}
                  </button>
                )}
                {playing && (
                  <button type="button" aria-label="Trocar câmera" onClick={() => rtRef.current?.cycleCam()} className="hud-ico grid size-11 place-items-center rounded-md border border-paper/30 bg-panel text-xs text-paper">
                    Cam {snap.camMode + 1}
                  </button>
                )}
                {playing && (
                  <IconButton label="Pausar" onClick={() => rtRef.current?.pause()}>
                    <Pause className="size-5" />
                  </IconButton>
                )}
              </div>
            </div>
            {playing && snap.open && (
              <div className="pointer-events-none flex items-start gap-2">
                {snap.open.map && (
                  <button type="button" aria-label="Abrir mapa da fase" onClick={() => setShowMap((v) => !v)} className="pointer-events-auto shrink-0 rounded-full" style={{ width: 84, height: 84 }}>
                    <MiniMap hud={snap.open} size={84} />
                  </button>
                )}
                <div className="min-w-0 text-xs leading-tight text-paper/80">
                  <span className="block truncate text-paper">{snap.open.region}</span>
                  <span className="block text-paper/60">{snap.open.night > 0.5 ? "Noite" : snap.open.night > 0.15 ? "Anoitecendo" : "Dia"} · Moedas {snap.open.gold} · Peças {snap.open.parts}/3</span>
                  {snap.open.hazard && <span className="block font-bold text-blood">Perigo: {snap.open.hazard}</span>}
                  <span className="pointer-events-auto mt-1 flex gap-1">
                    <button type="button" aria-label="Girar câmera para a esquerda" onClick={() => rtRef.current?.camRot(-1)} className="hud-ico grid size-8 place-items-center rounded-md border border-paper/30 bg-panel/80 text-base text-paper">⟲</button>
                    <button type="button" aria-label="Girar câmera para a direita" onClick={() => rtRef.current?.camRot(1)} className="hud-ico grid size-8 place-items-center rounded-md border border-paper/30 bg-panel/80 text-base text-paper">⟳</button>
                  </span>
                </div>
              </div>
            )}
            {!snap.open && <div className="flex items-center gap-1">
              {Array.from({ length: snap.maxHp }, (_, i) => (
                <Heart
                  key={i}
                  className={i < snap.hp ? "size-4 fill-blood text-blood" : "size-4 text-paper/35"}
                  aria-hidden
                />
              ))}
              <span className="sr-only">
                {snap.hp} de {snap.maxHp} corações
              </span>
            </div>}
            {!snap.open && <div className="h-1.5 overflow-hidden rounded-full bg-panel">
              <div className="h-full bg-brass" style={{ width: `${Math.min(100, (snap.xp / Math.max(1, snap.xpNeed)) * 100)}%` }} />
            </div>}
            {!snap.open && <div className="h-1 overflow-hidden rounded-full bg-panel">
              <div className="h-full bg-blood" style={{ width: `${Math.min(100, snap.progress * 100)}%` }} />
            </div>}
            {snap.bossAlive && (
              <div>
                <p className="text-sm text-brass">{snap.bossName}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-panel">
                  <div
                    className="h-full bg-blood"
                    style={{ width: `${Math.min(100, (snap.bossHp / Math.max(1, snap.bossMax)) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {snap.toast && (
              <p className="pointer-events-none max-w-md text-sm text-moon">{snap.toast}</p>
            )}
            {snap.hint && (
              <p className="max-w-md text-sm text-paper/80">
                A e D movem. Espaço pula. J atira. K é a forma. U/I/O/P (ou 1–4) são os poderes. Q bebe poção. C abre personagem e mochila. S desce da plataforma.
              </p>
            )}
          </header>
        )}

        {playing && snap.open && (
          <>
            {snap.open.talk && <TalkBubble onTalk={() => rtRef.current?.interact()} />}
            <div className="orb-dock pointer-events-none absolute z-10 flex items-end gap-3" aria-label={`Vida ${Math.ceil(snap.hp)} de ${snap.maxHp}, mana ${Math.floor(snap.mana)} de ${snap.maxMana}`}>
              <Orb frac={snap.hp / Math.max(1, snap.maxHp)} c1="#ff4d5a" c2="#6a0f1a" label={String(Math.ceil(snap.hp))} />
              <Orb frac={snap.mana / Math.max(1, snap.maxMana)} c1="#5aa8ff" c2="#10286a" label={String(Math.floor(snap.mana))} />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[5px] bg-black/60" aria-label="Experiência">
              <div className="h-full bg-brass" style={{ width: `${Math.min(100, (snap.xp / Math.max(1, snap.xpNeed)) * 100)}%` }} />
            </div>
          </>
        )}
        <div className="pointer-events-auto min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {snap.screen === "title" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col menu-sec px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-ink/60 p-5 shadow-lg backdrop-blur-sm">
                <p className="text-xs tracking-widest text-brass">ESPETÁCULO ORIGINAL · TINTA E OSSO</p>
                <h1 className="mt-2 font-display text-5xl leading-none text-paper">Bobina Negra</h1>
                <p className="mt-3 text-base leading-relaxed text-paper/80">
                  Cinquenta reinos em mundo aberto: vilarejos, mansões, castelos e florestas para explorar. Três peças em cada reino abrem o portal para o próximo. Um contrato que ninguém leu até a cláusula final.
                </p>
                <p className="mt-2 text-xs text-paper/40">v16.0 · classes e missões {typeof __BUILD__ === "string" ? __BUILD__ : "dev"}</p>
                <div className="mt-5 flex flex-col gap-2">
                  {snap.hasSave && !confirmNew && (
                    <Primary onClick={() => rtRef.current?.continueGame()}>Continuar o contrato</Primary>
                  )}
                  {!confirmNew && (
                    <Primary
                      onClick={() => {
                        if (snap.hasSave) setConfirmNew(true);
                        else rtRef.current?.openCast();
                      }}
                    >
                      Novo contrato
                    </Primary>
                  )}
                  {confirmNew && (
                    <>
                      <p className="text-sm text-paper/80">Isso rasga o contrato salvo. Os rolos queimados somem.</p>
                      <Primary
                        onClick={() => {
                          setConfirmNew(false);
                          rtRef.current?.openCast();
                        }}
                      >
                        Rasgar e recomeçar
                      </Primary>
                      <Ghost onClick={() => setConfirmNew(false)}>Voltar</Ghost>
                    </>
                  )}
                  <Ghost onClick={() => rtRef.current?.openHelp(true)}>Como se joga</Ghost>
                  <Ghost onClick={() => setMp((v) => !v)}>{snap.net === "connected" ? "Multijogador: conectado" : "Multijogador (amigos)"}</Ghost>
                  {mp && <MultiPanel rt={rtRef.current} status={snap.net ?? "off"} />}
                  <Ghost onClick={() => setCredits((v) => !v)}>{credits ? "Fechar créditos" : "Créditos"}</Ghost>
                  {credits && (
                    <div className="rounded-md border border-paper/20 bg-ink/70 p-3 text-xs leading-relaxed text-paper/80">
                      <p>Modelos 3D (CC0): Quaternius — Stylized Nature MegaKit, Medieval Village MegaKit, Fantasy Props MegaKit, Modular Character Outfits, Universal Animation Library; KayKit — Forest Nature Pack; Kenney — texturas e fumaça.</p>
                      <p className="mt-1">Motor WebGL2, música e efeitos sonoros procedurais: projeto original de José Wagner Blanco Júnior.</p>
                    </div>
                  )}
                  <Ghost onClick={() => { cycleQuality(); setQv((v) => v + 1); }}>Qualidade gráfica: {qualityLabel()} (trocar){qv ? "" : ""}</Ghost>
              <Ghost onClick={() => rtRef.current?.toggleMute()}>{snap.mute ? "Som: mudo" : "Som: ligado"}</Ghost>
                </div>
              </div>
            </section>
          )}

          {showMap && playing && snap.open?.map && <LevelMap hud={snap.open} onClose={() => setShowMap(false)} />}
          {snap.screen === "npc" && snap.npc && <NpcPanel npc={snap.npc} rt={rtRef.current} />}
          {snap.screen === "help" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col menu-sec px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-panel/95 p-5">
                <h2 className="font-display text-3xl">Como se joga</h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-paper/85">
                  <li>A / ← esquerda. D / → direita. Não inverte.</li>
                  <li>Espaço, W ou ↑ pulam. Segurar pula mais alto. Soltar cedo encurta.</li>
                  <li>J ou Z atiram. Cada alma atira diferente.</li>
                  <li>K, L ou Shift ativam a forma: uivo, asas, caveira ou elfa.</li>
                  <li>S ou ↓ em cima de uma tábua solta deixa você cair por ela.</li>
                  <li>Molas lançam. Espinhos e buracos cobram coração. Lanternas gravam o retorno.</li>
                  <li>Cada nível dá 5 pontos para FOR, INT, DES, SAB e REC (tecla C). FOR/INT aumentam o dano, DES a velocidade, SAB as recargas, REC os corações.</li>
                  <li>Monstros e baús soltam itens. A mochila tem 32 blocos: cada objeto ocupa blocos pelo tamanho (poção 1, cajado 3, armadura 5). Q bebe poção de cura.</li>
                  <li>A cada 2 ou 3 reinos abre um Bis. Cada reino tem três andares, guardiões por cômodo e portões que só abrem quando o guardião cai.</li>
                  <li>No telefone, use os botões. De lado cabe mais picadeiro.</li>
                </ul>
                <div className="mt-4">
                  <Primary onClick={() => rtRef.current?.openHelp(false)}>Fechar o regulamento</Primary>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "cast" && (
            <section className="pointer-events-auto mx-auto flex h-full w-full max-w-5xl flex-col gap-2 px-3 pb-3">
              <div className="flex items-baseline justify-between gap-3">
                <button type="button" aria-label="Voltar" onClick={() => rtRef.current?.backTitle()} className="grid h-10 shrink-0 place-items-center rounded-md border border-brass/60 bg-ink/90 px-3 text-sm text-brass">
                  ← Voltar
                </button>
                <h2 className="font-display text-2xl leading-none sm:text-3xl">Quem assina</h2>
                <p className="hidden text-sm text-paper/70 sm:block">Deslize os cartões ou use as setas. Os outros ficam no camarim, comentando.</p>
              </div>
              <div className="relative min-h-0 flex-1">
                <div
                  className="hero-row flex h-full snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden overscroll-contain px-1 pb-1"
                  style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
                >
                  {HEROES.map((h) => {
                    const on = snap.selectedHero === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        data-card={h.id}
                        onClick={() => rtRef.current?.pickHero(h.id)}
                        className={"flex h-full w-[11.5rem] shrink-0 snap-center flex-col rounded-md border p-2 text-left sm:w-52 " + (on ? "border-brass bg-ink ring-1 ring-brass" : "border-paper/20 bg-ink/50")}
                      >
                        <canvas data-hero-preview={h.id} className="pointer-events-none min-h-0 w-full flex-1 rounded-sm" />
                        <span className="mt-1 block font-display text-lg leading-tight">{h.name}</span>
                        <span className="block text-xs text-brass">{h.role}</span>
                        <span className="mt-1 line-clamp-3 block text-xs leading-snug text-paper/75">{h.blurb}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" aria-label="Personagem anterior" onClick={() => stepHero(-1)} className="absolute left-0 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-brass/60 bg-ink/90 text-2xl text-brass">
                  ‹
                </button>
                <button type="button" aria-label="Próximo personagem" onClick={() => stepHero(1)} className="absolute right-0 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full border border-brass/60 bg-ink/90 text-2xl text-brass">
                  ›
                </button>
              </div>
              <div className="rounded-lg border border-brass/40 bg-panel/95 p-2 sm:p-3">
                <p className="line-clamp-2 text-xs text-paper/85 sm:text-sm">
                  <span className="text-brass">{HERO_CLASS[selected.id] ?? ""} · {selected.formName}. </span>
                  {selected.voice} {selected.attack}
                </p>
                <div className="mt-2 flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Primary onClick={() => rtRef.current?.openMode(snap.selectedHero)}>Assinar com {selected.name}</Primary>
                  </div>
                  <Ghost onClick={() => rtRef.current?.backTitle()}>Voltar</Ghost>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "map" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-3xl flex-col menu-sec px-4 pb-6">
              <div className="max-h-[92dvh] overflow-y-auto rounded-lg border border-brass/40 bg-panel/95 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl">Arquivo</h2>
                    <p className="text-sm text-paper/75">
                      {hero.name} · nível {snap.level}
                      {snap.points > 0 ? ` · ${snap.points} pontos livres` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Ghost onClick={() => rtRef.current?.openChar()}>Personagem{snap.points > 0 ? ` (${snap.points})` : ""}</Ghost>
                    <Ghost onClick={() => rtRef.current?.openMode(null)}>{MODES[snap.mode]?.name ?? "Modo"}</Ghost>
                    <Ghost onClick={() => rtRef.current?.backTitle()}>Título</Ghost>
                  </div>
                </div>
                <div className="mt-3 grid max-h-[40dvh] gap-3 overflow-y-auto pr-1">
                  {REGIONS.map((reg) => (
                    <div key={reg.name}>
                      <h3 className="text-sm text-brass">{reg.name}</h3>
                      <div className="mt-1 grid grid-cols-6 gap-1.5">
                        {Array.from({ length: reg.to - reg.from + 1 }, (_, k) => {
                          const n = reg.from + k + 1;
                          const locked = n > snap.next;
                          const on = pick === n;
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={locked}
                              onClick={() => setPick(n)}
                              className={"min-h-12 rounded-md border text-sm " + (locked ? "border-paper/10 text-paper/30" : on ? "border-brass bg-brass text-ink" : "border-paper/25 bg-ink text-paper")}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div>
                    <h3 className="text-sm text-brass">Mundo Aberto</h3>
                    <button type="button" onClick={() => rtRef.current?.enterReel(OPEN_INDEX)} className="mt-1 min-h-12 w-full rounded-md border border-brass bg-ink px-3 text-left text-sm text-paper">
                      Explorar livremente: planície com os 50 portais, monstros, baús e ruínas
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm text-moon">Bis (tesouros)</h3>
                    <div className="mt-1 grid grid-cols-6 gap-1.5">
                      {Array.from({ length: 10 }, (_, k) => {
                        const n = MAIN_LEVELS + 1 + k;
                        const locked = snap.bonusOpen < k + 1;
                        return (
                          <button
                            key={n}
                            type="button"
                            disabled={locked}
                            onClick={() => setPick(n)}
                            className={"min-h-12 rounded-md border text-sm " + (locked ? "border-paper/10 text-paper/30" : pick === n ? "border-moon bg-moon text-ink" : "border-moon/60 bg-ink text-moon")}
                          >
                            ★{k + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <p className="mt-3 font-display text-xl">{pick > MAIN_LEVELS ? `Bis: ${BONUS_NAMES[pick - MAIN_LEVELS - 1] ?? ""}` : `${pick}. ${REEL_NAMES[pick - 1]}`}</p>
                <p className="text-sm text-paper/70">
                  {pick > MAIN_LEVELS ? "Mapa de tesouro: baús e poucos monstros. Sem chefe." : "Reino em mundo aberto: vilarejos, mansões, castelo, florestas, enigma de 3 peças e um portal para o próximo reino."}
                </p>
                <div className="mt-3">
                  <Primary onClick={() => rtRef.current?.enterReel(pick - 1)} disabled={pick > MAIN_LEVELS ? snap.bonusOpen < pick - MAIN_LEVELS : pick > snap.next}>
                    {pick > MAIN_LEVELS ? `Entrar no bis ${pick - MAIN_LEVELS}` : `Entrar no reino ${pick}`}
                  </Primary>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "talk" && line && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-xl flex-col menu-sec px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-panel/95 p-4">
                <p className="text-sm text-brass">{line.who}</p>
                <p className="mt-2 font-display text-2xl leading-snug">{line.text}</p>
                <p className="mt-2 text-xs text-paper/50">
                  {snap.lineIndex + 1} / {snap.lines.length}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Primary onClick={() => rtRef.current?.advanceDialogue()}>Seguir</Primary>
                  <Ghost onClick={() => rtRef.current?.skipDialogue()}>Pular fala</Ghost>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "mode" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-4xl flex-col menu-sec px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-panel/95 p-3">
                <p className="text-xs tracking-widest text-brass">COMO VOCÊ QUER SER SERVIDO?</p>
                <h2 className="font-display text-3xl leading-none">Ponto da panela</h2>
                <p className="mt-1 text-sm text-paper/70">Muda a vida e a força dos monstros, o dano que você leva e o tesouro que cai. Dá para trocar depois, no Arquivo.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {MODES.map((m, i) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => rtRef.current?.setMode(i)}
                      className={"rounded-md border bg-ink p-2.5 text-left " + (snap.mode === i ? "ring-2 ring-brass " : "") + (i === 4 ? "sm:col-span-2" : "")}
                      style={{ borderColor: m.color }}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-display text-xl" style={{ color: m.color }}>{m.name}</span>
                        <span className="text-xs text-paper/60">{m.tag}</span>
                      </span>
                      <span className="mt-1 block text-sm text-paper/80">{m.text}</span>
                      <span className="mt-1 block text-xs text-paper/50">
                        vida dos monstros ×{m.hp} · dano que você leva {m.dmg === 1 ? "normal" : "+1 coração"} · XP ×{m.xp} · drops ×{m.luck}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Ghost onClick={() => rtRef.current?.backTitle()}>Voltar</Ghost>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "pause" && (
            <CenterCard title="Pausa" kicker={hero.name}>
              <StatList stats={snap.stats} />
              <p className="text-sm text-paper/75">
                Forma {hero.formName}
                {snap.formActive ? ` ativa (${snap.formLeft.toFixed(1)}s)` : snap.formCd > 0 ? ` em ${snap.formCd.toFixed(1)}s` : " pronta"}.
              </p>
              <Primary onClick={() => rtRef.current?.resume()}>Voltar ao rolo</Primary>
              <Ghost onClick={() => rtRef.current?.openChar()}>Personagem e mochila{snap.points > 0 ? ` (${snap.points} pontos)` : ""}</Ghost>
              <Ghost onClick={() => rtRef.current?.cycleCam()}>Câmera: {CAM_MODES[snap.camMode] ?? "Multi-dinâmica"} (trocar)</Ghost>
              <p className="text-xs text-paper/60">{snap.pad ? `Controle conectado: ${snap.pad}` : "Controle: conecte por Bluetooth/USB e aperte qualquer botão."}</p>
              <Ghost onClick={() => { cycleQuality(); setQv((v) => v + 1); }}>Qualidade gráfica: {qualityLabel()} (trocar){qv ? "" : ""}</Ghost>
              <Ghost onClick={() => rtRef.current?.toggleMute()}>{snap.mute ? "Ligar som" : "Silenciar"}</Ghost>
              <Ghost onClick={() => rtRef.current?.quitToMap()}>Sair para o arquivo</Ghost>
            </CenterCard>
          )}

          {snap.screen === "char" && (
            <CharSheet snap={snap} sel={sel} setSel={setSel} rt={rtRef.current} />
          )}

          {snap.screen === "dead" && (
            <CenterCard title="Rolo reaberto" kicker={hero.name}>
              <p className="font-display text-2xl leading-snug">{snap.deadLine}</p>
              <Primary onClick={() => rtRef.current?.skipDead()}>Levantar agora</Primary>
            </CenterCard>
          )}

          {snap.screen === "clear" && (
            <CenterCard title="Rolo queimado" kicker={snap.reelName}>
              <p className="font-display text-2xl leading-snug">{snap.clearText}</p>
              <p className="text-sm text-paper/75">
                Tempo {clock(snap.time)}
                {snap.best > 0 ? ` · melhor ${clock(snap.best)}` : ""}
              </p>
              {snap.points > 0 && <p className="text-sm text-brass">Você tem {snap.points} pontos de atributo para gastar.</p>}
              <Primary onClick={() => rtRef.current?.quitToMap()}>Voltar ao arquivo</Primary>
              <Ghost onClick={() => rtRef.current?.openChar()}>Personagem e mochila{snap.points > 0 ? ` (${snap.points})` : ""}</Ghost>
            </CenterCard>
          )}

          {snap.screen === "ending" && (
            <CenterCard title="Rescisão carimbada" kicker="Bobina Negra">
              <p className="text-base leading-relaxed text-paper/85">
                Vinte e cinco reinos atravessados. O Empresário assinou a própria rescisão. Os quatro podem sair; o arquivo fica. Os bis e os rolos antigos continuam no mapa — teimosia também é um atributo.
              </p>
              <Primary onClick={() => rtRef.current?.quitToMap()}>Reabrir o arquivo</Primary>
              <Ghost onClick={() => rtRef.current?.backTitle()}>Voltar ao cartaz</Ghost>
            </CenterCard>
          )}
        </div>

        {playing && snap.open && <OpenDock snap={snap} hero={hero} hold={hold} />}
        {playing && !snap.open && (
          <div className="touch-dock dock pointer-events-none">
            <div className="dock-left-col pointer-events-auto">
              <div className="dock-row">
                <Pad label="Andar para o fundo" onDown={(d) => hold("up", d)} cls="pad-sm">
                  <ArrowUp className="size-5" />
                </Pad>
                <Pad label="Andar para frente / descer plataforma" onDown={(d) => hold("down", d)} cls="pad-sm">
                  <ArrowDown className="size-5" />
                </Pad>
                <Pad label="Beber poção" onDown={(d) => hold("potion", d)} cls="pad-sm">
                  <span className="font-display text-xs text-blood">♥{snap.potions}</span>
                </Pad>
              </div>
              <div className="dock-row">
                <Pad label="Esquerda" onDown={(d) => hold("left", d)} cls="pad-lg">
                  <ArrowLeft className="size-6" />
                </Pad>
                <Pad label="Direita" onDown={(d) => hold("right", d)} cls="pad-lg">
                  <ArrowRight className="size-6" />
                </Pad>
              </div>
            </div>
            <div className="dock-right pointer-events-auto">
              {snap.screen === "play" && (
                <div className="dock-skills">
                  {snap.skills.map((k, i) => (
                    <SkillButton key={k.name} skill={k} onDown={(d) => hold(("s" + (i + 1)) as Action, d)} />
                  ))}
                </div>
              )}
              <div className="dock-main">
                <Pad label={`Forma ${hero.formName}`} onDown={(d) => hold("form", d)} cls="pad-md">
                  <span className="font-display text-xs leading-none">{hero.formName}</span>
                </Pad>
                <Pad label="Atirar" onDown={(d) => hold("attack", d)} cls="pad-md">
                  <span className="font-display text-sm">Tiro</span>
                </Pad>
                <Pad label="Golpe com a arma" onDown={(d) => hold("melee", d)} cls="pad-md">
                  <span className="relative font-display text-sm">
                    <span className="absolute inset-x-0 bottom-0 -z-0 bg-brass/30" style={{ height: `${snap.meleeCd > 0 ? Math.min(100, (snap.meleeCd / Math.max(0.1, snap.meleeMax)) * 100) : 0}%` }} />
                    Golpe
                  </span>
                </Pad>
                <Pad label="Pular" onDown={(d) => hold("jump", d)} cls="pad-xl">
                  <ArrowUp className="size-7" />
                </Pad>
              </div>
            </div>
          </div>
        )}
      </div>
      <p className="sr-only">
        Jogo de plataforma Bobina Negra. {playing ? `Jogando ${snap.reelName}.` : "Menu."}
      </p>
    </main>
  );
}

function CenterCard({ title, kicker, children }: { title: string; kicker: string; children: ReactNode }) {
  return (
    <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col menu-sec px-4 pb-6">
      <div className="flex flex-col gap-3 rounded-lg border border-brass/50 bg-panel/95 p-4">{childrenStart(kicker, title, children)}</div>
    </section>
  );
}

function childrenStart(kicker: string, title: string, children: ReactNode) {
  return (
    <>
      <div>
        <p className="text-xs tracking-widest text-brass">{kicker}</p>
        <h2 className="font-display text-3xl leading-none">{title}</h2>
      </div>
      {children}
    </>
  );
}

function StatList({ stats }: { stats: Snap["stats"] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 text-sm">
      {STAT_KEYS.map((k) => (
        <li key={k} className="rounded-md bg-ink px-2 py-1">
          <span className="text-paper/70">{STAT_INFO[k].name}</span>
          <span className="float-right text-brass">{stats[k]}</span>
        </li>
      ))}
    </ul>
  );
}

function layoutBag(bag: Item[]) {
  const cells: { item: Item; first: boolean }[] = [];
  for (const it of bag) {
    const n = itemSize(it);
    for (let i = 0; i < n; i++) cells.push({ item: it, first: i === 0 });
  }
  return cells;
}

function ItemChip({ it }: { it: Item }) {
  const b = baseOf(it);
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color: b.slot === "potion" ? b.color : RARITY_COLOR[it.rarity] }}>
      <ItemIcon item={it} size={26} ring={false} />
      {itemName(it)}
    </span>
  );
}

function ItemDetail({ it, equip, rt, onDone }: { it: Item; equip: Snap["equip"]; rt: Runtime | null; onDone: () => void }) {
  const b = baseOf(it);
  const info = itemInfo(it);
  const potion = b.slot === "potion";
  const cmp = compareItem(it, equip);
  const mods = describeMods(it);
  const edge = potion ? b.color : RARITY_COLOR[it.rarity]!;
  const setCount = b.set ? EQUIP_KEYS.filter((k) => equip[k] && BASE_BY_ID[equip[k]!.base]?.set === b.set).length : 0;
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-md p-1" style={{ background: `${edge}22`, boxShadow: `0 0 0 1px ${edge}` }}>
          <ItemIcon item={it} size={64} ring={false} />
        </div>
        <div className="min-w-0">
          <p className="font-display text-lg leading-tight" style={{ color: edge }}>
            {itemName(it)}
          </p>
          <p className="text-xs text-paper/70">
            {info.slotName} · <span style={{ color: edge }}>{info.rarityName}</span> · {info.sizeText}
          </p>
          {info.special && <p className="text-xs text-brass">★ Único: {info.special}</p>}
        </div>
      </div>
      <p className="mt-2 text-xs italic text-paper/75">“{info.flavor}”</p>
      {!potion && <p className="mt-1 text-[11px] text-paper/55">{info.rarityMeaning}</p>}
      {potion ? (
        <p className="mt-2 text-xs text-moon">{modText(it)}</p>
      ) : (
        <ul className="mt-2 grid gap-1">
          {mods.map((m) => {
            const d = cmp?.diff[m.key] ?? 0;
            return (
              <li key={m.key} className="rounded-sm bg-black/25 px-2 py-1 text-xs">
                <span className="font-display text-moon">
                  +{m.value} {m.key.toUpperCase()}
                </span>
                {cmp && cmp.current && d !== 0 && (
                  <span className={"ml-2 " + (d > 0 ? "text-emerald-300" : "text-rose-300")}>
                    ({d > 0 ? "+" : ""}
                    {d} vs equipado)
                  </span>
                )}
                <span className="block text-[11px] text-paper/60">{m.text}</span>
              </li>
            );
          })}
        </ul>
      )}
      {cmp && cmp.current && (
        <p className="mt-1 text-[11px] text-paper/55">
          Troca com: <span style={{ color: RARITY_COLOR[cmp.current.rarity] }}>{itemName(cmp.current)}</span>
        </p>
      )}
      {info.set && (
        <div className="mt-2 rounded-sm border border-brass/30 p-1.5 text-[11px]">
          <p className="text-brass">
            Conjunto {info.set.name} ({setCount} equipadas)
          </p>
          {info.set.bonus.map((t) => (
            <p key={t.n} className={setCount >= t.n ? "text-moon" : "text-paper/45"}>
              {t.n} peças: {t.text}
            </p>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-paper/60">
        <span className="text-paper/80">Onde cai:</span> {info.origin}
      </p>
      <p className="text-[11px] text-paper/60">
        <span className="text-paper/80">Como usar:</span> {info.how}
      </p>
      {info.tierText && <p className="text-[11px] text-paper/45">{info.tierText}</p>}
      {!potion && b.slot !== "gem" && <p className="text-[11px] text-paper/60">Encaixes livres: {it.sockets ?? 0}{it.gems && it.gems.length ? ` · pedras: ${it.gems.join(", ")}` : ""}</p>}
      <div className="mt-2 flex gap-2">
        {potion ? (
          <button type="button" onClick={() => rt?.useItem(it.uid)} className="min-h-10 rounded-md bg-blood px-3 font-display">
            Usar
          </button>
        ) : b.slot === "gem" ? (
          <p className="self-center text-xs text-moon">Pedra: encaixe pela Forja (marque como 2º item).</p>
        ) : (
          <button
            type="button"
            onClick={() => {
              rt?.equipItem(it.uid);
              onDone();
            }}
            className="min-h-10 rounded-md bg-blood px-3 font-display"
          >
            Equipar
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            rt?.discardItem(it.uid);
            onDone();
          }}
          className="min-h-10 rounded-md border border-paper/30 px-3"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}

function ForgePanel({ snap, a, b, pick2, setPick2, clear2, rt }: { snap: Snap; a: Item | null; b: Item | null; pick2: boolean; setPick2: (v: boolean) => void; clear2: () => void; rt: Runtime | null }) {
  const ba = a ? baseOf(a) : null;
  const gearA = Boolean(a && ba && ba.slot !== "potion" && ba.slot !== "gem");
  const bb = b ? baseOf(b) : null;
  const gearB = Boolean(b && bb && bb.slot !== "potion" && bb.slot !== "gem");
  const gemB = Boolean(bb && bb.slot === "gem");
  const chance = a && b && gearA && gearB ? Math.round(fuseChance(a, b) * 100) : 0;
  const keys = ["str", "int", "dex", "wis", "rec"] as const;
  void snap;
  return (
    <div className="mt-3 rounded-md border border-ember/50 bg-ink p-2 text-sm" style={{ borderColor: "#c4573a88" }}>
      <p className="font-display text-lg text-brass">Forja</p>
      <p className="text-[11px] text-paper/60">Toque num item da mochila (1º). Para fundir ou encaixar pedra, use “Escolher 2º” e toque no outro. Equipamentos vestidos não vão à forja: tire-os antes.</p>
      {!a || !gearA ? (
        <p className="mt-2 text-xs text-paper/50">Selecione um equipamento na mochila.</p>
      ) : (
        <div className="mt-2 grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="min-h-10 rounded-md bg-blood px-3 font-display" onClick={() => rt?.forgeUpgrade(a.uid)}>
              Forjar +1 ({Math.round(FORGE_CHANCE * 100)}% acerta · {Math.round(FORGE_CHANCE * 100)}% quebra)
            </button>
            <button type="button" className="min-h-10 rounded-md border border-paper/30 px-3" onClick={() => setPick2(!pick2)}>
              {pick2 ? "Toque no 2º item…" : "Escolher 2º item/pedra"}
            </button>
            {b && (
              <button type="button" className="min-h-10 rounded-md border border-paper/30 px-3 text-xs" onClick={clear2}>
                limpar 2º
              </button>
            )}
          </div>
          <p className="text-[11px] text-paper/70">
            1º: <span style={{ color: RARITY_COLOR[a.rarity] }}>{itemName(a)}</span> · encaixes livres: {a.sockets ?? 0}
            {a.gems && a.gems.length > 0 ? ` · pedras: ${a.gems.join(", ")}` : ""}
          </p>
          {b && (
            <p className="text-[11px] text-paper/70">
              2º: <span style={{ color: RARITY_COLOR[b.rarity] }}>{itemName(b)}</span>
            </p>
          )}
          {b && gearB && a.uid !== b.uid && (
            <button type="button" className="min-h-10 rounded-md bg-blood px-3 font-display" onClick={() => rt?.forgeFuse(a.uid, b.uid)}>
              Fundir os dois ({chance}% acerta; se falhar, os dois quebram)
            </button>
          )}
          {b && gemB && (
            <button type="button" className="min-h-10 rounded-md bg-blood px-3 font-display" onClick={() => rt?.forgeSocket(a.uid, b.uid)}>
              Encaixar {bb!.name} no 1º
            </button>
          )}
          {a.supreme && (
            <div className="rounded-sm border border-brass/50 p-1.5">
              <p className="text-xs text-brass">Matador de Deuses e Demônios: {a.free ?? 0} pontos livres</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {keys.map((k) => (
                  <button key={k} type="button" disabled={(a.free ?? 0) <= 0} className="min-h-9 rounded-sm border border-paper/30 px-2 text-xs disabled:opacity-40" onClick={() => rt?.forgeAlloc(a.uid, k)}>
                    +1 {k.toUpperCase()} ({a.mods[k] ?? 0})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CharSheet({ snap, sel, setSel, rt }: { snap: Snap; sel: number | null; setSel: (n: number | null) => void; rt: Runtime | null }) {
  const [sel2, setSel2] = useState<number | null>(null);
  const [pick2, setPick2] = useState(false);
  const cells = layoutBag(snap.bag);
  const chosen2 = snap.bag.find((i) => i.uid === sel2) ?? null;
  const chosen = snap.bag.find((i) => i.uid === sel) ?? null;
  const equipped = EQUIP_KEYS.map((k) => ({ slot: k, label: SLOT_LABEL[k], item: snap.equip[k] }));
  const hero = heroById(snap.hero);
  return (
    <section className="pointer-events-auto mx-auto flex min-h-full max-w-4xl flex-col menu-sec px-3 pb-4">
      <div className="max-h-[92dvh] overflow-y-auto rounded-lg border border-brass/50 bg-panel/97 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-brass">PERSONAGEM</p>
            <h2 className="font-display text-3xl leading-none">
              {hero.name} · Nv {snap.level}
            </h2>
            <p className="mt-1 text-sm text-paper/70">
              XP {snap.xp}/{snap.xpNeed} · {snap.maxHp} corações
            </p>
          </div>
          <Primary onClick={() => rt?.closeChar()}>Voltar</Primary>
        </div>
        <canvas data-hero-preview={snap.hero} className="pointer-events-none mx-auto mt-2 block h-44 w-full max-w-xs rounded-md bg-ink/60" />

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-xl text-brass">Atributos</h3>
              <span className={"text-sm " + (snap.points > 0 ? "text-moon" : "text-paper/50")}>{snap.points} pontos livres</span>
            </div>
            <ul className="mt-2 grid gap-2">
              {STAT_KEYS.map((k: StatKey) => {
                const info = STAT_INFO[k];
                const extra = snap.stats[k] - snap.alloc[k];
                return (
                  <li key={k} className="rounded-md border border-paper/15 bg-ink p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-lg">
                        <span className="text-brass">{info.abbr}</span> <span className="text-paper/70 text-sm">{info.name}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-display text-xl">{snap.stats[k]}</span>
                        <button type="button" disabled={snap.points < 1} onClick={() => rt?.allocate(k, 1)} className="min-h-10 min-w-10 rounded-md bg-blood font-display text-lg disabled:opacity-30" aria-label={`+1 ${info.name}`}>
                          +
                        </button>
                        <button type="button" disabled={snap.points < 5} onClick={() => rt?.allocate(k, 5)} className="min-h-10 rounded-md border border-brass/50 px-2 text-sm disabled:opacity-30" aria-label={`+5 ${info.name}`}>
                          +5
                        </button>
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-snug text-paper/65">{info.text}</p>
                    <p className="text-[11px] text-paper/45">
                      base {BASE_STATS[snap.hero][k]} + pontos {snap.alloc[k]}
                      {extra - BASE_STATS[snap.hero][k] !== 0 ? ` + equip. ${extra - BASE_STATS[snap.hero][k]}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex items-center justify-between">
              <button type="button" onClick={() => rt?.respec()} className="min-h-10 rounded-md border border-paper/25 px-3 text-sm text-paper/80">
                Redistribuir pontos
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {Object.entries(snap.derived).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-paper/10 py-0.5">
                  <dt className="text-paper/60">{k}</dt>
                  <dd className="text-moon">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="font-display text-xl text-brass">Equipado</h3>
            <ul className="mt-2 grid grid-cols-2 gap-1.5">
              {equipped.map((e) => (
                <li key={e.slot} className="flex min-h-14 items-center gap-2 rounded-md border border-paper/15 bg-ink p-1.5 text-sm" style={e.item ? { borderColor: RARITY_COLOR[e.item.rarity] } : undefined}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm bg-black/30">
                    {e.item ? <ItemIcon item={e.item} size={34} ring={false} /> : <span className="text-xs text-paper/25">▫</span>}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] uppercase tracking-wide text-paper/50">{e.label}</span>
                    {e.item ? (
                      <>
                        <span className="block truncate text-xs" style={{ color: RARITY_COLOR[e.item.rarity] }}>{itemName(e.item)}</span>
                        <span className="block truncate text-[11px] text-moon">{modText(e.item)}</span>
                      </>
                    ) : (
                      <span className="text-xs text-paper/35">vazio</span>
                    )}
                  </span>
                  {e.item && (
                    <button type="button" onClick={() => rt?.unequip(e.slot)} aria-label={`Tirar ${e.label}`} className="min-h-10 shrink-0 rounded-md border border-paper/25 px-2 text-xs">
                      Tirar
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-baseline justify-between">
              <h3 className="font-display text-xl text-brass">Mochila</h3>
              <span className={"text-sm " + (snap.bagUsed >= BAG_SIZE ? "text-blood" : "text-paper/70")}>
                {snap.bagUsed}/{BAG_SIZE} blocos
              </span>
            </div>
            <div className="mt-2 grid grid-cols-8 gap-1">
              {Array.from({ length: BAG_SIZE }, (_, i) => {
                const c = cells[i];
                if (!c) return <div key={i} className="aspect-square rounded-sm border border-paper/10 bg-ink/60" />;
                const b = baseOf(c.item);
                const color = b.slot === "potion" ? b.color : RARITY_COLOR[c.item.rarity]!;
                const on = sel === c.item.uid;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (pick2) {
                        setSel2(c.item.uid);
                        setPick2(false);
                      } else setSel(on ? null : c.item.uid);
                    }}
                    aria-label={itemName(c.item)}
                    className={"grid aspect-square place-items-center rounded-sm border " + (on ? "ring-2 ring-brass" : "")}
                    style={{ borderColor: color, background: `${color}26` }}
                  >
                    {c.first ? <ItemIcon item={c.item} size={30} ring={false} /> : <span style={{ color }} className="text-xs opacity-60">▪</span>}
                  </button>
                );
              })}
            </div>
            <ForgePanel snap={snap} a={chosen} b={chosen2} pick2={pick2} setPick2={setPick2} clear2={() => setSel2(null)} rt={rt} />
            <div className="mt-3 min-h-24 rounded-md border border-paper/15 bg-ink p-2 text-sm">
              {chosen ? (
                <ItemDetail it={chosen} equip={snap.equip} rt={rt} onDone={() => setSel(null)} />
              ) : (
                <p className="text-paper/50">Toque num item para ver detalhes, comparar com o que está equipado e entender de onde ele vem. Cada objeto ocupa blocos pelo tamanho, não pela quantidade.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Primary({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-12 rounded-md bg-blood px-4 font-display text-xl text-paper disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Ghost({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-12 rounded-md border border-paper/30 bg-ink px-4 text-paper"
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="hud-ico grid size-11 place-items-center rounded-md border border-paper/30 bg-panel text-paper"
    >
      {children}
    </button>
  );
}

function SkillButton({ skill, onDown }: { skill: Snap["skills"][number]; onDown: (d: boolean) => void }) {
  const ready = skill.unlocked && skill.cd <= 0;
  const pct = skill.unlocked ? Math.min(100, (skill.cd / Math.max(0.1, skill.cdMax)) * 100) : 100;
  return (
    <button
      type="button"
      aria-label={`${skill.name} (${skill.kind})${skill.unlocked ? "" : `, libera no nível ${skill.lv}`}`}
      disabled={!skill.unlocked}
      className={`skillbtn relative grid touch-none select-none place-items-center overflow-hidden rounded-md border px-1 py-0.5 text-paper ${ready ? "border-brass bg-panel/95" : "border-paper/25 bg-panel/80 opacity-80"}`}
      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* sem captura */
        }
        onDown(true);
      }}
      onPointerUp={() => onDown(false)}
      onPointerCancel={() => onDown(false)}
      onLostPointerCapture={() => onDown(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink/70" style={{ height: `${pct}%` }} />
      <span className="pointer-events-none relative text-[10px] leading-tight text-brass">{skill.key}</span>
      <span className="skillname pointer-events-none relative text-[10px] leading-tight">{skill.unlocked ? skill.name : `Nv ${skill.lv}`}</span>
    </button>
  );
}

function Pad({
  children,
  label,
  onDown,
  cls = "",
}: {
  children: ReactNode;
  label: string;
  onDown: (down: boolean) => void;
  cls?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={"pad grid touch-none select-none place-items-center rounded-lg border border-paper/30 bg-panel/85 text-paper " + cls}
      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none", touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        // mantém o dedo "preso" ao botão mesmo se escorregar para fora
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* sem suporte: segue sem captura */
        }
        onDown(true);
      }}
      onPointerUp={() => onDown(false)}
      onPointerCancel={() => onDown(false)}
      onLostPointerCapture={() => onDown(false)}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}


/** direcional único: arraste o polegar na base (8 direções), qualquer posição do aparelho */
function Stick({ hold }: { hold: (a: Action, d: boolean) => void }) {
  const knob = useRef<HTMLDivElement>(null);
  const st = useRef({ id: -1, l: false, r: false, u: false, d: false });
  const MAP = { l: "left", r: "right", u: "up", d: "down" } as const;
  const set = (k: "l" | "r" | "u" | "d", on: boolean) => {
    if (st.current![k] !== on) {
      st.current![k] = on;
      hold(MAP[k], on);
    }
  };
  const upd = (e: { currentTarget: HTMLDivElement; clientX: number; clientY: number }) => {
    const b = e.currentTarget.getBoundingClientRect();
    const rad = b.width / 2;
    const dx = e.clientX - (b.left + rad);
    const dy = e.clientY - (b.top + rad);
    const len = Math.hypot(dx, dy);
    const k = len > rad ? rad / len : 1;
    if (knob.current) knob.current.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const on = len > rad * 0.24;
    set("l", on && dx / len < -0.38);
    set("r", on && dx / len > 0.38);
    set("u", on && dy / len < -0.38);
    set("d", on && dy / len > 0.38);
  };
  const end = () => {
    st.current!.id = -1;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
    (["l", "r", "u", "d"] as const).forEach((k) => set(k, false));
  };
  return (
    <div
      role="group"
      aria-label="Direcional"
      className="pointer-events-auto relative touch-none select-none rounded-full border border-paper/30 bg-panel/55"
      style={{ width: "calc(var(--u) * 2.7)", height: "calc(var(--u) * 2.7)", touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
        st.current!.id = e.pointerId;
        upd(e);
      }}
      onPointerMove={(e) => { if (st.current!.id === e.pointerId) upd(e); }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="pointer-events-none absolute left-1/2 top-[7%] -translate-x-1/2 text-xs text-paper/40">▲</span>
      <span className="pointer-events-none absolute bottom-[7%] left-1/2 -translate-x-1/2 text-xs text-paper/40">▼</span>
      <span className="pointer-events-none absolute left-[7%] top-1/2 -translate-y-1/2 text-xs text-paper/40">◀</span>
      <span className="pointer-events-none absolute right-[7%] top-1/2 -translate-y-1/2 text-xs text-paper/40">▶</span>
      <div ref={knob} className="pointer-events-none absolute left-1/2 top-1/2 -ml-[calc(var(--u)*0.55)] -mt-[calc(var(--u)*0.55)] rounded-full border border-brass/70 bg-brass/30" style={{ width: "calc(var(--u) * 1.1)", height: "calc(var(--u) * 1.1)" }} />
    </div>
  );
}

/** esfera de ação: ícone no centro; escurece ao usar e clareia conforme recarrega */
function ActOrb({ icon, label, color = "#e0b15a", size, rad, ang, cd = 0, locked = false, tag, onDown }: { icon: ReactNode; label: string; color?: string; size: number; rad: number; ang: number; cd?: number; locked?: boolean; tag?: string; onDown: (d: boolean) => void }) {
  const a = (ang * Math.PI) / 180;
  const cx = 0.75 + rad * Math.cos(a);
  const cy = 0.75 + rad * Math.sin(a);
  const dark = locked ? 0.75 : Math.min(0.78, cd * 0.78);
  return (
    <button
      type="button"
      aria-label={label}
      disabled={locked}
      className="pointer-events-auto absolute grid touch-none select-none place-items-center overflow-hidden rounded-full border-2 text-paper"
      style={{ width: `calc(var(--u) * ${size})`, height: `calc(var(--u) * ${size})`, right: `calc(var(--u) * ${cx - size / 2})`, bottom: `calc(var(--u) * ${cy - size / 2})`, borderColor: cd > 0 || locked ? "rgba(255,255,255,.25)" : color, background: `radial-gradient(circle at 35% 30%, ${color}66, #120a10 78%)`, boxShadow: cd > 0 || locked ? "none" : `0 0 10px ${color}88`, touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sem captura */ }
        onDown(true);
      }}
      onPointerUp={() => onDown(false)}
      onPointerCancel={() => onDown(false)}
      onLostPointerCapture={() => onDown(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="pointer-events-none relative leading-none" style={{ fontSize: `calc(var(--u) * ${size * 0.5})` }}>{icon}</span>
      {tag && <span className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-[8px] leading-none text-brass/90">{tag}</span>}
      <span className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dark }} />
    </button>
  );
}

/** controles do mundo aberto: direcional único à esquerda e esferas em arco à direita (batem no canto do polegar) */
function OpenDock({ snap, hero, hold }: { snap: Snap; hero: (typeof HEROES)[number]; hold: (a: Action, d: boolean) => void }) {
  const arc1 = [8, 33, 58, 83];
  const arc2 = [4, 26, 48, 70];
  const p = snap.screen === "play";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between" style={{ padding: "0 max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left))" }}>
      <Stick hold={hold} />
      <div className="relative" style={{ width: "calc(var(--u) * 4.2)", height: "calc(var(--u) * 4.2)" }}>
        <ActOrb icon="⤒" label="Pular" size={1.5} rad={0} ang={0} color="#c4373a" onDown={(d) => hold("jump", d)} />
        <ActOrb icon="🎯" label="Atirar" size={0.9} rad={1.95} ang={arc1[0]!} tag="J" onDown={(d) => hold("attack", d)} />
        <ActOrb icon="⚔️" label="Golpe com a arma" size={0.9} rad={1.95} ang={arc1[1]!} cd={snap.meleeCd > 0 ? Math.min(1, snap.meleeCd / Math.max(0.1, snap.meleeMax)) : 0} tag="H" onDown={(d) => hold("melee", d)} />
        <ActOrb icon="✨" label={`Forma ${hero.formName}`} size={0.9} rad={1.95} ang={arc1[2]!} color={hero.accent} cd={snap.formActive ? 0 : snap.formCd > 0 ? 1 : 0} tag="K" onDown={(d) => hold("form", d)} />
        <ActOrb icon={<span className="text-blood">♥{snap.potions}</span>} label="Beber poção" size={0.8} rad={1.95} ang={arc1[3]!} color="#d0364a" tag="Q" onDown={(d) => hold("potion", d)} />
        {p && snap.skills.map((k, i) => (
          <ActOrb key={k.name + i} icon={k.icon ?? "✦"} label={`${k.name} (${k.kind})${k.unlocked ? "" : `, libera no nível ${k.lv}`}`} size={0.84} rad={3.05} ang={arc2[i]!} color={k.color ?? "#e0b15a"} cd={k.unlocked ? Math.min(1, k.cd / Math.max(0.1, k.cdMax)) : 1} locked={!k.unlocked} tag={k.key} onDown={(d) => hold(("s" + (i + 1)) as Action, d)} />
        ))}
      </div>
    </div>
  );
}

function Orb({ frac, c1, c2, label }: { frac: number; c1: string; c2: string; label: string }) {
  const f = Math.max(0, Math.min(1, frac));
  return (
    <div className="relative grid place-items-center overflow-hidden rounded-full border-2 border-black/70 shadow-lg" style={{ width: "clamp(40px, 10vmin, 62px)", height: "clamp(40px, 10vmin, 62px)", background: "#0b0b10" }}>
      <div className="absolute inset-x-0 bottom-0 transition-[height] duration-200" style={{ height: `${f * 100}%`, background: `linear-gradient(to top, ${c2}, ${c1})` }} />
      <div className="absolute inset-0 rounded-full" style={{ boxShadow: "inset 0 -6px 10px rgba(0,0,0,.45), inset 0 5px 8px rgba(255,255,255,.18)" }} />
      <span className="relative text-[11px] font-bold text-white" style={{ textShadow: "0 1px 2px #000" }}>{label}</span>
    </div>
  );
}

const terrainImageOnce = () => terrainImage();
function mapMarks(hud: NonNullable<Snap["open"]>) {
  const m = hud.map!;
  return {
    quests: [...m.places.filter((p) => p.k === "start" || p.k === "village").map((p) => ({ x: p.x, z: p.z })), ...m.marks.filter((k) => !k.got).map((k) => ({ x: k.x, z: k.z }))],
    dungeons: m.places.filter((p) => p.k === "mansion" || p.k === "castle").map((p) => ({ x: p.x, z: p.z })),
  };
}

/** balão "Conversar" sobre a cabeça do NPC: segue a projeção 3D a cada quadro, sem re-renderizar o React */
function TalkBubble({ onTalk }: { onTalk: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        el.style.opacity = talkScreen.on ? "1" : "0";
        el.style.left = `${Math.max(6, Math.min(94, talkScreen.x * 100))}%`;
        el.style.top = `${Math.max(8, Math.min(88, talkScreen.y * 100))}%`;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <button ref={ref} type="button" onClick={onTalk} aria-label="Conversar" className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-brass bg-ink/85 px-3 py-0.5 text-xs font-bold text-brass shadow-lg" style={{ opacity: 0 }}>
      Conversar
    </button>
  );
}

function MiniMap({ hud, size }: { hud: NonNullable<Snap["open"]>; size: number }) {
  const m = hud.map!;
  const img = terrainImageOnce();
  const ZR = 2900;
  const sz = size / 2 / ZR;
  const px = hud.wx * 48;
  const pz = hud.wz * 48;
  const X = (x: number) => size / 2 + (x - px) * sz;
  const Z = (z: number) => size / 2 + (z - pz) * sz;
  const mk = mapMarks(hud);
  const inView = (x: number, z: number) => Math.hypot(x - px, z - pz) < ZR * 0.93;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-full border-2 border-brass/70 bg-ink/80 shadow-lg">
      <defs><clipPath id="mmclip"><circle cx={size / 2} cy={size / 2} r={size / 2 - 1} /></clipPath></defs>
      <g clipPath="url(#mmclip)">
        <rect width={size} height={size} fill="#0e0c10" />
        {img && <image href={img.url} x={X(-img.R)} y={Z(-img.R)} width={2 * img.R * sz} height={2 * img.R * sz} style={{ imageRendering: "auto" }} />}
        {mk.quests.filter((q) => inView(q.x, q.z)).map((q, i) => <text key={`q${i}`} x={X(q.x)} y={Z(q.z) + 4} fontSize={12} fontWeight="bold" textAnchor="middle" fill="#ffd34a" stroke="#000" strokeWidth={0.7}>?</text>)}
        {mk.dungeons.filter((q) => inView(q.x, q.z)).map((q, i) => <text key={`d${i}`} x={X(q.x)} y={Z(q.z) + 4} fontSize={12} fontWeight="bold" textAnchor="middle" fill="#ffffff" stroke="#000" strokeWidth={0.7}>!</text>)}
        {inView(m.portal.x, m.portal.z) && <circle cx={X(m.portal.x)} cy={Z(m.portal.z)} r={4} fill="#ff2a2a" stroke="#fff" strokeWidth={1} />}
        {!inView(m.portal.x, m.portal.z) && (() => {
          // portal fora da vista: ponto vermelho na borda, na direção dele
          const a = Math.atan2(m.portal.z - pz, m.portal.x - px);
          return <circle cx={size / 2 + Math.cos(a) * (size / 2 - 6)} cy={size / 2 + Math.sin(a) * (size / 2 - 6)} r={3.5} fill="#ff2a2a" stroke="#fff" strokeWidth={1} />;
        })()}
        <path d={`M ${size / 2} ${size / 2 - 6} l 5 10 l -10 0 z`} fill="#7affc4" stroke="#000" strokeWidth={1} />
      </g>
    </svg>
  );
}

function LevelMap({ hud, onClose }: { hud: NonNullable<Snap["open"]>; onClose: () => void }) {
  const m = hud.map!;
  const S = 360;
  const sc = S / 2 / (m.R * 1.05);
  const X = (x: number) => S / 2 + x * sc;
  return (
    <section className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/80 p-3" onClick={onClose}>
      <div className="rounded-lg border border-brass/60 bg-panel/95 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between gap-4 text-sm text-paper">
          <span className="font-display text-lg">Mapa da fase</span>
          <button type="button" onClick={onClose} className="rounded-md border border-paper/30 px-3 py-1">Fechar [M]</button>
        </div>
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="max-h-[70vh] max-w-full rounded-md bg-ink">
          {terrainImageOnce() ? <image href={terrainImageOnce()!.url} x={0} y={0} width={S} height={S} /> : <circle cx={S / 2} cy={S / 2} r={m.R * sc} fill="#1d2a1c" />}
          <circle cx={S / 2} cy={S / 2} r={m.R * sc} fill="none" stroke="#8a6b2a" strokeWidth={2} />
          {mapMarks(hud).quests.map((q, i) => <text key={`q${i}`} x={X(q.x)} y={X(q.z) + 6} fontSize={18} fontWeight="bold" textAnchor="middle" fill="#ffd34a" stroke="#000" strokeWidth={0.8}>?</text>)}
          {mapMarks(hud).dungeons.map((q, i) => <text key={`d${i}`} x={X(q.x)} y={X(q.z) + 6} fontSize={18} fontWeight="bold" textAnchor="middle" fill="#ffffff" stroke="#000" strokeWidth={0.8}>!</text>)}
          <circle cx={X(m.portal.x)} cy={X(m.portal.z)} r={6} fill="#ff2a2a" stroke="#fff" strokeWidth={1.5} />
          <path d={`M ${X(hud.wx * 48)} ${X(hud.wz * 48) - 6} l 5 10 l -10 0 z`} fill="#7affc4" stroke="#000" strokeWidth={1} />
        </svg>
        <p className="mt-2 max-w-[320px] text-xs text-paper/70">Ponto vermelho: portal. ? (amarelo): missões e peças do enigma. ! (branco): dungeons especiais. Seta verde: você.</p>
      </div>
    </section>
  );
}

function MultiPanel({ rt, status }: { rt: Runtime | null; status: string }) {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"" | "host" | "join">("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg("");
    try { await fn(); } catch { setMsg("Não deu certo. Confira o código e tente de novo."); }
    setBusy(false);
  };
  const copy = () => { try { void navigator.clipboard.writeText(code); setMsg("Código copiado."); } catch { setMsg("Selecione o código e copie."); } };
  return (
    <div className="rounded-md border border-paper/20 bg-ink/70 p-3 text-xs leading-relaxed text-paper/80">
      <p>Jogue com um amigo, cada um no seu aparelho: vocês se veem no mesmo reino. Conectem aqui e depois os dois entram no mesmo reino.</p>
      <p className="mt-1 text-brass">Estado: {status === "connected" ? "conectado" : status === "waiting" ? "aguardando o amigo" : status === "error" ? "falhou" : "desconectado"}</p>
      {status !== "connected" && !mode && (
        <div className="mt-2 flex gap-2">
          <Primary onClick={() => run(async () => { setMode("host"); setCode(await rt!.netHost()); })} disabled={busy}>Criar sala</Primary>
          <Ghost onClick={() => setMode("join")}>Entrar em sala</Ghost>
        </div>
      )}
      {mode === "host" && status !== "connected" && (
        <div className="mt-2 space-y-2">
          <p>1) Envie este código ao amigo:</p>
          <textarea readOnly value={code} onFocus={(e) => e.currentTarget.select()} className="h-16 w-full rounded border border-paper/30 bg-black/40 p-1 text-[10px]" />
          <Ghost onClick={copy}>Copiar código</Ghost>
          <p>2) Cole aqui a resposta dele:</p>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} className="h-16 w-full rounded border border-paper/30 bg-black/40 p-1 text-[10px]" />
          <Primary onClick={() => run(() => rt!.netFinish(input))} disabled={busy || !input.trim()}>Conectar</Primary>
        </div>
      )}
      {mode === "join" && status !== "connected" && (
        <div className="mt-2 space-y-2">
          <p>1) Cole o código do anfitrião:</p>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} className="h-16 w-full rounded border border-paper/30 bg-black/40 p-1 text-[10px]" />
          <Primary onClick={() => run(async () => { setCode(await rt!.netJoin(input)); })} disabled={busy || !input.trim()}>Gerar resposta</Primary>
          {code && (
            <>
              <p>2) Envie esta resposta ao anfitrião:</p>
              <textarea readOnly value={code} onFocus={(e) => e.currentTarget.select()} className="h-16 w-full rounded border border-paper/30 bg-black/40 p-1 text-[10px]" />
              <Ghost onClick={copy}>Copiar resposta</Ghost>
            </>
          )}
        </div>
      )}
      {status === "connected" && <Ghost onClick={() => { rt?.netClose(); setMode(""); setCode(""); setInput(""); }}>Desconectar</Ghost>}
      {msg && <p className="mt-1 text-blood">{msg}</p>}
    </div>
  );
}

function NpcPanel({ npc, rt }: { npc: NonNullable<Snap["npc"]>; rt: Runtime | null }) {
  const [tab, setTab] = useState<"buy" | "sell" | "spell">(npc.role === "witch" ? "spell" : "buy");
  const title: Record<string, string> = { merchant: "Mercador", smith: "Ferreiro", witch: "Bruxa", quest: "Mensageiro", villager: "Aldeão", guard: "Guarda" };
  const shop = npc.role === "merchant" || npc.role === "smith" || npc.role === "witch";
  return (
    <section className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-ink/70 p-3">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-lg border border-brass/60 bg-panel/95 p-4 text-paper">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">{npc.name}</h2>
            <p className="text-xs text-brass">{title[npc.role] ?? ""} · Moedas: {npc.gold}</p>
          </div>
          <button type="button" onClick={() => rt?.npcClose()} className="rounded-md border border-paper/30 px-3 py-1 text-sm">Sair [E]</button>
        </div>
        <p className="mt-2 text-sm italic text-paper/80">“{npc.text}”</p>
        {npc.quest && (
          <div className="mt-3 min-h-0 space-y-2 overflow-y-auto rounded-md border border-brass/40 bg-ink/60 p-3 text-sm">
            {npc.quest.active ? (
              <>
                <p className="font-bold">{npc.quest.title}</p>
                <p className="text-paper/70">Recompensa: {npc.quest.reward}</p>
                <p className="text-brass">Progresso: {npc.quest.prog}/{npc.quest.goal}</p>
                <div className="mt-2 flex gap-2">
                  <Primary onClick={() => rt?.npcQuest()} disabled={!npc.quest.ready}>{npc.quest.ready ? "Entregar missão" : "Ainda não terminou"}</Primary>
                  <Ghost onClick={() => rt?.npcQuestAbandon()}>Abandonar</Ghost>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-paper/60">Escolha um trabalho. Quanto mais difícil, maior a recompensa.</p>
                {npc.quest.offers.map((o) => (
                  <div key={o.tier} className="rounded-md border border-paper/20 p-2">
                    <p className="font-bold">{o.label}: {o.title}</p>
                    <p className="text-xs text-paper/70">Recompensa: {o.reward}</p>
                    <div className="mt-1 flex gap-2">
                      <Primary onClick={() => rt?.npcQuest(o.tier)}>Aceitar</Primary>
                      <Ghost onClick={() => rt?.npcClose()}>Recusar</Ghost>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {shop && (
          <>
            <div className="mt-3 flex gap-2">
              {npc.spells && <button type="button" onClick={() => setTab("spell")} className={`rounded-md border px-3 py-1 text-sm ${tab === "spell" ? "border-brass bg-brass text-ink" : "border-paper/30"}`}>Grimórios</button>}
              <button type="button" onClick={() => setTab("buy")} className={`rounded-md border px-3 py-1 text-sm ${tab === "buy" ? "border-brass bg-brass text-ink" : "border-paper/30"}`}>Comprar</button>
              <button type="button" onClick={() => setTab("sell")} className={`rounded-md border px-3 py-1 text-sm ${tab === "sell" ? "border-brass bg-brass text-ink" : "border-paper/30"}`}>Vender</button>
            </div>
            <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {tab === "spell" && npc.spells?.map((sp) => (
                <li key={sp.id} className="rounded-md border border-paper/15 bg-ink/50 px-2 py-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0"><span className="block truncate font-bold text-brass">{sp.name} <span className="text-xs text-paper/60">· {sp.tag} · nível {sp.lv}/5</span></span><span className="block truncate text-xs text-paper/60">{sp.text}</span></span>
                    <button type="button" disabled={sp.lv >= 5 || npc.gold < sp.price} onClick={() => rt?.spellBuy(sp.id)} className="shrink-0 rounded-md border border-brass px-2 py-1 text-xs text-brass disabled:opacity-40">{sp.lv === 0 ? `Aprender ${sp.price}` : sp.lv >= 5 ? "Máximo" : `Aprimorar ${sp.price}`}</button>
                  </div>
                  {sp.lv > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-paper/70">
                      Equipar em:
                      {["U", "I", "O", "P"].map((k, s) => (
                        <button key={k} type="button" onClick={() => rt?.spellEquip(sp.id, sp.slot === s ? -1 : s)} className={`h-7 w-7 rounded border ${sp.slot === s ? "border-brass bg-brass text-ink" : "border-paper/30"}`}>{k}</button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {tab === "buy" && npc.stock.length === 0 && <li className="text-sm text-paper/60">Estoque esgotado.</li>}
              {tab === "buy" && npc.stock.map((it) => (
                <li key={it.i} className="flex items-center justify-between gap-2 rounded-md border border-paper/15 bg-ink/50 px-2 py-1.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-bold" style={{ color: it.color }}>{it.label}</span><span className="block truncate text-xs text-paper/60">{it.info}</span></span>
                  <button type="button" disabled={npc.gold < it.price} onClick={() => rt?.npcBuy(it.i)} className="shrink-0 rounded-md border border-brass px-2 py-1 text-xs text-brass disabled:opacity-40">{it.price} moedas</button>
                </li>
              ))}
              {tab === "sell" && npc.sell.length === 0 && <li className="text-sm text-paper/60">A mochila está vazia.</li>}
              {tab === "sell" && npc.sell.map((it) => (
                <li key={it.uid} className="flex items-center justify-between gap-2 rounded-md border border-paper/15 bg-ink/50 px-2 py-1.5 text-sm">
                  <span className="min-w-0 truncate font-bold" style={{ color: it.color }}>{it.label}</span>
                  <button type="button" onClick={() => rt?.npcSell(it.uid)} className="shrink-0 rounded-md border border-brass px-2 py-1 text-xs text-brass">+{it.price}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

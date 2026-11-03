import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Pause, Volume2, VolumeX } from "./icons";
import { CAM_MODES } from "../game/types";
import { BONUS_NAMES, HEROES, MODES, REEL_NAMES, REGIONS, heroById } from "../game/content";
import { FORGE_CHANCE, BASE_BY_ID, fuseChance, RARITY_COLOR, RARITY_NAME, baseOf, compareItem, describeMods, itemInfo, itemName, itemSize, modText } from "../game/items";
import { ItemIcon } from "./ItemIcon";
import { BASE_STATS, STAT_INFO } from "../game/stats";
import { createRuntime, type Runtime } from "../game/runtime";
import { BAG_SIZE, EMPTY_STATS, EQUIP_KEYS, SLOT_LABEL, STAT_KEYS, type Action, type Item, type Snap, type StatKey } from "../game/types";

const BOOT: Snap = {
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
                  {snap.reel > 35 ? "Mundo" : snap.bonus ? "Bis" : "Reino"} {snap.reel > 35 ? "" : snap.bonus ? snap.reel - 25 : snap.reel}
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
              <div className="pointer-events-none flex items-center gap-3 rounded-md border border-paper/20 bg-panel/80 px-3 py-1.5 text-xs text-paper/90">
                <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-brass/60" aria-label="Bússola do próximo portal">
                  <span className="absolute text-[9px] text-paper/50" style={{ top: 1 }}>N</span>
                  <span className="block h-0 w-0 border-x-[5px] border-b-[13px] border-x-transparent border-b-brass" style={{ transform: `rotate(${snap.open.rel}rad)`, transformOrigin: "50% 70%" }} />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-paper">{snap.open.region}</span>
                  <span className="block text-paper/60">Portal: {snap.open.target} · {snap.open.dist} passos · X {snap.open.wx} Z {snap.open.wz} · {snap.open.night > 0.5 ? "Noite" : snap.open.night > 0.15 ? "Anoitecendo" : "Dia"}</span>
                  {snap.open.map && <span className="block text-brass">Moedas {snap.open.gold} · Peças do enigma {snap.open.parts}/3</span>}
                  {snap.open.talk && <span className="block text-paper">Perto: {snap.open.talk}</span>}
                  {snap.open.hazard && <span className="block font-bold text-blood">Perigo: {snap.open.hazard}</span>}
                </span>
                <span className="pointer-events-auto ml-auto flex gap-1">
                  {snap.open.talk && <button type="button" onClick={() => rtRef.current?.interact()} className="hud-ico min-h-9 rounded-md border border-brass bg-brass px-3 text-xs font-bold text-ink">Falar [E]</button>}
                  {snap.open.map && <button type="button" aria-label="Abrir mapa da fase" onClick={() => setShowMap((v) => !v)} className="hud-ico min-h-9 rounded-md border border-paper/30 bg-panel px-2 text-xs text-paper">Mapa</button>}
                  <button type="button" aria-label="Girar câmera para a esquerda" onClick={() => rtRef.current?.camRot(-1)} className="hud-ico grid size-9 place-items-center rounded-md border border-paper/30 bg-panel text-base text-paper">⟲</button>
                  <button type="button" aria-label="Girar câmera para a direita" onClick={() => rtRef.current?.camRot(1)} className="hud-ico grid size-9 place-items-center rounded-md border border-paper/30 bg-panel text-base text-paper">⟳</button>
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
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
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel">
              <div className="h-full bg-brass" style={{ width: `${Math.min(100, (snap.xp / Math.max(1, snap.xpNeed)) * 100)}%` }} />
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-panel">
              <div className="h-full bg-blood" style={{ width: `${Math.min(100, snap.progress * 100)}%` }} />
            </div>
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

        <div className="pointer-events-auto min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {snap.screen === "title" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col menu-sec px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-ink/60 p-5 shadow-lg backdrop-blur-sm">
                <p className="text-xs tracking-widest text-brass">ESPETÁCULO ORIGINAL · TINTA E OSSO</p>
                <h1 className="mt-2 font-display text-5xl leading-none text-paper">Bobina Negra</h1>
                <p className="mt-3 text-base leading-relaxed text-paper/80">
                  Vinte e cinco reinos em mundo aberto: vilarejos, mansões, castelos e florestas para explorar. Três peças em cada reino abrem o portal para o próximo. Um contrato que ninguém leu até a cláusula final.
                </p>
                <p className="mt-2 text-xs text-paper/40">v11.1 · vilas vivas {typeof __BUILD__ === "string" ? __BUILD__ : "dev"}</p>
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
                  <span className="text-brass">{selected.formName}. </span>
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
                    <button type="button" onClick={() => rtRef.current?.enterReel(35)} className="mt-1 min-h-12 w-full rounded-md border border-brass bg-ink px-3 text-left text-sm text-paper">
                      Explorar livremente: planície com os 25 portais, monstros, baús e ruínas
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm text-moon">Bis (tesouros)</h3>
                    <div className="mt-1 grid grid-cols-6 gap-1.5">
                      {Array.from({ length: 10 }, (_, k) => {
                        const n = 26 + k;
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
                <p className="mt-3 font-display text-xl">{pick > 25 ? `Bis: ${BONUS_NAMES[pick - 26] ?? ""}` : `${pick}. ${REEL_NAMES[pick - 1]}`}</p>
                <p className="text-sm text-paper/70">
                  {pick > 25 ? "Mapa de tesouro: baús e poucos monstros. Sem chefe." : "Reino aberto: três andares, cômodos com guardiões, portões que só abrem quando o guardião cai e um chefe no fim. Explore em profundidade."}
                </p>
                <div className="mt-3">
                  <Primary onClick={() => rtRef.current?.enterReel(pick - 1)} disabled={pick > 25 ? snap.bonusOpen < pick - 25 : pick > snap.next}>
                    {pick > 25 ? `Entrar no bis ${pick - 25}` : `Entrar no reino ${pick}`}
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

        {playing && (
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


function LevelMap({ hud, onClose }: { hud: NonNullable<Snap["open"]>; onClose: () => void }) {
  const m = hud.map!;
  const S = 320;
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
          <circle cx={S / 2} cy={S / 2} r={m.R * sc} fill="#1d2a1c" stroke="#8a6b2a" strokeWidth={2} />
          {m.places.slice(1).map((p, i) => <line key={`l${i}`} x1={X(m.places[0]!.x)} y1={X(m.places[0]!.z)} x2={X(p.x)} y2={X(p.z)} stroke="#6b5a3a" strokeWidth={2} strokeDasharray="4 3" />)}
          {m.places.map((p, i) => (
            <g key={i}>
              <rect x={X(p.x) - 5} y={X(p.z) - 5} width={10} height={10} fill={p.k === "mansion" ? "#a5324a" : "#d9b36a"} />
              <text x={X(p.x) + 8} y={X(p.z) + 3} fontSize={8} fill="#e8dcc0">{p.k === "start" ? "Início" : p.k === "mansion" ? "Mansão" : p.n}</text>
            </g>
          ))}
          {m.marks.map((k, i) => (
            <g key={`k${i}`}>
              <circle cx={X(k.x)} cy={X(k.z)} r={6} fill={k.got ? "#4a7a3a" : "#ffcc33"} stroke="#000" />
              <text x={X(k.x) - 3} y={X(k.z) + 3} fontSize={8} fill="#000">{i + 1}</text>
            </g>
          ))}
          <circle cx={X(m.portal.x)} cy={X(m.portal.z)} r={8} fill="none" stroke={m.portal.open ? "#7affc4" : "#7a5aff"} strokeWidth={3} />
          <circle cx={X(hud.wx * 48)} cy={X(hud.wz * 48)} r={4} fill="#ff4d4d" stroke="#fff" />
        </svg>
        <p className="mt-2 max-w-[320px] text-xs text-paper/70">Quadrado dourado: vilarejo. Vermelho: mansão. Círculo numerado: peça do enigma (amarelo = falta, verde = conquistada). Anel roxo/verde: portal. Ponto vermelho: você.</p>
      </div>
    </section>
  );
}

function NpcPanel({ npc, rt }: { npc: NonNullable<Snap["npc"]>; rt: Runtime | null }) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
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
          <div className="mt-3 rounded-md border border-brass/40 bg-ink/60 p-3 text-sm">
            <p className="font-bold">{npc.quest.title}</p>
            <p className="text-paper/70">Recompensa: {npc.quest.reward}</p>
            {npc.quest.active && <p className="text-brass">Progresso: {npc.quest.prog}/{npc.quest.goal}</p>}
            <div className="mt-2">
              {!npc.quest.active && <Primary onClick={() => rt?.npcQuest()}>Aceitar missão</Primary>}
              {npc.quest.active && <Primary onClick={() => rt?.npcQuest()} disabled={!npc.quest.ready}>{npc.quest.ready ? "Entregar missão" : "Ainda não terminou"}</Primary>}
            </div>
          </div>
        )}
        {shop && (
          <>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setTab("buy")} className={`rounded-md border px-3 py-1 text-sm ${tab === "buy" ? "border-brass bg-brass text-ink" : "border-paper/30"}`}>Comprar</button>
              <button type="button" onClick={() => setTab("sell")} className={`rounded-md border px-3 py-1 text-sm ${tab === "sell" ? "border-brass bg-brass text-ink" : "border-paper/30"}`}>Vender</button>
            </div>
            <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
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

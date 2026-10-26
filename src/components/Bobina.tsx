import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Pause, Volume2, VolumeX } from "./icons";
import { BONUS_NAMES, HEROES, MODES, REEL_NAMES, WORLDS, heroById } from "../game/content";
import { BASE_BY_ID, RARITY_COLOR, RARITY_NAME, baseOf, itemName, itemSize, modText } from "../game/items";
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
  const line = snap.lines[snap.lineIndex];
  const playing = snap.screen === "play";

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
                  {snap.bonus ? "Bis" : "Rolo"} {snap.bonus ? snap.reel - 50 : snap.reel}
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
                  <IconButton label="Pausar" onClick={() => rtRef.current?.pause()}>
                    <Pause className="size-5" />
                  </IconButton>
                )}
              </div>
            </div>
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

        <div className="min-h-0 flex-1 overflow-y-auto">
          {snap.screen === "title" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col menu-sec px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-panel/95 p-5 shadow-lg">
                <p className="text-xs tracking-widest text-brass">ESPETÁCULO ORIGINAL · TINTA E OSSO</p>
                <h1 className="mt-2 font-display text-5xl leading-none text-paper">Bobina Negra</h1>
                <p className="mt-3 text-base leading-relaxed text-paper/80">
                  Cinquenta rolos longos, dez bis de tesouro, chefes de sobra. Oito amaldiçoados. Um contrato que ninguém leu até a cláusula final.
                </p>
                <p className="mt-2 text-xs text-paper/40">v6 · build {typeof __BUILD__ === "string" ? __BUILD__ : "dev"}</p>
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
                  <li>A cada 5 rolos abre um Bis: mapa bônus cheio de baús. Mini-chefes aparecem no meio de alguns rolos.</li>
                  <li>No telefone, use os botões. De lado cabe mais picadeiro.</li>
                </ul>
                <div className="mt-4">
                  <Primary onClick={() => rtRef.current?.openHelp(false)}>Fechar o regulamento</Primary>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "cast" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-3xl flex-col menu-sec gap-3 px-4 pb-6">
              <div className="rounded-lg border border-brass/40 bg-panel/95 p-4">
                <h2 className="font-display text-3xl">Quem assina</h2>
                <p className="mt-1 text-sm text-paper/75">Os outros sete ficam no camarim, comentando. Você entra no rolo.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {HEROES.map((h) => {
                    const on = snap.selectedHero === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => rtRef.current?.pickHero(h.id)}
                        className={
                          "rounded-md border p-2 text-left " +
                          (on ? "border-brass bg-ink" : "border-paper/20 bg-ink/40")
                        }
                      >
                        <canvas data-hero-preview={h.id} className="pointer-events-none h-24 w-full rounded-sm" />
                        <span className="mt-1 block font-display text-lg leading-tight">{h.name}</span>
                        <span className="block text-xs text-brass">{h.role}</span>
                        <span className="mt-1 block text-xs leading-snug text-paper/75">{h.blurb}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-sm text-paper/80">
                  <span className="text-brass">{selected.formName}. </span>
                  {selected.voice} {selected.attack}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Primary onClick={() => rtRef.current?.openMode(snap.selectedHero)}>Assinar com {selected.name}</Primary>
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
                  {WORLDS.map((world) => {
                    const bonusN = 51 + world.id;
                    const bonusLocked = snap.bonusOpen <= world.id;
                    return (
                      <div key={world.id}>
                        <h3 className="text-sm text-brass">
                          {world.id + 1}. {world.name}
                        </h3>
                        <div className="mt-1 grid grid-cols-6 gap-1.5">
                          {Array.from({ length: 5 }, (_, k) => {
                            const n = world.id * 5 + k + 1;
                            const locked = n > snap.next;
                            const on = pick === n;
                            const boss = k === 4;
                            const mini = k === 2;
                            return (
                              <button
                                key={n}
                                type="button"
                                disabled={locked}
                                onClick={() => setPick(n)}
                                className={
                                  "min-h-12 rounded-md border text-sm " +
                                  (locked ? "border-paper/10 text-paper/30" : on ? "border-brass bg-brass text-ink" : "border-paper/25 bg-ink text-paper")
                                }
                              >
                                {n}
                                {boss ? <span className="block text-xs leading-none">chefe</span> : mini ? <span className="block text-xs leading-none">mini</span> : null}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            disabled={bonusLocked}
                            onClick={() => setPick(bonusN)}
                            className={
                              "min-h-12 rounded-md border text-sm " +
                              (bonusLocked ? "border-paper/10 text-paper/30" : pick === bonusN ? "border-moon bg-moon text-ink" : "border-moon/60 bg-ink text-moon")
                            }
                          >
                            ★<span className="block text-xs leading-none">bis</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 font-display text-xl">{pick > 50 ? `Bis: ${BONUS_NAMES[pick - 51] ?? ""}` : REEL_NAMES[pick - 1]}</p>
                <p className="text-sm text-paper/70">
                  {pick > 50 ? "Mapa de tesouro: baús e poucos monstros. Sem chefe." : pick % 5 === 0 ? "Chefe no fim do rolo. " : pick % 5 === 3 ? "Tem mini-chefe no caminho. " : "Travessia longa, com lanternas no caminho."}
                </p>
                <div className="mt-3">
                  <Primary onClick={() => rtRef.current?.enterReel(pick - 1)} disabled={pick > 50 ? snap.bonusOpen < pick - 50 : pick > snap.next}>
                    {pick > 50 ? `Entrar no bis ${pick - 50}` : `Entrar no rolo ${pick}`}
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
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-2xl flex-col menu-sec px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-panel/95 p-4">
                <p className="text-xs tracking-widest text-brass">COMO VOCÊ QUER SER SERVIDO?</p>
                <h2 className="font-display text-3xl leading-none">Ponto da panela</h2>
                <p className="mt-1 text-sm text-paper/70">Muda a vida e a força dos monstros, o dano que você leva e o tesouro que cai. Dá para trocar depois, no Arquivo.</p>
                <div className="mt-3 grid gap-2">
                  {MODES.map((m, i) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => rtRef.current?.setMode(i)}
                      className={"rounded-md border bg-ink p-3 text-left " + (snap.mode === i ? "ring-2 ring-brass" : "")}
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
                Cinquenta rolos queimados. O Empresário assinou a própria rescisão. Os quatro podem sair; o arquivo fica. Os bis e os rolos antigos continuam no mapa — teimosia também é um atributo.
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
                <Pad label="Descer plataforma" onDown={(d) => hold("down", d)} cls="pad-sm">
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

function CharSheet({ snap, sel, setSel, rt }: { snap: Snap; sel: number | null; setSel: (n: number | null) => void; rt: Runtime | null }) {
  const cells = layoutBag(snap.bag);
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
                    onClick={() => setSel(on ? null : c.item.uid)}
                    aria-label={itemName(c.item)}
                    className={"grid aspect-square place-items-center rounded-sm border " + (on ? "ring-2 ring-brass" : "")}
                    style={{ borderColor: color, background: `${color}26` }}
                  >
                    {c.first ? <ItemIcon item={c.item} size={30} ring={false} /> : <span style={{ color }} className="text-xs opacity-60">▪</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 min-h-24 rounded-md border border-paper/15 bg-ink p-2 text-sm">
              {chosen ? (
                <>
                  <p className="font-display text-lg">
                    <ItemChip it={chosen} />
                  </p>
                  <p className="text-xs text-paper/60">
                    {baseOf(chosen).slot === "potion" ? "Consumível" : RARITY_NAME[chosen.rarity]} · {itemSize(chosen)} bloco(s)
                  </p>
                  <p className="text-xs text-paper/75">{BASE_BY_ID[chosen.base]?.text}</p>
                  <p className="text-xs text-moon">{modText(chosen)}</p>
                  <div className="mt-2 flex gap-2">
                    {baseOf(chosen).slot === "potion" ? (
                      <button type="button" onClick={() => rt?.useItem(chosen.uid)} className="min-h-10 rounded-md bg-blood px-3 font-display">
                        Usar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          rt?.equipItem(chosen.uid);
                          setSel(null);
                        }}
                        className="min-h-10 rounded-md bg-blood px-3 font-display"
                      >
                        Equipar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        rt?.discardItem(chosen.uid);
                        setSel(null);
                      }}
                      className="min-h-10 rounded-md border border-paper/30 px-3"
                    >
                      Descartar
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-paper/50">Toque num item para ver detalhes. Cada objeto ocupa blocos pelo tamanho, não pela quantidade.</p>
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


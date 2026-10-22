import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Heart, Pause, Volume2, VolumeX } from "./icons";
import { HEROES, REEL_NAMES, UPGRADES, WORLDS, heroById } from "../game/content";
import { createRuntime, type Runtime } from "../game/runtime";
import { EMPTY_STATS, type Action, type Snap, type StatKey } from "../game/types";

const BOOT: Snap = {
  screen: "title",
  hasSave: false,
  hero: "ivo",
  selectedHero: "ivo",
  next: 1,
  level: 1,
  xp: 0,
  xpNeed: 40,
  stats: { ...EMPTY_STATS },
  hp: 5,
  maxHp: 5,
  reel: 0,
  reelName: "",
  worldName: "",
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
  choices: [],
  deadLine: "",
  toast: "",
  mute: false,
  clearText: "",
  time: 0,
  best: 0,
  hint: false,
  progress: 0,
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
    if (snap.screen === "map") setPick(Math.min(25, Math.max(1, snap.next)));
  }, [snap.screen, snap.next]);

  const hero = heroById(snap.hero);
  const selected = heroById(snap.selectedHero);
  const line = snap.lines[snap.lineIndex];
  const playing = snap.screen === "play";

  function hold(action: Action, down: boolean) {
    rtRef.current?.setHold(action, down);
  }

  return (
    <main className="sprocket relative h-dvh select-none overflow-hidden bg-ink font-sans text-paper" onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-hidden />
      <div className="safe-top pointer-events-none absolute inset-0 flex flex-col">
        {(playing || snap.screen === "pause" || snap.screen === "dead" || snap.screen === "levelup") && (
          <header className="pointer-events-none flex flex-col gap-2 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg leading-none text-brass">
                  Rolo {snap.reel}
                  <span className="text-paper"> · {snap.reelName}</span>
                </p>
                <p className="mt-1 text-sm text-paper/75">
                  {snap.worldName} · Nv {snap.level} · {clock(snap.time)}
                </p>
              </div>
              <div className="pointer-events-auto flex gap-2">
                <IconButton label={snap.mute ? "Ativar som" : "Silenciar"} onClick={() => rtRef.current?.toggleMute()}>
                  {snap.mute ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </IconButton>
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
                A e D movem. Espaço pula. J atira. K é a forma. U, I, O e P usam os poderes (liberam com o nível). S desce da plataforma.
              </p>
            )}
          </header>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {snap.screen === "title" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col justify-end px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-panel/95 p-5 shadow-lg">
                <p className="text-xs tracking-widest text-brass">ESPETÁCULO ORIGINAL · TINTA E OSSO</p>
                <h1 className="mt-2 font-display text-5xl leading-none text-paper">Bobina Negra</h1>
                <p className="mt-3 text-base leading-relaxed text-paper/80">
                  Vinte e cinco rolos longos. Quatro amaldiçoados. Um contrato que ninguém leu até a cláusula final.
                </p>
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
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col justify-end px-4 pb-6">
              <div className="rounded-lg border border-brass/50 bg-panel/95 p-5">
                <h2 className="font-display text-3xl">Como se joga</h2>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-paper/85">
                  <li>A / ← esquerda. D / → direita. Não inverte.</li>
                  <li>Espaço, W ou ↑ pulam. Segurar pula mais alto. Soltar cedo encurta.</li>
                  <li>J ou Z atiram. Cada alma atira diferente.</li>
                  <li>K, L ou Shift ativam a forma: uivo, asas, caveira ou elfa.</li>
                  <li>S ou ↓ em cima de uma tábua solta deixa você cair por ela.</li>
                  <li>Molas lançam. Espinhos e buracos cobram coração. Lanternas gravam o retorno.</li>
                  <li>Matar e queimar rolos sobe nível. Escolha um atributo. A fase não é curta de propósito pequeno: é travessia.</li>
                  <li>No telefone, use os botões. De lado cabe mais picadeiro.</li>
                </ul>
                <div className="mt-4">
                  <Primary onClick={() => rtRef.current?.openHelp(false)}>Fechar o regulamento</Primary>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "cast" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-3 px-4 pb-6">
              <div className="rounded-lg border border-brass/40 bg-panel/95 p-4">
                <h2 className="font-display text-3xl">Quem assina</h2>
                <p className="mt-1 text-sm text-paper/75">Os outros três ficam no camarim, comentando. Você entra no rolo.</p>
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
                  <Primary onClick={() => rtRef.current?.newGame(snap.selectedHero)}>Assinar com {selected.name}</Primary>
                  <Ghost onClick={() => rtRef.current?.backTitle()}>Voltar</Ghost>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "map" && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-3xl flex-col justify-end px-4 pb-6">
              <div className="rounded-lg border border-brass/40 bg-panel/95 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl">Arquivo</h2>
                    <p className="text-sm text-paper/75">
                      {hero.name} · nível {snap.level}
                    </p>
                  </div>
                  <Ghost onClick={() => rtRef.current?.backTitle()}>Título</Ghost>
                </div>
                <div className="mt-3 grid gap-3">
                  {WORLDS.map((world) => (
                    <div key={world.id}>
                      <h3 className="text-sm text-brass">{world.name}</h3>
                      <div className="mt-1 grid grid-cols-5 gap-1.5">
                        {Array.from({ length: 5 }, (_, k) => {
                          const n = world.id * 5 + k + 1;
                          const locked = n > snap.next;
                          const on = pick === n;
                          const boss = k === 4;
                          return (
                            <button
                              key={n}
                              type="button"
                              disabled={locked}
                              onClick={() => setPick(n)}
                              className={
                                "min-h-12 rounded-md border text-sm " +
                                (locked
                                  ? "border-paper/10 text-paper/30"
                                  : on
                                    ? "border-brass bg-brass text-ink"
                                    : "border-paper/25 bg-ink text-paper")
                              }
                            >
                              {n}
                              {boss ? <span className="block text-xs leading-none">chefe</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-display text-xl">{REEL_NAMES[pick - 1]}</p>
                <p className="text-sm text-paper/70">
                  {pick % 5 === 0 ? "Chefe no fim do rolo. " : ""}
                  Travessia longa, com lanternas no caminho.
                </p>
                <div className="mt-3">
                  <Primary onClick={() => rtRef.current?.enterReel(pick - 1)} disabled={pick > snap.next}>
                    Entrar no rolo {pick}
                  </Primary>
                </div>
              </div>
            </section>
          )}

          {snap.screen === "talk" && line && (
            <section className="pointer-events-auto mx-auto flex min-h-full max-w-xl flex-col justify-end px-4 pb-6">
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

          {snap.screen === "pause" && (
            <CenterCard title="Pausa" kicker={hero.name}>
              <StatList stats={snap.stats} />
              <p className="text-sm text-paper/75">
                Forma {hero.formName}
                {snap.formActive ? ` ativa (${snap.formLeft.toFixed(1)}s)` : snap.formCd > 0 ? ` em ${snap.formCd.toFixed(1)}s` : " pronta"}.
              </p>
              <Primary onClick={() => rtRef.current?.resume()}>Voltar ao rolo</Primary>
              <Ghost onClick={() => rtRef.current?.toggleMute()}>{snap.mute ? "Ligar som" : "Silenciar"}</Ghost>
              <Ghost onClick={() => rtRef.current?.quitToMap()}>Sair para o arquivo</Ghost>
            </CenterCard>
          )}

          {snap.screen === "levelup" && (
            <CenterCard title={`Nível ${snap.level}`} kicker="O contrato oferece uma emenda">
              <div className="grid gap-2">
                {snap.choices.map((id, i) => {
                  const u = UPGRADES.find((x) => x.id === id);
                  if (!u) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => rtRef.current?.chooseUpgrade(id)}
                      className="rounded-md border border-brass/40 bg-ink p-3 text-left"
                    >
                      <span className="font-display text-xl text-brass">
                        {i + 1}. {u.name}
                      </span>
                      <span className="mt-1 block text-sm text-paper/80">{u.text}</span>
                      <span className="mt-1 block text-xs text-moon">agora {snap.stats[id]}</span>
                    </button>
                  );
                })}
              </div>
            </CenterCard>
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
              <Primary onClick={() => rtRef.current?.quitToMap()}>
                {snap.reel >= 25 ? "Ir ao epílogo" : "Voltar ao arquivo"}
              </Primary>
            </CenterCard>
          )}

          {snap.screen === "ending" && (
            <CenterCard title="Rescisão carimbada" kicker="Bobina Negra">
              <p className="text-base leading-relaxed text-paper/85">
                Os quatro podem sair. O arquivo fica. Se quiser o bis, os rolos continuam no mapa — teimosia também é um atributo.
              </p>
              <Primary onClick={() => rtRef.current?.quitToMap()}>Reabrir o arquivo</Primary>
              <Ghost onClick={() => rtRef.current?.backTitle()}>Voltar ao cartaz</Ghost>
            </CenterCard>
          )}
        </div>

        {playing && snap.screen === "play" && (
          <div className="pointer-events-auto flex justify-end gap-2 px-3 pb-2">
            {snap.skills.map((k, i) => (
              <SkillButton key={k.name} skill={k} onDown={(d) => hold(("s" + (i + 1)) as Action, d)} />
            ))}
          </div>
        )}

        {playing && (
          <div className="touch-dock safe-bot pointer-events-auto flex items-end justify-between gap-2 px-3 pb-3">
            <div className="flex gap-2">
              <Pad label="Esquerda" onDown={(d) => hold("left", d)}>
                <ArrowLeft className="size-6" />
              </Pad>
              <Pad label="Direita" onDown={(d) => hold("right", d)}>
                <ArrowRight className="size-6" />
              </Pad>
            </div>
            <div className="flex gap-2">
              <Pad label="Descer plataforma" onDown={(d) => hold("down", d)}>
                <ArrowDown className="size-6" />
              </Pad>
              <Pad label={`Forma ${hero.formName}`} onDown={(d) => hold("form", d)}>
                <span className="font-display text-sm">{hero.formName}</span>
              </Pad>
              <Pad label="Atirar" onDown={(d) => hold("attack", d)}>
                <span className="font-display text-sm">Tiro</span>
              </Pad>
              <Pad label="Pular" onDown={(d) => hold("jump", d)}>
                <ArrowUp className="size-6" />
              </Pad>
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
    <section className="pointer-events-auto mx-auto flex min-h-full max-w-lg flex-col justify-end px-4 pb-6">
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
      {UPGRADES.map((u) => (
        <li key={u.id} className="rounded-md bg-ink px-2 py-1">
          <span className="text-paper/70">{u.name}</span>
          <span className="float-right text-brass">{stats[u.id as StatKey]}</span>
        </li>
      ))}
    </ul>
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
      className="grid size-11 place-items-center rounded-md border border-paper/30 bg-panel text-paper"
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
      className={`relative grid min-h-12 min-w-[3.6rem] touch-none select-none place-items-center overflow-hidden rounded-md border px-1.5 py-1 text-paper ${ready ? "border-brass bg-panel/95" : "border-paper/25 bg-panel/80 opacity-80"}`}
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
      <span className="pointer-events-none relative text-[10px] leading-tight text-brass">{skill.key} · {skill.kind}</span>
      <span className="pointer-events-none relative text-[11px] leading-tight">{skill.unlocked ? skill.name : `Nv ${skill.lv}`}</span>
    </button>
  );
}

function Pad({
  children,
  label,
  onDown,
}: {
  children: ReactNode;
  label: string;
  onDown: (down: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid min-h-14 min-w-14 touch-none select-none place-items-center rounded-md border border-paper/30 bg-panel/90 px-2 text-paper"
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


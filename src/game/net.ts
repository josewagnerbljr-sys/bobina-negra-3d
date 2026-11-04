/**
 * Multijogador cooperativo ponto a ponto (WebRTC), sem servidor próprio:
 * o anfitrião gera um código, o amigo cola o código e devolve uma resposta, e o anfitrião cola a resposta.
 * Usa só um servidor STUN público para atravessar o roteador.
 */
export type NetStatus = "off" | "waiting" | "connected" | "error";

const enc = (o: unknown) => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const dec = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s.trim())))) as RTCSessionDescriptionInit;

export type Net = {
  status: () => NetStatus;
  host: () => Promise<string>;
  join: (code: string) => Promise<string>;
  finish: (code: string) => Promise<void>;
  send: (o: unknown) => void;
  close: () => void;
  onMessage: (fn: (o: Record<string, unknown>) => void) => void;
  onStatus: (fn: () => void) => void;
};

export function createNet(): Net {
  let pc: RTCPeerConnection | null = null;
  let ch: RTCDataChannel | null = null;
  let st: NetStatus = "off";
  let msgFn: (o: Record<string, unknown>) => void = () => undefined;
  let stFn: () => void = () => undefined;
  const set = (s: NetStatus) => { st = s; stFn(); };

  const make = () => {
    pc?.close();
    pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.onconnectionstatechange = () => {
      const s = pc?.connectionState;
      if (s === "connected") set("connected");
      else if (s === "failed" || s === "closed" || s === "disconnected") set(st === "connected" ? "off" : "error");
    };
    return pc;
  };
  const wire = (c: RTCDataChannel) => {
    ch = c;
    c.onopen = () => set("connected");
    c.onclose = () => set("off");
    c.onmessage = (e) => { try { msgFn(JSON.parse(String(e.data)) as Record<string, unknown>); } catch { /* ignora */ } };
  };
  const gathered = (p: RTCPeerConnection) =>
    new Promise<void>((res) => {
      if (p.iceGatheringState === "complete") return res();
      const t = setTimeout(res, 4000);
      p.addEventListener("icegatheringstatechange", () => { if (p.iceGatheringState === "complete") { clearTimeout(t); res(); } });
    });

  return {
    status: () => st,
    async host() {
      const p = make();
      wire(p.createDataChannel("bn", { ordered: false, maxRetransmits: 0 }));
      await p.setLocalDescription(await p.createOffer());
      await gathered(p);
      set("waiting");
      return enc(p.localDescription);
    },
    async join(code) {
      const p = make();
      p.ondatachannel = (e) => wire(e.channel);
      await p.setRemoteDescription(dec(code));
      await p.setLocalDescription(await p.createAnswer());
      await gathered(p);
      set("waiting");
      return enc(p.localDescription);
    },
    async finish(code) {
      if (!pc) throw new Error("sem sala");
      await pc.setRemoteDescription(dec(code));
    },
    send(o) {
      if (ch && ch.readyState === "open") ch.send(JSON.stringify(o));
    },
    close() {
      ch?.close();
      pc?.close();
      ch = null;
      pc = null;
      set("off");
    },
    onMessage: (fn) => { msgFn = fn; },
    onStatus: (fn) => { stFn = fn; },
  };
}

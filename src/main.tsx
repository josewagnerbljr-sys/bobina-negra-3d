import { createRoot } from "react-dom/client";
import { Bobina } from "./components/Bobina";

createRoot(document.getElementById("root")!).render(<Bobina />);

// Bloqueia menu de segurar, seleção e arrastar em qualquer lugar do jogo.
for (const ev of ["contextmenu", "selectstart", "dragstart"]) {
  document.addEventListener(ev, (e) => e.preventDefault());
}
// Impede o zoom por gesto de pinça no iOS.
for (const ev of ["gesturestart", "gesturechange"]) {
  document.addEventListener(ev, (e) => e.preventDefault());
}

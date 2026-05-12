import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import NeonRoom from "@/components/NeonRoom";
import "@/styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("No se encontro el contenedor del lobby inmersivo.");
}

createRoot(rootElement).render(
  <StrictMode>
    <NeonRoom />
  </StrictMode>,
);

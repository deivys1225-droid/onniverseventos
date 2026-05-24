import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import NeonRoom from "@/components/lobby/NeonRoom";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("No se encontró el contenedor del lobby inmersivo.");
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route
          path="/*"
          element={<NeonRoom />}
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

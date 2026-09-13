import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Application } from "src/Application";

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Missing application root.");
}

createRoot(root).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);

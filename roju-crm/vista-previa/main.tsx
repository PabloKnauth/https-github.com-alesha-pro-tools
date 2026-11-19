// Entrada de la vista previa: mismas pantallas del CRM, sin servidor y con navegación por hash.
import "../src/styles.css";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "../src/routeTree.gen";

// La raíz del CRM dibuja <html>/<head>/<body> para el servidor; aquí basta con su contenido.
(routeTree.options as { shellComponent?: (p: { children: ReactNode }) => ReactNode }).shellComponent = ({ children }) => children;

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  context: { queryClient: new QueryClient() },
  scrollRestoration: true,
});

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

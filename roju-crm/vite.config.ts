// @lovable.dev/vite-tanstack-config already includes TanStack Start, React, Tailwind, tsconfig paths
// and the @ alias — do NOT add them manually or the app will break with duplicate plugins.
//
// Publicación en Netlify: la app se compila como SPA estática (sin servidor de renderizado).
// Los datos y el inicio de sesión viven en una Netlify Function (ver publicar/).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    server: { entry: "server" },
    spa: { enabled: true },
  },
});

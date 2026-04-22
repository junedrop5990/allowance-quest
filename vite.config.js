import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "おこづかいクエスト",
        short_name: "クエスト",
        description: "こどものおこづかいをクエストでたのしく管理！",
        theme_color: "#1a1a3e",
        background_color: "#0f1117",
        display: "standalone",
        orientation: "portrait",
        start_url: "/allowance-quest/",
        scope: "/allowance-quest/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache" },
          },
        ],
      },
    }),
  ],
  base: "/allowance-quest/",
});

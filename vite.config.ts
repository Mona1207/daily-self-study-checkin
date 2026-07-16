import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["pwa-192.png", "pwa-512.png", "pwa-maskable.png"],
      manifest: {
        name: "今日任务",
        short_name: "今日任务",
        description: "给中学生使用的今日任务网站",
        theme_color: "#4f46e5",
        background_color: "#f8fafc",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});

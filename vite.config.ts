import { defineConfig } from "vite"

import react from "@vitejs/plugin-react"

import tailwindcss from "@tailwindcss/vite"

import path from "node:path"

import siteConfiguration from "./.figma/make/site.json"
import {
  figmaErrorOverlayReplay,
  figmaMakeKitPlugin,
  figmaReactRefreshBoundaryFallback,
  figmaSiteConfiguration,
} from "./vite/figmaPlugins"

// Vite config — https://vitejs.dev/config/

export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.

  const emitSourcemaps = mode === "development"

  return {
    base: process.env.FIGMA_PUBLIC_URL
      ? `${process.env.FIGMA_PUBLIC_URL}/`
      : "/",

    build: {
      sourcemap: emitSourcemaps ? "inline" : false,

      minify: !emitSourcemaps,
    },

    plugins: [
      react(),

      tailwindcss(),

      figmaSiteConfiguration(siteConfiguration),

      figmaErrorOverlayReplay(),

      figmaReactRefreshBoundaryFallback(),

      figmaMakeKitPlugin({ storiesGlob: "/src/**/*.stories.{ts,tsx,js,jsx}" }),
    ],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: "0.0.0.0",

      port: parseInt(process.env.PORT || "5173"),

      strictPort: true,

      watch: { ignored: ["**/.figma/**"] },
    },

    preview: {
      host: "0.0.0.0",

      port: parseInt(process.env.PORT || "5173"),
    },
  }
})

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The Office Portal (VITE_PANEL=office, port 3004) runs from the same code; its own cache avoids clashes
  cacheDir: process.env.VITE_PANEL === "office" ? "node_modules/.vite-office" : "node_modules/.vite",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Large libraries in their own files: they change rarely, so browsers keep them cached between releases
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\/]node_modules[\/](xlsx)[\/]/.test(id)) return "xlsx";
          if (/[\/]node_modules[\/](recharts|d3-[^\/]+|victory-vendor)[\/]/.test(id)) return "charts";
          if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return "react";
          if (/[\/]node_modules[\/]lucide-react[\/]/.test(id)) return "icons";
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3002,
    host: true,
  },
});

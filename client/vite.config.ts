import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// export default defineConfig({
//   plugins: [
//     tailwindcss(),
//   ],
// })

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3026,
    proxy: {
      "/api": {
        target: "http://localhost:3025",
        changeOrigin: true,
      },
    },
  },
});

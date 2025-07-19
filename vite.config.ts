import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  optimizeDeps: {
    exclude: [
      "flowbite-svelte",
      "apexcharts",
      "@flowbite-svelte-plugins/chart",
      "tailwind-merge",
      "tailwind-variants",
      "@floating-ui/utils",
      "@floating-ui/dom",
    ],
  },
});

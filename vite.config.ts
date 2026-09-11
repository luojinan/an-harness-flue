import { cloudflare } from '@cloudflare/vite-plugin';
import { flue, flueWorkerConfig } from '@flue/vite';
import react from '@vitejs/plugin-react';
import * as stylex from '@stylexjs/unplugin';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [flue(), cloudflare({ config: flueWorkerConfig() }), stylex.vite()],
  // The React SPA is the `client` environment. Its build output (dist/client)
  // becomes the Worker's static assets: the Cloudflare plugin wires the
  // `assets` entry into the generated wrangler.json, and Cloudflare's asset
  // server answers matching requests before the Worker runs.
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
      },
      plugins: [react()],
    },
  },
});

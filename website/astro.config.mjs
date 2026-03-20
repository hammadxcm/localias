import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import serverLogger from './src/integrations/server-logger';

export default defineConfig({
  site: 'https://localias.dev',
  integrations: [sitemap(), serverLogger()],
});

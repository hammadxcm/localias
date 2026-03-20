import type { AstroIntegration } from 'astro';

const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export default function serverLogger(): AstroIntegration {
  return {
    name: 'localias-server-logger',
    hooks: {
      'astro:server:start': ({ address }) => {
        const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
        const port = address.port;
        const local = `http://localhost:${port}/`;
        const network = `http://${host}:${port}/`;

        console.log('');
        console.log(`${RED}${BOLD}  ⊕ localias${RESET} ${DIM}dev server${RESET}`);
        console.log('');
        console.log(`  ${BOLD}Local${RESET}    ${CYAN}${local}${RESET}`);
        console.log(`  ${BOLD}Port${RESET}     ${GREEN}${port}${RESET}`);
        if (address.address !== '127.0.0.1' && address.address !== '::1') {
          console.log(`  ${BOLD}Network${RESET}  ${CYAN}${network}${RESET}`);
        }
        console.log('');
      },
    },
  };
}

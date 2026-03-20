import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function printHelp(): void {
	console.log(`
localias — stable .localhost URLs for local development

Usage:
  localias <name> -- <command>     Run app with a named .localhost URL
  localias run -- <command>        Run app (name inferred from project)
  localias compose -- <cmd>        Route Docker Compose services via proxy
  localias proxy start             Start the proxy server
  localias proxy stop              Stop the proxy server
  localias alias <name> <port>     Add a static route alias
  localias alias --remove <name>   Remove a static route alias
  localias list                    List active routes
  localias get [name]              Print service URL
  localias trust                   Trust the CA certificate
  localias hosts sync              Sync routes to /etc/hosts
  localias hosts clean             Remove localias entries from /etc/hosts

Options:
  --name <name>                   Set hostname explicitly
  --port, -p <port>               Proxy port (default: 1355)
  --https                         Enable TLS
  --tld <tld>                     TLD suffix (default: localhost)
  --app-port <port>               Fixed app port (skip allocation)
  --force                         Overwrite existing route
  --foreground                    Run proxy in foreground
  --help, -h                      Show this help
  --version, -v                   Show version

Environment:
  LOCALIAS=0                       Bypass proxy, run command directly
  LOCALIAS_DEBUG=1                 Enable debug logging
  LOCALIAS_STATE_DIR=<path>        Override state directory
`)
}

export function printVersion(): void {
	try {
		const dir = dirname(fileURLToPath(import.meta.url))
		const pkg = JSON.parse(readFileSync(join(dir, '..', 'package.json'), 'utf-8'))
		console.log(pkg.version ?? '0.0.0')
	} catch {
		console.log('0.0.0')
	}
}

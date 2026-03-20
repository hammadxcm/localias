import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export function printHelp(): void {
	console.log(`
publify — stable .localhost URLs for local development

Usage:
  publify <name> -- <command>     Run app with a named .localhost URL
  publify run -- <command>        Run app (name inferred from project)
  publify proxy start             Start the proxy server
  publify proxy stop              Stop the proxy server
  publify alias <name> <port>     Add a static route alias
  publify alias --remove <name>   Remove a static route alias
  publify list                    List active routes
  publify get [name]              Print service URL
  publify trust                   Trust the CA certificate
  publify hosts sync              Sync routes to /etc/hosts
  publify hosts clean             Remove publify entries from /etc/hosts

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
  PUBLIFY=0                       Bypass proxy, run command directly
  PUBLIFY_DEBUG=1                 Enable debug logging
  PUBLIFY_STATE_DIR=<path>        Override state directory
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

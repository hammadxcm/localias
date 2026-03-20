import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'

export async function listCommand(container: Container): Promise<void> {
	const result = await container.listRoutes.execute()
	if (isErr(result)) {
		console.error(`Error: ${result.error.message}`)
		process.exitCode = 1
		return
	}

	const { routes, proxyPort, tls } = result.value

	if (routes.length === 0) {
		console.log('No active routes.')
		return
	}

	// Table header
	const header = ['Hostname', 'Port', 'PID', 'Status', 'URL']
	const rows = routes.map((r) => [
		r.route.hostname.value,
		String(r.route.port.value),
		r.route.isAlias ? 'alias' : String(r.route.pid.value),
		r.alive ? 'up' : 'down',
		r.url,
	])

	// Calculate column widths
	const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]?.length ?? 0)))

	const pad = (s: string, w: number) => s.padEnd(w)
	const separator = widths.map((w) => '-'.repeat(w)).join('  ')

	console.log(header.map((h, i) => pad(h, widths[i]!)).join('  '))
	console.log(separator)
	for (const row of rows) {
		console.log(row.map((cell, i) => pad(cell, widths[i]!)).join('  '))
	}
}

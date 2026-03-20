import dns from 'node:dns'
import { readFileSync, writeFileSync } from 'node:fs'
import type { IHostsManager } from '@localias/core'
import type { Result } from '@localias/core'
import { err, ok } from '@localias/core'

const HOSTS_PATH =
	process.platform === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts'
const MARKER_START = '# localias-start'
const MARKER_END = '# localias-end'

export class FileHostsManager implements IHostsManager {
	sync(hostnames: string[]): Result<void, Error> {
		try {
			const content = readFileSync(HOSTS_PATH, 'utf-8')
			const cleaned = this.removeBlock(content)
			const block = this.buildBlock(hostnames)
			writeFileSync(HOSTS_PATH, cleaned + block, 'utf-8')
			return ok(undefined)
		} catch (e) {
			return err(
				new Error(
					`Failed to update ${HOSTS_PATH}: ${(e as Error).message}. Try running with sudo.`,
				),
			)
		}
	}

	clean(): Result<void, Error> {
		try {
			const content = readFileSync(HOSTS_PATH, 'utf-8')
			const cleaned = this.removeBlock(content)
			writeFileSync(HOSTS_PATH, cleaned, 'utf-8')
			return ok(undefined)
		} catch (e) {
			return err(
				new Error(
					`Failed to update ${HOSTS_PATH}: ${(e as Error).message}. Try running with sudo.`,
				),
			)
		}
	}

	getManagedHostnames(): string[] {
		try {
			const content = readFileSync(HOSTS_PATH, 'utf-8')
			const startIdx = content.indexOf(MARKER_START)
			const endIdx = content.indexOf(MARKER_END)
			if (startIdx === -1 || endIdx === -1) return []

			const block = content.slice(startIdx + MARKER_START.length, endIdx)
			const hostnames: string[] = []
			for (const line of block.split('\n')) {
				const trimmed = line.trim()
				if (trimmed && !trimmed.startsWith('#')) {
					const parts = trimmed.split(/\s+/)
					if (parts.length >= 2) {
						hostnames.push(parts[1]!)
					}
				}
			}
			return hostnames
		} catch {
			return []
		}
	}

	checkResolution(hostname: string): Promise<boolean> {
		return new Promise((resolve) => {
			dns.lookup(hostname, (error, address) => {
				if (error) {
					resolve(false)
				} else {
					resolve(address === '127.0.0.1' || address === '::1')
				}
			})
		})
	}

	private removeBlock(content: string): string {
		const startIdx = content.indexOf(MARKER_START)
		const endIdx = content.indexOf(MARKER_END)
		if (startIdx === -1 || endIdx === -1) return content
		return content.slice(0, startIdx) + content.slice(endIdx + MARKER_END.length + 1)
	}

	private buildBlock(hostnames: string[]): string {
		if (hostnames.length === 0) return ''
		const lines = [MARKER_START]
		for (const h of hostnames) {
			lines.push(`127.0.0.1 ${h}`)
		}
		lines.push(MARKER_END)
		return `\n${lines.join('\n')}\n`
	}
}

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import http from 'node:http'
import type { IStateManager, ProxyState, Port, ProcessId } from '@publify/core'
import { Port as PortVO, ProcessId as PidVO } from '@publify/core'
import { isOk } from '@publify/core'

const WELL_KNOWN_PORTS = [1355, 443, 80]

function defaultStateDir(): string {
	const envDir = process.env['PUBLIFY_STATE_DIR']
	if (envDir) return envDir
	// Prefer /tmp/publify for shared access, fallback to ~/.publify
	const tmpPath = join(tmpdir(), 'publify')
	try {
		mkdirSync(tmpPath, { recursive: true, mode: 0o1777 })
		return tmpPath
	} catch {
		const homePath = join(homedir(), '.publify')
		mkdirSync(homePath, { recursive: true, mode: 0o755 })
		return homePath
	}
}

export class FileStateManager implements IStateManager {
	resolveStateDir(port: number): string {
		const base = defaultStateDir()
		const dir = join(base, String(port))
		mkdirSync(dir, { recursive: true })
		return dir
	}

	async discoverState(): Promise<ProxyState> {
		const base = defaultStateDir()

		for (const port of WELL_KNOWN_PORTS) {
			const dir = join(base, String(port))
			const pid = this.readProxyPid(dir)
			if (pid && pid.value > 0) {
				// Verify it's actually a publify proxy via HTTP HEAD
				const isProxy = await this.probeProxy(port)
				if (isProxy) {
					return {
						running: true,
						port: isOk(PortVO.create(port)) ? (PortVO.create(port) as any).value : null,
						pid,
						tls: this.readTlsMarker(dir),
						tld: this.readTld(dir),
						stateDir: dir,
					}
				}
			}
		}

		return {
			running: false,
			port: null,
			pid: null,
			tls: false,
			tld: 'localhost',
			stateDir: null,
		}
	}

	readProxyPid(stateDir: string): ProcessId | null {
		try {
			const content = readFileSync(join(stateDir, 'proxy.pid'), 'utf-8').trim()
			const pid = parseInt(content, 10)
			if (Number.isNaN(pid) || pid <= 0) return null
			return PidVO.create(pid)
		} catch {
			return null
		}
	}

	writeProxyPid(stateDir: string, pid: ProcessId): void {
		mkdirSync(stateDir, { recursive: true })
		writeFileSync(join(stateDir, 'proxy.pid'), String(pid.value), 'utf-8')
	}

	readProxyPort(stateDir: string): Port | null {
		try {
			const content = readFileSync(join(stateDir, 'proxy.port'), 'utf-8').trim()
			const port = parseInt(content, 10)
			const result = PortVO.create(port)
			return result._tag === 'Ok' ? result.value : null
		} catch {
			return null
		}
	}

	writeProxyPort(stateDir: string, port: Port): void {
		mkdirSync(stateDir, { recursive: true })
		writeFileSync(join(stateDir, 'proxy.port'), String(port.value), 'utf-8')
	}

	readTlsMarker(stateDir: string): boolean {
		return existsSync(join(stateDir, 'tls'))
	}

	writeTlsMarker(stateDir: string, enabled: boolean): void {
		mkdirSync(stateDir, { recursive: true })
		const marker = join(stateDir, 'tls')
		if (enabled) {
			writeFileSync(marker, '1', 'utf-8')
		} else {
			try { rmSync(marker) } catch { /* ignore */ }
		}
	}

	readTld(stateDir: string): string {
		try {
			return readFileSync(join(stateDir, 'tld'), 'utf-8').trim() || 'localhost'
		} catch {
			return 'localhost'
		}
	}

	writeTld(stateDir: string, tld: string): void {
		mkdirSync(stateDir, { recursive: true })
		writeFileSync(join(stateDir, 'tld'), tld, 'utf-8')
	}

	private probeProxy(port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const req = http.request(
				{ hostname: '127.0.0.1', port, method: 'HEAD', path: '/', timeout: 500 },
				(res) => {
					resolve(res.headers['x-publify'] === '1')
				},
			)
			req.on('error', () => resolve(false))
			req.on('timeout', () => {
				req.destroy()
				resolve(false)
			})
			req.end()
		})
	}
}

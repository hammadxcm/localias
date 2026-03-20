import { existsSync, mkdirSync, readFileSync, writeFileSync, rmdirSync, watch } from 'node:fs'
import { join } from 'node:path'
import type { IRouteRepository, Disposable, IProcessManager } from '@publify/core'
import {
	type Result,
	ok,
	err,
	isOk,
	Route,
	Hostname,
	Port,
	ProcessId,
	RouteConflictError,
	LockAcquisitionError,
} from '@publify/core'

interface StoredRoute {
	hostname: string
	port: number
	pid: number
}

const LOCK_RETRIES = 20
const LOCK_DELAY_MS = 50

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export class FileRouteRepository implements IRouteRepository {
	private readonly filePath: string
	private readonly lockDir: string

	constructor(
		stateDir: string,
		private readonly processManager: IProcessManager,
	) {
		mkdirSync(stateDir, { recursive: true })
		this.filePath = join(stateDir, 'routes.json')
		this.lockDir = join(stateDir, 'routes.lock')
	}

	loadRoutes(): Route[] {
		const stored = this.readFile()
		const alive: StoredRoute[] = []
		const routes: Route[] = []

		for (const s of stored) {
			// Clean stale PIDs (PID 0 = alias, always kept)
			if (s.pid !== 0 && !this.processManager.isAlive(ProcessId.create(s.pid))) {
				continue
			}

			const hostnameResult = Hostname.create(s.hostname)
			const portResult = Port.create(s.port)
			if (isOk(hostnameResult) && isOk(portResult)) {
				const pid = s.pid === 0 ? ProcessId.alias() : ProcessId.create(s.pid)
				routes.push(Route.create(hostnameResult.value, portResult.value, pid))
				alive.push(s)
			}
		}

		// Write back cleaned routes if any were removed
		if (alive.length !== stored.length) {
			this.writeFileSafe(alive)
		}

		return routes
	}

	addRoute(route: Route, force = false): Result<void, RouteConflictError | LockAcquisitionError> {
		if (!this.acquireLock()) {
			return err(new LockAcquisitionError())
		}

		try {
			const stored = this.readFile()

			const existing = stored.find((s) => s.hostname === route.hostname.value)
			if (existing && !force) {
				if (existing.pid === 0 || this.processManager.isAlive(ProcessId.create(existing.pid))) {
					return err(new RouteConflictError(route.hostname.value, existing.pid))
				}
			}

			// Remove existing entry for this hostname
			const filtered = stored.filter((s) => s.hostname !== route.hostname.value)
			filtered.push({
				hostname: route.hostname.value,
				port: route.port.value,
				pid: route.pid.value,
			})

			this.writeFile(filtered)
			return ok(undefined)
		} finally {
			this.releaseLock()
		}
	}

	removeRoute(hostname: string): Result<void, LockAcquisitionError> {
		if (!this.acquireLock()) {
			return err(new LockAcquisitionError())
		}

		try {
			const stored = this.readFile()
			const filtered = stored.filter((s) => s.hostname !== hostname)
			this.writeFile(filtered)
			return ok(undefined)
		} finally {
			this.releaseLock()
		}
	}

	watchRoutes(callback: (routes: Route[]) => void): Disposable {
		if (!existsSync(this.filePath)) {
			writeFileSync(this.filePath, '[]', 'utf-8')
		}

		const watcher = watch(this.filePath, { persistent: false }, () => {
			try {
				callback(this.loadRoutes())
			} catch {
				// ignore errors during watch callback
			}
		})

		// Polling fallback
		const interval = setInterval(() => {
			try {
				callback(this.loadRoutes())
			} catch {
				// ignore
			}
		}, 5000)

		return {
			dispose() {
				watcher.close()
				clearInterval(interval)
			},
		}
	}

	private readFile(): StoredRoute[] {
		try {
			const content = readFileSync(this.filePath, 'utf-8')
			return JSON.parse(content) as StoredRoute[]
		} catch {
			return []
		}
	}

	private writeFile(routes: StoredRoute[]): void {
		writeFileSync(this.filePath, JSON.stringify(routes, null, 2), 'utf-8')
	}

	private writeFileSafe(routes: StoredRoute[]): void {
		try {
			if (this.acquireLock()) {
				this.writeFile(routes)
				this.releaseLock()
			}
		} catch {
			// best effort
		}
	}

	private acquireLock(): boolean {
		for (let i = 0; i < LOCK_RETRIES; i++) {
			try {
				mkdirSync(this.lockDir)
				return true
			} catch {
				// Lock exists, wait
				const start = Date.now()
				while (Date.now() - start < LOCK_DELAY_MS) {
					// busy wait (using Atomics.wait would be better but requires SharedArrayBuffer)
				}
			}
		}
		return false
	}

	private releaseLock(): void {
		try {
			rmdirSync(this.lockDir)
		} catch {
			// ignore
		}
	}
}

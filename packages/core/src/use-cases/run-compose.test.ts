import { describe, expect, it, vi } from 'vitest'
import { PortExhaustedError } from '../errors.js'
import type { IComposeAdapter } from '../ports/compose-adapter.js'
import type { ILogger } from '../ports/logger.js'
import type { IPortAllocator } from '../ports/port-allocator.js'
import type { IProcessManager } from '../ports/process-manager.js'
import type { IProjectDetector } from '../ports/project-detector.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { IStateManager } from '../ports/state-manager.js'
import { isErr, isOk, ok, unwrap } from '../result.js'
import { Port } from '../values/port.js'
import { ProcessId } from '../values/process-id.js'
import { RunComposeUseCase } from './run-compose.js'

function createMockDeps(
	overrides?: Partial<{
		compose: Partial<IComposeAdapter>
		routes: Partial<IRouteRepository>
		ports: Partial<IPortAllocator>
		process: Partial<IProcessManager>
		state: Partial<IStateManager>
		project: Partial<IProjectDetector>
		logger: Partial<ILogger>
	}>,
) {
	let nextPort = 4000

	const routes: IRouteRepository = {
		loadRoutes: vi.fn(() => []),
		addRoute: vi.fn(() => ok(undefined)),
		removeRoute: vi.fn(() => ok(undefined)),
		watchRoutes: vi.fn(() => ({ dispose: vi.fn() })),
		...overrides?.routes,
	}

	const ports: IPortAllocator = {
		findFreePort: vi.fn(async () => ok(unwrap(Port.create(nextPort++)))),
		...overrides?.ports,
	}

	const process: IProcessManager = {
		isAlive: vi.fn(() => true),
		spawn: vi.fn(),
		kill: vi.fn(() => ok(undefined)),
		findPidOnPort: vi.fn(() => null),
		currentPid: vi.fn(() => ProcessId.create(1234)),
		...overrides?.process,
	}

	const state: IStateManager = {
		resolveStateDir: vi.fn(() => '/tmp/localias'),
		discoverState: vi.fn(async () => ({
			running: true,
			port: unwrap(Port.create(1355)),
			pid: ProcessId.create(999),
			tls: false,
			tld: 'localhost',
			stateDir: '/tmp/localias',
		})),
		readProxyPid: vi.fn(() => null),
		writeProxyPid: vi.fn(),
		readProxyPort: vi.fn(() => null),
		writeProxyPort: vi.fn(),
		readTlsMarker: vi.fn(() => false),
		writeTlsMarker: vi.fn(),
		readTld: vi.fn(() => 'localhost'),
		writeTld: vi.fn(),
		...overrides?.state,
	}

	const project: IProjectDetector = {
		inferName: vi.fn(() => ok({ name: 'myproject', source: 'package.json' })),
		...overrides?.project,
	}

	const compose: IComposeAdapter = {
		parseServices: vi.fn(async () => ok([{ name: 'web', portCount: 1 }])),
		...overrides?.compose,
	}

	const logger: ILogger = {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		...overrides?.logger,
	}

	return { routes, ports, process, state, project, compose, logger }
}

describe('RunComposeUseCase', () => {
	it('registers a route for a single-service single-port compose', async () => {
		const deps = createMockDeps()
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
			cwd: '/app',
		})

		expect(isOk(result)).toBe(true)
		if (!isOk(result)) return
		expect(result.value).toHaveLength(1)
		expect(result.value[0]!.hostname).toBe('web.myproject.localhost')
		expect(result.value[0]!.port).toBe(4000)

		// Check env var injection
		expect(deps.process.spawn).toHaveBeenCalledOnce()
		const spawnCall = vi.mocked(deps.process.spawn).mock.calls[0]!
		expect(spawnCall[1]).toEqual({
			WEB_PORT: '4000',
			WEB_PORT_0: '4000',
		})
	})

	it('registers indexed routes for multi-port service', async () => {
		const deps = createMockDeps({
			compose: {
				parseServices: vi.fn(async () => ok([{ name: 'api', portCount: 2 }])),
			},
		})
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
			cwd: '/app',
		})

		expect(isOk(result)).toBe(true)
		if (!isOk(result)) return

		const hostnames = result.value.map((r) => r.hostname)
		// Indexed routes + convenience alias
		expect(hostnames).toContain('0.api.myproject.localhost')
		expect(hostnames).toContain('1.api.myproject.localhost')
		expect(hostnames).toContain('api.myproject.localhost')

		// Convenience alias points to same port as index 0
		const convenience = result.value.find((r) => r.hostname === 'api.myproject.localhost')!
		const indexed0 = result.value.find((r) => r.hostname === '0.api.myproject.localhost')!
		expect(convenience.port).toBe(indexed0.port)

		// Env vars
		const spawnCall = vi.mocked(deps.process.spawn).mock.calls[0]!
		expect(spawnCall[1]).toEqual({
			API_PORT: '4000',
			API_PORT_0: '4000',
			API_PORT_1: '4001',
		})
	})

	it('handles multiple services', async () => {
		const deps = createMockDeps({
			compose: {
				parseServices: vi.fn(async () =>
					ok([
						{ name: 'web', portCount: 1 },
						{ name: 'api', portCount: 1 },
					]),
				),
			},
		})
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
			cwd: '/app',
		})

		expect(isOk(result)).toBe(true)
		if (!isOk(result)) return

		const hostnames = result.value.map((r) => r.hostname)
		expect(hostnames).toContain('web.myproject.localhost')
		expect(hostnames).toContain('api.myproject.localhost')
		expect(result.value).toHaveLength(2)
	})

	it('uses name override from params', async () => {
		const deps = createMockDeps()
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
			name: 'custom-name',
			cwd: '/app',
		})

		expect(isOk(result)).toBe(true)
		if (!isOk(result)) return
		expect(result.value[0]!.hostname).toBe('web.custom-name.localhost')
	})

	it('propagates compose parse failure', async () => {
		const deps = createMockDeps({
			compose: {
				parseServices: vi.fn(async () => ({
					_tag: 'Err' as const,
					error: new Error('compose parse failed'),
				})),
			},
		})
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
			cwd: '/app',
		})

		expect(isErr(result)).toBe(true)
		if (!isErr(result)) return
		expect(result.error.message).toBe('compose parse failed')
	})

	it('propagates port allocation failure', async () => {
		const deps = createMockDeps({
			ports: {
				findFreePort: vi.fn(async () => ({
					_tag: 'Err' as const,
					error: new PortExhaustedError(4000, 4999),
				})),
			},
		})
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
			cwd: '/app',
		})

		expect(isErr(result)).toBe(true)
		if (!isErr(result)) return
		expect(result.error.message).toContain('No free port found')
	})

	it('cleans up all routes on exit', async () => {
		const deps = createMockDeps({
			compose: {
				parseServices: vi.fn(async () =>
					ok([
						{ name: 'web', portCount: 1 },
						{ name: 'api', portCount: 1 },
					]),
				),
			},
		})
		const uc = new RunComposeUseCase(deps)

		await uc.execute({
			command: ['docker', 'compose', 'up'],
			cwd: '/app',
		})

		// Get the cleanup callback passed to spawn
		const spawnCall = vi.mocked(deps.process.spawn).mock.calls[0]!
		const cleanupFn = spawnCall[2]!
		cleanupFn()

		// Should have removed both routes
		expect(deps.routes.removeRoute).toHaveBeenCalledWith('web.myproject.localhost')
		expect(deps.routes.removeRoute).toHaveBeenCalledWith('api.myproject.localhost')
	})

	it('returns error when cwd is not provided', async () => {
		const deps = createMockDeps()
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
		})

		expect(isErr(result)).toBe(true)
	})

	it('extracts -f file args from command', async () => {
		const deps = createMockDeps()
		const uc = new RunComposeUseCase(deps)

		await uc.execute({
			command: ['docker', 'compose', '-f', 'custom.yml', 'up'],
			cwd: '/app',
		})

		expect(deps.compose.parseServices).toHaveBeenCalledWith(['custom.yml'], '/app')
	})

	it('converts service name with hyphens to env var prefix', async () => {
		const deps = createMockDeps({
			compose: {
				parseServices: vi.fn(async () => ok([{ name: 'my-service', portCount: 1 }])),
			},
		})
		const uc = new RunComposeUseCase(deps)

		const result = await uc.execute({
			command: ['docker', 'compose', 'up'],
			cwd: '/app',
		})

		expect(isOk(result)).toBe(true)
		const spawnCall = vi.mocked(deps.process.spawn).mock.calls[0]!
		expect(spawnCall[1]).toHaveProperty('MY_SERVICE_PORT')
	})
})

import type { Result } from '../result.js'
import { ok, err, isErr } from '../result.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { IPortAllocator } from '../ports/port-allocator.js'
import type { IProcessManager } from '../ports/process-manager.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { IGitAdapter } from '../ports/git-adapter.js'
import type { IProjectDetector } from '../ports/project-detector.js'
import type { ILogger } from '../ports/logger.js'
import { Hostname } from '../values/hostname.js'
import { Port } from '../values/port.js'
import { Route } from '../values/route.js'
import { sanitizeForHostname, truncateLabel } from '../values/hostname-sanitizer.js'
import { PluginRegistry } from '../plugins/registry.js'

export interface RunAppDeps {
	readonly routes: IRouteRepository
	readonly ports: IPortAllocator
	readonly process: IProcessManager
	readonly state: IStateManager
	readonly git: IGitAdapter
	readonly project: IProjectDetector
	readonly logger: ILogger
	readonly plugins: PluginRegistry
	readonly hashFn?: (input: string) => string
}

export interface RunAppParams {
	readonly command: string[]
	readonly name?: string
	readonly force?: boolean
	readonly appPort?: number
	readonly cwd?: string
	readonly tld?: string
}

export class RunAppUseCase {
	constructor(private readonly deps: RunAppDeps) {}

	async execute(params: RunAppParams): Promise<Result<{ url: string; hostname: string; port: number }, Error>> {
		const cwd = params.cwd ?? process.cwd()
		const tld = params.tld ?? 'localhost'

		// 1. Infer project name
		let baseName: string
		if (params.name) {
			baseName = sanitizeForHostname(params.name)
		} else {
			const inferred = this.deps.project.inferName(cwd)
			if (isErr(inferred)) {
				return err(inferred.error)
			}
			baseName = sanitizeForHostname(inferred.value.name)
			this.deps.logger.debug(`Inferred project name: ${inferred.value.name} (source: ${inferred.value.source})`)
		}

		// 2. Detect worktree prefix
		const worktree = this.deps.git.detectWorktreePrefix(cwd)
		if (worktree) {
			const prefix = sanitizeForHostname(worktree.prefix)
			if (prefix) {
				baseName = `${prefix}-${baseName}`
				this.deps.logger.debug(`Worktree prefix: ${worktree.prefix} (source: ${worktree.source})`)
			}
		}

		baseName = truncateLabel(baseName, this.deps.hashFn)

		// 3. Compose hostname
		const hostnameResult = Hostname.create(baseName, tld)
		if (isErr(hostnameResult)) return err(hostnameResult.error)
		const hostname = hostnameResult.value

		// 4. Discover proxy state
		const proxyState = await this.deps.state.discoverState()
		if (!proxyState.running) {
			this.deps.logger.warn('Proxy is not running. Start it with: publify proxy start')
		}

		// 5. Allocate port for the app
		let appPort: Port
		if (params.appPort) {
			const portResult = Port.create(params.appPort)
			if (isErr(portResult)) return err(portResult.error)
			appPort = portResult.value
		} else {
			const portResult = await this.deps.ports.findFreePort()
			if (isErr(portResult)) return err(portResult.error)
			appPort = portResult.value
		}

		// 6. Register route
		const pid = this.deps.process.currentPid()
		const route = Route.create(hostname, appPort, pid)
		const addResult = this.deps.routes.addRoute(route, params.force)
		if (isErr(addResult)) return err(addResult.error)

		// 7. Inject framework flags
		let command = [...params.command]
		command = this.deps.plugins.injectFlags(command, appPort.value)

		// 8. Build URL
		const proxyPort = proxyState.port?.value ?? 1355
		const tls = proxyState.tls
		const url = hostname.toUrl(proxyPort, tls)

		// 9. Spawn child process
		const env: Record<string, string> = {
			PORT: String(appPort.value),
			PUBLIFY_URL: url,
			PUBLIFY_HOSTNAME: hostname.value,
		}

		this.deps.logger.info(`${hostname.value} → 127.0.0.1:${appPort.value}`)
		this.deps.logger.info(`URL: ${url}`)

		this.deps.process.spawn(command, env, () => {
			this.deps.routes.removeRoute(hostname.value)
			this.deps.logger.debug(`Route removed: ${hostname.value}`)
		})

		return ok({ url, hostname: hostname.value, port: appPort.value })
	}
}

import type { IComposeAdapter } from '../ports/compose-adapter.js'
import type { ILogger } from '../ports/logger.js'
import type { IPortAllocator } from '../ports/port-allocator.js'
import type { IProcessManager } from '../ports/process-manager.js'
import type { IProjectDetector } from '../ports/project-detector.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { Result } from '../result.js'
import { err, isErr, ok } from '../result.js'
import { sanitizeForHostname, truncateLabel } from '../values/hostname-sanitizer.js'
import { Hostname } from '../values/hostname.js'
import { Port } from '../values/port.js'
import { ProcessId } from '../values/process-id.js'
import { Route } from '../values/route.js'

export interface RunComposeDeps {
	readonly routes: IRouteRepository
	readonly ports: IPortAllocator
	readonly process: IProcessManager
	readonly state: IStateManager
	readonly project: IProjectDetector
	readonly compose: IComposeAdapter
	readonly logger: ILogger
	readonly hashFn?: ((input: string) => string) | undefined
}

export interface RunComposeParams {
	readonly command: string[]
	readonly name?: string | undefined
	readonly force?: boolean | undefined
	readonly cwd?: string | undefined
	readonly tld?: string | undefined
}

export interface ComposeRouteInfo {
	readonly hostname: string
	readonly port: number
	readonly url: string
}

function serviceNameToEnvPrefix(name: string): string {
	return name.toUpperCase().replace(/-/g, '_')
}

function extractFileArgs(command: string[]): string[] {
	const fileArgs: string[] = []
	for (let i = 0; i < command.length; i++) {
		const arg = command[i]!
		if ((arg === '-f' || arg === '--file') && i + 1 < command.length) {
			fileArgs.push(command[i + 1]!)
			i++
		} else if (arg.startsWith('-f=') || arg.startsWith('--file=')) {
			fileArgs.push(arg.split('=', 2)[1]!)
		}
	}
	return fileArgs
}

export class RunComposeUseCase {
	constructor(private readonly deps: RunComposeDeps) {}

	async execute(params: RunComposeParams): Promise<Result<ComposeRouteInfo[], Error>> {
		if (!params.cwd) {
			return err(new Error('cwd is required'))
		}
		const cwd = params.cwd
		const tld = params.tld ?? 'localhost'

		// 1. Resolve project name
		let projectName: string
		if (params.name) {
			projectName = sanitizeForHostname(params.name)
		} else {
			const inferred = this.deps.project.inferName(cwd)
			if (isErr(inferred)) {
				return err(inferred.error)
			}
			projectName = sanitizeForHostname(inferred.value.name)
			this.deps.logger.debug(
				`Inferred project name: ${inferred.value.name} (source: ${inferred.value.source})`,
			)
		}
		projectName = truncateLabel(projectName, this.deps.hashFn)

		// 2. Extract -f/--file flags from command
		const fileArgs = extractFileArgs(params.command)

		// 3. Parse compose services
		const parseResult = await this.deps.compose.parseServices(fileArgs, cwd)
		if (isErr(parseResult)) {
			return err(parseResult.error)
		}
		const services = parseResult.value

		if (services.length === 0) {
			return err(new Error('No services found in compose file'))
		}

		// 4. Discover proxy state
		const proxyState = await this.deps.state.discoverState()
		if (!proxyState.running) {
			this.deps.logger.warn('Proxy is not running. Start it with: localias proxy start')
		}
		const proxyPort = proxyState.port?.value ?? 1355
		const tls = proxyState.tls

		// 5. Allocate ports and register routes
		const registeredHostnames: string[] = []
		const routeInfos: ComposeRouteInfo[] = []
		const envVars: Record<string, string> = {}
		const pid = this.deps.process.currentPid()

		for (const service of services) {
			const portCount = Math.max(service.portCount, 1)

			for (let i = 0; i < portCount; i++) {
				// Allocate port
				const portResult = await this.deps.ports.findFreePort()
				if (isErr(portResult)) {
					// Clean up already registered routes
					this.cleanupRoutes(registeredHostnames)
					return err(portResult.error)
				}
				const port = portResult.value

				// Build hostname
				const envPrefix = serviceNameToEnvPrefix(service.name)
				const serviceSanitized = sanitizeForHostname(service.name)

				if (portCount > 1) {
					// Indexed hostname: 0.web.project.localhost
					const indexedLabel = `${i}.${serviceSanitized}.${projectName}.${tld}`
					const indexedHostnameResult = Hostname.create(indexedLabel, tld)
					if (isErr(indexedHostnameResult)) {
						this.cleanupRoutes(registeredHostnames)
						return err(indexedHostnameResult.error)
					}
					const indexedRoute = Route.create(indexedHostnameResult.value, port, pid)
					const addResult = this.deps.routes.addRoute(indexedRoute, params.force)
					if (isErr(addResult)) {
						this.cleanupRoutes(registeredHostnames)
						return err(addResult.error)
					}
					registeredHostnames.push(indexedHostnameResult.value.value)
					routeInfos.push({
						hostname: indexedHostnameResult.value.value,
						port: port.value,
						url: indexedHostnameResult.value.toUrl(proxyPort, tls),
					})

					// Convenience alias for first port: web.project.localhost
					if (i === 0) {
						const convLabel = `${serviceSanitized}.${projectName}.${tld}`
						const convHostnameResult = Hostname.create(convLabel, tld)
						if (isErr(convHostnameResult)) {
							this.cleanupRoutes(registeredHostnames)
							return err(convHostnameResult.error)
						}
						const aliasRoute = Route.create(convHostnameResult.value, port, pid)
						const aliasResult = this.deps.routes.addRoute(aliasRoute, params.force)
						if (isErr(aliasResult)) {
							this.cleanupRoutes(registeredHostnames)
							return err(aliasResult.error)
						}
						registeredHostnames.push(convHostnameResult.value.value)
						routeInfos.push({
							hostname: convHostnameResult.value.value,
							port: port.value,
							url: convHostnameResult.value.toUrl(proxyPort, tls),
						})
					}
				} else {
					// Single port: web.project.localhost
					const label = `${serviceSanitized}.${projectName}.${tld}`
					const hostnameResult = Hostname.create(label, tld)
					if (isErr(hostnameResult)) {
						this.cleanupRoutes(registeredHostnames)
						return err(hostnameResult.error)
					}
					const route = Route.create(hostnameResult.value, port, pid)
					const addResult = this.deps.routes.addRoute(route, params.force)
					if (isErr(addResult)) {
						this.cleanupRoutes(registeredHostnames)
						return err(addResult.error)
					}
					registeredHostnames.push(hostnameResult.value.value)
					routeInfos.push({
						hostname: hostnameResult.value.value,
						port: port.value,
						url: hostnameResult.value.toUrl(proxyPort, tls),
					})
				}

				// Build env vars
				envVars[`${envPrefix}_PORT_${i}`] = String(port.value)
				if (i === 0) {
					envVars[`${envPrefix}_PORT`] = String(port.value)
				}
			}
		}

		// 6. Log routes
		for (const info of routeInfos) {
			this.deps.logger.info(`${info.hostname} → 127.0.0.1:${info.port}`)
		}

		// 7. Spawn compose command with env vars and cleanup
		this.deps.process.spawn(params.command, envVars, () => {
			this.cleanupRoutes(registeredHostnames)
			this.deps.logger.debug('Compose routes cleaned up')
		})

		return ok(routeInfos)
	}

	private cleanupRoutes(hostnames: string[]): void {
		for (const hostname of hostnames) {
			this.deps.routes.removeRoute(hostname)
		}
	}
}

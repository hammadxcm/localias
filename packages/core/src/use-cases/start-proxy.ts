import type { Result } from '../result.js'
import { ok, err, isErr } from '../result.js'
import type { IProxyServer } from '../ports/proxy-server.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { ICertificateManager } from '../ports/certificate-manager.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { IHostsManager } from '../ports/hosts-manager.js'
import type { ILogger } from '../ports/logger.js'
import type { IProcessManager } from '../ports/process-manager.js'
import { ProxyConfig } from '../values/proxy-config.js'

export interface StartProxyDeps {
	readonly proxy: IProxyServer
	readonly routes: IRouteRepository
	readonly certs: ICertificateManager
	readonly state: IStateManager
	readonly hosts: IHostsManager
	readonly process: IProcessManager
	readonly logger: ILogger
}

export interface StartProxyParams {
	readonly port?: number
	readonly tls?: boolean
	readonly tld?: string
	readonly stateDir?: string
	readonly certPath?: string
	readonly keyPath?: string
	readonly foreground?: boolean
}

export class StartProxyUseCase {
	constructor(private readonly deps: StartProxyDeps) {}

	async execute(params: StartProxyParams): Promise<Result<{ port: number; tls: boolean }, Error>> {
		// 1. Build config
		const configResult = ProxyConfig.create({
			port: params.port,
			tls: params.tls,
			tld: params.tld,
			stateDir: params.stateDir,
		})
		if (isErr(configResult)) return err(configResult.error)
		const config = configResult.value

		// 2. Check already running
		const isRunning = await this.deps.proxy.isRunning()
		if (isRunning) {
			this.deps.logger.warn('Proxy is already running')
			return ok({ port: config.port.value, tls: config.tls })
		}

		// 3. Ensure certs if TLS
		let certInfo = undefined
		if (config.tls) {
			const certResult = await this.deps.certs.ensureCertificates(config.stateDir)
			if (isErr(certResult)) return err(certResult.error)
			certInfo = certResult.value
			this.deps.logger.info('TLS certificates ready')
		}

		// 4. Start server
		const startResult = await this.deps.proxy.start(config, () => this.deps.routes.loadRoutes(), certInfo)
		if (isErr(startResult)) return err(startResult.error)

		// 5. Write state files
		const pid = this.deps.process.currentPid()
		this.deps.state.writeProxyPid(config.stateDir, pid)
		this.deps.state.writeProxyPort(config.stateDir, config.port)
		this.deps.state.writeTlsMarker(config.stateDir, config.tls)
		this.deps.state.writeTld(config.stateDir, config.tld)

		// 6. Register error handler
		this.deps.proxy.onError((error) => {
			this.deps.logger.error(`Proxy error: ${error.message}`)
		})

		const scheme = config.tls ? 'https' : 'http'
		this.deps.logger.info(`Proxy listening on ${scheme}://localhost:${config.port.value}`)

		return ok({ port: config.port.value, tls: config.tls })
	}
}

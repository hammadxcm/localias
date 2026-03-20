import type { Result } from '../result.js'
import type { CertificateInfo } from '../values/certificate-info.js'
import type { ProxyConfig } from '../values/proxy-config.js'
import type { Route } from '../values/route.js'

export interface IProxyServer {
	start(
		config: ProxyConfig,
		getRoutes: () => Route[],
		certInfo?: CertificateInfo,
	): Promise<Result<void, Error>>
	stop(): Promise<Result<void, Error>>
	isRunning(): Promise<boolean>
	onError(handler: (error: Error) => void): void
}

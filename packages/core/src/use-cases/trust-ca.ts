import type { ICertificateManager } from '../ports/certificate-manager.js'
import type { ILogger } from '../ports/logger.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { Result } from '../result.js'
import { err, isErr, ok } from '../result.js'

export interface TrustCaDeps {
	readonly certs: ICertificateManager
	readonly state: IStateManager
	readonly logger: ILogger
}

export class TrustCaUseCase {
	constructor(private readonly deps: TrustCaDeps) {}

	async execute(stateDir?: string): Promise<Result<void, Error>> {
		const resolvedDir =
			stateDir ?? (await this.deps.state.discoverState()).stateDir ?? '/tmp/localias'

		// Ensure CA exists
		const certResult = await this.deps.certs.ensureCertificates(resolvedDir)
		if (isErr(certResult)) return err(certResult.error)

		// Check if already trusted
		const trusted = await this.deps.certs.isCATrusted(resolvedDir)
		if (trusted) {
			this.deps.logger.info('CA is already trusted')
			return ok(undefined)
		}

		// Trust CA
		const trustResult = await this.deps.certs.trustCA(resolvedDir)
		if (isErr(trustResult)) return err(trustResult.error)

		this.deps.logger.info('CA certificate trusted successfully')
		return ok(undefined)
	}
}

import { ProxyNotRunningError } from '../errors.js'
import type { ILogger } from '../ports/logger.js'
import type { IProcessManager } from '../ports/process-manager.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { Result } from '../result.js'
import { err, isErr, ok } from '../result.js'
import { ProcessId } from '../values/process-id.js'

export interface StopProxyDeps {
	readonly state: IStateManager
	readonly process: IProcessManager
	readonly logger: ILogger
}

export class StopProxyUseCase {
	constructor(private readonly deps: StopProxyDeps) {}

	async execute(): Promise<Result<void, Error>> {
		const proxyState = await this.deps.state.discoverState()

		if (!proxyState.running || !proxyState.pid) {
			return err(new ProxyNotRunningError())
		}

		if (!this.deps.process.isAlive(proxyState.pid)) {
			this.deps.logger.warn('Proxy PID found but process is not alive — cleaning up stale state')
			if (proxyState.stateDir) {
				this.deps.state.writeProxyPid(proxyState.stateDir, ProcessId.alias())
			}
			return ok(undefined)
		}

		const killResult = this.deps.process.kill(proxyState.pid, 'SIGTERM')
		if (isErr(killResult)) return err(killResult.error)

		// Clean up state files
		if (proxyState.stateDir) {
			this.deps.state.writeProxyPid(proxyState.stateDir, ProcessId.alias())
		}

		this.deps.logger.info('Proxy stopped')
		return ok(undefined)
	}
}

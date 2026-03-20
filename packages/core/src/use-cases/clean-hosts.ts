import type { IHostsManager } from '../ports/hosts-manager.js'
import type { ILogger } from '../ports/logger.js'
import type { Result } from '../result.js'
import { isErr, ok } from '../result.js'

export interface CleanHostsDeps {
	readonly hosts: IHostsManager
	readonly logger: ILogger
}

export class CleanHostsUseCase {
	constructor(private readonly deps: CleanHostsDeps) {}

	execute(): Result<void, Error> {
		const managed = this.deps.hosts.getManagedHostnames()
		const result = this.deps.hosts.clean()
		if (isErr(result)) return result

		this.deps.logger.info(`Cleaned ${managed.length} hostname(s) from /etc/hosts`)
		return ok(undefined)
	}
}

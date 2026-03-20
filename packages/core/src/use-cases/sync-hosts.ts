import type { IHostsManager } from '../ports/hosts-manager.js'
import type { ILogger } from '../ports/logger.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { Result } from '../result.js'
import { isErr, ok } from '../result.js'

export interface SyncHostsDeps {
	readonly routes: IRouteRepository
	readonly hosts: IHostsManager
	readonly logger: ILogger
}

export class SyncHostsUseCase {
	constructor(private readonly deps: SyncHostsDeps) {}

	execute(): Result<void, Error> {
		const routes = this.deps.routes.loadRoutes()
		const hostnames = routes.map((r) => r.hostname.value)

		const result = this.deps.hosts.sync(hostnames)
		if (isErr(result)) return result

		this.deps.logger.info(`Synced ${hostnames.length} hostname(s) to /etc/hosts`)
		return ok(undefined)
	}
}

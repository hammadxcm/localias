import type { ILogger } from '../ports/logger.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { Result } from '../result.js'
import { err, isErr, ok } from '../result.js'

export interface RemoveAliasDeps {
	readonly routes: IRouteRepository
	readonly logger: ILogger
}

export class RemoveAliasUseCase {
	constructor(private readonly deps: RemoveAliasDeps) {}

	execute(name: string): Result<void, Error> {
		const normalized = name.toLowerCase()
		const routes = this.deps.routes.loadRoutes()
		const route = routes.find(
			(r) => r.hostname.value === normalized || r.hostname.name === normalized,
		)

		if (!route) {
			return err(new Error(`No route found for "${name}"`))
		}

		if (!route.isAlias) {
			return err(new Error(`"${name}" is not an alias (owned by PID ${route.pid.value})`))
		}

		const result = this.deps.routes.removeRoute(route.hostname.value)
		if (isErr(result)) return result

		this.deps.logger.info(`Alias removed: ${route.hostname.value}`)
		return ok(undefined)
	}
}

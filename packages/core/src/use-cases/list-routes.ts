import type { IProcessManager } from '../ports/process-manager.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { Result } from '../result.js'
import { ok } from '../result.js'
import type { Route } from '../values/route.js'

export interface ListRoutesDeps {
	readonly routes: IRouteRepository
	readonly state: IStateManager
	readonly process: IProcessManager
}

export interface RouteInfo {
	readonly route: Route
	readonly alive: boolean
	readonly url: string
}

export interface ListRoutesResult {
	readonly routes: RouteInfo[]
	readonly proxyPort: number
	readonly tls: boolean
}

export class ListRoutesUseCase {
	constructor(private readonly deps: ListRoutesDeps) {}

	async execute(): Promise<Result<ListRoutesResult, Error>> {
		const proxyState = await this.deps.state.discoverState()
		const proxyPort = proxyState.port?.value ?? 1355
		const tls = proxyState.tls
		const routes = this.deps.routes.loadRoutes()

		const routeInfos: RouteInfo[] = routes.map((route) => ({
			route,
			alive: route.isAlias || this.deps.process.isAlive(route.pid),
			url: route.hostname.toUrl(proxyPort, tls),
		}))

		return ok({ routes: routeInfos, proxyPort, tls })
	}
}

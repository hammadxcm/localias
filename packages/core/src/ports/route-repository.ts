import type { LockAcquisitionError, RouteConflictError } from '../errors.js'
import type { Result } from '../result.js'
import type { Route } from '../values/route.js'

export interface Disposable {
	dispose(): void
}

export interface IRouteRepository {
	loadRoutes(): Route[]
	addRoute(route: Route, force?: boolean): Result<void, RouteConflictError | LockAcquisitionError>
	removeRoute(hostname: string): Result<void, LockAcquisitionError>
	watchRoutes(callback: (routes: Route[]) => void): Disposable
}

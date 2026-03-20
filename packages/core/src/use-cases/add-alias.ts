import type { Result } from '../result.js'
import { err, isErr } from '../result.js'
import type { IRouteRepository } from '../ports/route-repository.js'
import type { ILogger } from '../ports/logger.js'
import { Hostname } from '../values/hostname.js'
import { Port } from '../values/port.js'
import { ProcessId } from '../values/process-id.js'
import { Route } from '../values/route.js'

export interface AddAliasDeps {
	readonly routes: IRouteRepository
	readonly logger: ILogger
}

export class AddAliasUseCase {
	constructor(private readonly deps: AddAliasDeps) {}

	execute(name: string, port: number, tld?: string, force?: boolean): Result<void, Error> {
		const hostnameResult = Hostname.create(name, tld)
		if (isErr(hostnameResult)) return err(hostnameResult.error)

		const portResult = Port.create(port)
		if (isErr(portResult)) return err(portResult.error)

		const route = Route.create(hostnameResult.value, portResult.value, ProcessId.alias())
		const addResult = this.deps.routes.addRoute(route, force)
		if (isErr(addResult)) return addResult

		this.deps.logger.info(`Alias added: ${hostnameResult.value.value} → 127.0.0.1:${port}`)
		return addResult
	}
}

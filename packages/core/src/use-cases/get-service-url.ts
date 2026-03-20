import type { Result } from '../result.js'
import { ok, err, isErr } from '../result.js'
import type { IStateManager } from '../ports/state-manager.js'
import type { IGitAdapter } from '../ports/git-adapter.js'
import type { IProjectDetector } from '../ports/project-detector.js'
import { Hostname } from '../values/hostname.js'
import { sanitizeForHostname, truncateLabel } from '../values/hostname-sanitizer.js'

export interface GetServiceUrlDeps {
	readonly state: IStateManager
	readonly git: IGitAdapter
	readonly project: IProjectDetector
	readonly hashFn?: (input: string) => string
}

export class GetServiceUrlUseCase {
	constructor(private readonly deps: GetServiceUrlDeps) {}

	async execute(name?: string, cwd?: string): Promise<Result<string, Error>> {
		const resolvedCwd = cwd ?? process.cwd()
		const proxyState = await this.deps.state.discoverState()
		const proxyPort = proxyState.port?.value ?? 1355
		const tls = proxyState.tls
		const tld = proxyState.tld || 'localhost'

		let baseName: string
		if (name) {
			baseName = sanitizeForHostname(name)
		} else {
			const inferred = this.deps.project.inferName(resolvedCwd)
			if (isErr(inferred)) return err(inferred.error)
			baseName = sanitizeForHostname(inferred.value.name)
		}

		const worktree = this.deps.git.detectWorktreePrefix(resolvedCwd)
		if (worktree) {
			const prefix = sanitizeForHostname(worktree.prefix)
			if (prefix) baseName = `${prefix}-${baseName}`
		}

		baseName = truncateLabel(baseName, this.deps.hashFn)

		const hostnameResult = Hostname.create(baseName, tld)
		if (isErr(hostnameResult)) return err(hostnameResult.error)

		return ok(hostnameResult.value.toUrl(proxyPort, tls))
	}
}

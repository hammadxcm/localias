import type { Result } from '../result.js'

export interface ComposeServiceInfo {
	readonly name: string
	readonly portCount: number
}

export interface IComposeAdapter {
	parseServices(
		composeFileArgs: string[],
		cwd: string,
	): Promise<Result<ComposeServiceInfo[], Error>>
}

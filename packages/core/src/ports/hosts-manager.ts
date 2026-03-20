import type { Result } from '../result.js'

export interface IHostsManager {
	sync(hostnames: string[]): Result<void, Error>
	clean(): Result<void, Error>
	getManagedHostnames(): string[]
	checkResolution(hostname: string): Promise<boolean>
}

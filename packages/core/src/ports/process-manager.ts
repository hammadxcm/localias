import type { Result } from '../result.js'
import type { ProcessId } from '../values/process-id.js'

export interface IProcessManager {
	isAlive(pid: ProcessId): boolean
	spawn(command: string[], env: Record<string, string>, onCleanup?: () => void): void
	kill(pid: ProcessId, signal?: string): Result<void, Error>
	findPidOnPort(port: number): ProcessId | null
	currentPid(): ProcessId
}

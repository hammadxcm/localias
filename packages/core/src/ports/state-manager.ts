import type { Port } from '../values/port.js'
import type { ProcessId } from '../values/process-id.js'

export interface ProxyState {
	readonly running: boolean
	readonly port: Port | null
	readonly pid: ProcessId | null
	readonly tls: boolean
	readonly tld: string
	readonly stateDir: string | null
}

export interface IStateManager {
	resolveStateDir(port: number): string
	discoverState(): Promise<ProxyState>
	readProxyPid(stateDir: string): ProcessId | null
	writeProxyPid(stateDir: string, pid: ProcessId): void
	readProxyPort(stateDir: string): Port | null
	writeProxyPort(stateDir: string, port: Port): void
	readTlsMarker(stateDir: string): boolean
	writeTlsMarker(stateDir: string, enabled: boolean): void
	readTld(stateDir: string): string
	writeTld(stateDir: string, tld: string): void
}

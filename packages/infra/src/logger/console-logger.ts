import type { ILogger } from '@localias/core'

type LogLevel = 'silent' | 'info' | 'debug'

function getLevel(): LogLevel {
	const env = process.env.LOCALIAS_DEBUG
	if (env === '1' || env === 'true') return 'debug'
	if (process.env.LOCALIAS_SILENT === '1') return 'silent'
	return 'info'
}

export class ConsoleLogger implements ILogger {
	private readonly level: LogLevel

	constructor(level?: LogLevel) {
		this.level = level ?? getLevel()
	}

	info(message: string, context?: Record<string, unknown>): void {
		if (this.level === 'silent') return
		if (context) {
			console.log(message, context)
		} else {
			console.log(message)
		}
	}

	warn(message: string, context?: Record<string, unknown>): void {
		if (this.level === 'silent') return
		if (context) {
			console.warn(message, context)
		} else {
			console.warn(message)
		}
	}

	error(message: string, context?: Record<string, unknown>): void {
		if (context) {
			console.error(message, context)
		} else {
			console.error(message)
		}
	}

	debug(message: string, context?: Record<string, unknown>): void {
		if (this.level !== 'debug') return
		if (context) {
			console.log(`[debug] ${message}`, context)
		} else {
			console.log(`[debug] ${message}`)
		}
	}
}

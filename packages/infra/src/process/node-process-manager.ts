import { spawn as cpSpawn, execFileSync } from 'node:child_process'
import { join, delimiter } from 'node:path'
import type { IProcessManager, ProcessId } from '@publify/core'
import type { Result } from '@publify/core'
import { ok, err } from '@publify/core'
import { ProcessId as PidVO } from '@publify/core'

export class NodeProcessManager implements IProcessManager {
	isAlive(pid: ProcessId): boolean {
		if (pid.value <= 0) return false
		try {
			process.kill(pid.value, 0)
			return true
		} catch {
			return false
		}
	}

	spawn(command: string[], env: Record<string, string>, onCleanup?: () => void): void {
		const isWindows = process.platform === 'win32'
		const shell = isWindows ? 'cmd.exe' : '/bin/sh'
		const shellFlag = isWindows ? '/c' : '-c'
		const cmdStr = command.join(' ')

		// Augment PATH with node_modules/.bin
		const augmentedPath = [
			join(process.cwd(), 'node_modules', '.bin'),
			process.env['PATH'] ?? '',
		].join(delimiter)

		const child = cpSpawn(shell, [shellFlag, cmdStr], {
			stdio: 'inherit',
			env: {
				...process.env,
				...env,
				PATH: augmentedPath,
			},
			cwd: process.cwd(),
		})

		const cleanup = () => {
			if (onCleanup) onCleanup()
		}

		child.on('exit', (code) => {
			cleanup()
			process.exitCode = code ?? 1
		})

		// Forward signals to child
		const forwardSignal = (signal: NodeJS.Signals) => {
			child.kill(signal)
		}

		process.on('SIGINT', () => forwardSignal('SIGINT'))
		process.on('SIGTERM', () => forwardSignal('SIGTERM'))
	}

	kill(pid: ProcessId, signal?: string): Result<void, Error> {
		try {
			const sig = signal ?? 'SIGTERM'
			process.kill(pid.value, sig as NodeJS.Signals)
			return ok(undefined)
		} catch (e) {
			return err(new Error(`Failed to kill PID ${pid.value}: ${(e as Error).message}`))
		}
	}

	findPidOnPort(port: number): ProcessId | null {
		try {
			if (process.platform === 'win32') {
				const output = execFileSync('netstat', ['-ano'], { encoding: 'utf-8' })
				const match = output.match(new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`))
				if (match?.[1]) return PidVO.create(parseInt(match[1], 10))
			} else {
				const output = execFileSync('lsof', ['-i', `:${port}`, '-t', '-sTCP:LISTEN'], {
					encoding: 'utf-8',
					stdio: ['pipe', 'pipe', 'pipe'],
				})
				const pid = parseInt(output.trim().split('\n')[0]!, 10)
				if (!Number.isNaN(pid)) return PidVO.create(pid)
			}
		} catch {
			// command not available or no match
		}
		return null
	}

	currentPid(): ProcessId {
		return PidVO.create(process.pid)
	}
}

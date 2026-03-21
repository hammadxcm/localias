import { type ChildProcess, spawn as cpSpawn, execFileSync } from 'node:child_process'
import { delimiter, join } from 'node:path'
import type { IProcessManager, ProcessId } from '@localias/core'
import type { Result } from '@localias/core'
import { err, ok } from '@localias/core'
import { ProcessId as PidVO } from '@localias/core'

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
		const cmdStr = command.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ')

		const augmentedPath = [
			join(process.cwd(), 'node_modules', '.bin'),
			process.env.PATH ?? '',
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

		let exited = false

		const cleanup = () => {
			if (exited) return
			exited = true
			process.removeListener('SIGINT', onSigInt)
			process.removeListener('SIGTERM', onSigTerm)
			if (onCleanup) onCleanup()
		}

		child.on('exit', (code) => {
			cleanup()
			process.exitCode = code ?? 1
		})

		const onSigInt = () => {
			child.kill('SIGINT')
		}
		const onSigTerm = () => {
			child.kill('SIGTERM')
		}

		process.on('SIGINT', onSigInt)
		process.on('SIGTERM', onSigTerm)
	}

	spawnMultiple(
		entries: ReadonlyArray<{ command: string[]; env: Record<string, string> }>,
		onCleanup?: () => void,
	): void {
		const isWindows = process.platform === 'win32'
		const shell = isWindows ? 'cmd.exe' : '/bin/sh'
		const shellFlag = isWindows ? '/c' : '-c'

		const augmentedPath = [
			join(process.cwd(), 'node_modules', '.bin'),
			process.env.PATH ?? '',
		].join(delimiter)

		const children: ChildProcess[] = []
		let exitedCount = 0
		let shuttingDown = false

		const killAll = () => {
			if (shuttingDown) return
			shuttingDown = true
			for (const child of children) {
				try {
					child.kill('SIGTERM')
				} catch {
					// already exited
				}
			}
		}

		const onChildExit = () => {
			exitedCount++
			// When first child exits, kill all others
			killAll()
			// When all children have exited, clean up
			if (exitedCount === children.length) {
				process.removeListener('SIGINT', onSigInt)
				process.removeListener('SIGTERM', onSigTerm)
				if (onCleanup) onCleanup()
			}
		}

		const onSigInt = () => killAll()
		const onSigTerm = () => killAll()

		process.on('SIGINT', onSigInt)
		process.on('SIGTERM', onSigTerm)

		for (const entry of entries) {
			const cmdStr = entry.command.map((arg) => (arg.includes(' ') ? `"${arg}"` : arg)).join(' ')

			const child = cpSpawn(shell, [shellFlag, cmdStr], {
				stdio: 'inherit',
				env: {
					...process.env,
					...entry.env,
					PATH: augmentedPath,
				},
				cwd: process.cwd(),
			})

			child.on('exit', onChildExit)
			children.push(child)
		}
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
				const match = output.match(new RegExp(`[:\\.]${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`))
				if (match?.[1]) return PidVO.create(Number.parseInt(match[1], 10))
			} else {
				const output = execFileSync('lsof', ['-i', `:${port}`, '-t', '-sTCP:LISTEN'], {
					encoding: 'utf-8',
					stdio: ['pipe', 'pipe', 'pipe'],
				})
				const pid = Number.parseInt(output.trim().split('\n')[0]!, 10)
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

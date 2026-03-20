import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Port, ProcessId } from '@localias/core'
import { isOk } from '@localias/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileStateManager } from './file-state-manager.js'

const TEST_DIR = join(tmpdir(), `localias-test-${process.pid}`)

describe('FileStateManager', () => {
	let mgr: FileStateManager

	beforeEach(() => {
		mkdirSync(TEST_DIR, { recursive: true })
		process.env.LOCALIAS_STATE_DIR = TEST_DIR
		mgr = new FileStateManager()
	})

	afterEach(() => {
		process.env.LOCALIAS_STATE_DIR = undefined
		rmSync(TEST_DIR, { recursive: true, force: true })
	})

	it('resolveStateDir creates directory', () => {
		const dir = mgr.resolveStateDir(1355)
		expect(existsSync(dir)).toBe(true)
	})

	it('writes and reads proxy PID', () => {
		const dir = mgr.resolveStateDir(1355)
		mgr.writeProxyPid(dir, ProcessId.create(12345))
		const pid = mgr.readProxyPid(dir)
		expect(pid?.value).toBe(12345)
	})

	it('reads null for missing PID', () => {
		expect(mgr.readProxyPid('/nonexistent/path')).toBeNull()
	})

	it('writes and reads proxy port', () => {
		const dir = mgr.resolveStateDir(1355)
		const portResult = Port.create(8080)
		if (isOk(portResult)) {
			mgr.writeProxyPort(dir, portResult.value)
			const port = mgr.readProxyPort(dir)
			expect(port?.value).toBe(8080)
		}
	})

	it('writes and reads TLS marker', () => {
		const dir = mgr.resolveStateDir(1355)
		mgr.writeTlsMarker(dir, true)
		expect(mgr.readTlsMarker(dir)).toBe(true)
		mgr.writeTlsMarker(dir, false)
		expect(mgr.readTlsMarker(dir)).toBe(false)
	})

	it('writes and reads TLD', () => {
		const dir = mgr.resolveStateDir(1355)
		mgr.writeTld(dir, 'test')
		expect(mgr.readTld(dir)).toBe('test')
	})

	it('returns localhost for missing TLD', () => {
		expect(mgr.readTld('/nonexistent')).toBe('localhost')
	})

	it('reads null for missing port', () => {
		expect(mgr.readProxyPort('/nonexistent')).toBeNull()
	})

	it('discoverState returns not running when no state exists', async () => {
		const state = await mgr.discoverState()
		expect(state.running).toBe(false)
		expect(state.port).toBeNull()
		expect(state.pid).toBeNull()
	})
})

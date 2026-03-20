import { describe, it, expect } from 'vitest'
import { Port } from './port.js'
import { isOk, isErr } from '../result.js'

describe('Port', () => {
	it('creates valid port', () => {
		const r = Port.create(3000)
		expect(isOk(r)).toBe(true)
		if (isOk(r)) expect(r.value.value).toBe(3000)
	})

	it('rejects 0', () => {
		expect(isErr(Port.create(0))).toBe(true)
	})

	it('rejects negative', () => {
		expect(isErr(Port.create(-1))).toBe(true)
	})

	it('rejects > 65535', () => {
		expect(isErr(Port.create(65536))).toBe(true)
	})

	it('rejects float', () => {
		expect(isErr(Port.create(3.5))).toBe(true)
	})

	it('isPrivileged', () => {
		expect(Port.isPrivileged({ value: 80 } as any)).toBe(true)
		expect(Port.isPrivileged({ value: 1024 } as any)).toBe(false)
	})
})

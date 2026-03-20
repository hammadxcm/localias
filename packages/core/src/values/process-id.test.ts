import { describe, expect, it } from 'vitest'
import { ProcessId } from './process-id.js'

describe('ProcessId', () => {
	it('creates alias with value 0', () => {
		expect(ProcessId.alias().value).toBe(0)
	})

	it('creates valid PID', () => {
		expect(ProcessId.create(1234).value).toBe(1234)
	})

	it('accepts PID 0 via create', () => {
		expect(ProcessId.create(0).value).toBe(0)
	})

	it('rejects negative PID', () => {
		expect(() => ProcessId.create(-1)).toThrow(RangeError)
	})

	it('rejects NaN PID', () => {
		expect(() => ProcessId.create(Number.NaN)).toThrow(RangeError)
	})

	it('rejects float PID', () => {
		expect(() => ProcessId.create(1.5)).toThrow(RangeError)
	})

	it('rejects Infinity', () => {
		expect(() => ProcessId.create(Number.POSITIVE_INFINITY)).toThrow(RangeError)
	})
})

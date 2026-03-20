import { describe, expect, it } from 'vitest'
import { err, isErr, isOk, mapResult, ok, unwrap } from './result.js'

describe('Result', () => {
	it('ok creates Ok result', () => {
		const r = ok(42)
		expect(r._tag).toBe('Ok')
		expect(r.value).toBe(42)
	})

	it('err creates Err result', () => {
		const r = err('fail')
		expect(r._tag).toBe('Err')
		expect(r.error).toBe('fail')
	})

	it('isOk/isErr discriminate', () => {
		expect(isOk(ok(1))).toBe(true)
		expect(isErr(ok(1))).toBe(false)
		expect(isOk(err('x'))).toBe(false)
		expect(isErr(err('x'))).toBe(true)
	})

	it('unwrap returns value for Ok', () => {
		expect(unwrap(ok('hello'))).toBe('hello')
	})

	it('unwrap throws for Err', () => {
		expect(() => unwrap(err(new Error('boom')))).toThrow('boom')
	})

	it('unwrap wraps non-Error in Error', () => {
		expect(() => unwrap(err('string error'))).toThrow('string error')
	})

	it('mapResult transforms Ok values', () => {
		const r = mapResult(ok(5), (n) => n * 2)
		expect(isOk(r) && r.value).toBe(10)
	})

	it('mapResult passes through Err', () => {
		const r = mapResult(err('fail'), (n: number) => n * 2)
		expect(isErr(r) && r.error).toBe('fail')
	})

	it('results are frozen', () => {
		const r = ok({ x: 1 })
		expect(Object.isFrozen(r)).toBe(true)
	})
})

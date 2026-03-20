import { describe, expect, it } from 'vitest'
import { ArgParser } from './parser.js'

describe('ArgParser', () => {
	it('parses flags', () => {
		const parser = new ArgParser(['--force', '--verbose'])
		expect(parser.flag('force')).toBe(true)
		expect(parser.flag('verbose')).toBe(true)
		expect(parser.flag('other')).toBe(false)
	})

	it('parses flag aliases', () => {
		const parser = new ArgParser(['-h'])
		expect(parser.flag('help', 'h')).toBe(true)
	})

	it('parses options', () => {
		const parser = new ArgParser(['--name', 'myapp', '--port', '3000'])
		expect(parser.option('name')).toBe('myapp')
		expect(parser.optionNumber('port')).toBe(3000)
	})

	it('parses option aliases', () => {
		const parser = new ArgParser(['-p', '3000'])
		expect(parser.optionNumber('port', 'p')).toBe(3000)
	})

	it('parses positionals', () => {
		const parser = new ArgParser(['run', 'myapp'])
		expect(parser.positional()).toBe('run')
		expect(parser.positional()).toBe('myapp')
	})

	it('parses rest after --', () => {
		const parser = new ArgParser(['run', '--', 'npm', 'start'])
		parser.positional() // consume 'run'
		expect(parser.rest()).toEqual(['npm', 'start'])
	})

	it('detects unknown flags', () => {
		const parser = new ArgParser(['--known', '--unknown', '-x'])
		parser.flag('known')
		expect(parser.unknown()).toEqual(['--unknown', '-x'])
	})

	it('does not consume flags as option values', () => {
		const parser = new ArgParser(['--name', '--force'])
		expect(parser.option('name')).toBeUndefined()
		expect(parser.flag('force')).toBe(true)
	})

	it('handles option as last arg with no value', () => {
		const parser = new ArgParser(['--name'])
		expect(parser.option('name')).toBeUndefined()
	})

	it('optionNumber returns undefined for non-numeric', () => {
		const parser = new ArgParser(['--port', 'abc'])
		expect(parser.optionNumber('port')).toBeUndefined()
	})

	it('handles empty args', () => {
		const parser = new ArgParser([])
		expect(parser.flag('help')).toBe(false)
		expect(parser.option('name')).toBeUndefined()
		expect(parser.positional()).toBeUndefined()
		expect(parser.rest()).toEqual([])
	})

	it('rest with -- separator returns only args after --', () => {
		const parser = new ArgParser(['--force', '--', 'npm', 'start'])
		parser.flag('force')
		expect(parser.rest()).toEqual(['npm', 'start'])
	})

	it('flags consumed before rest are not in rest output', () => {
		const parser = new ArgParser(['--force', '--app-port', '4000', 'npm', 'start'])
		parser.flag('force')
		parser.optionNumber('app-port')
		const rest = parser.rest()
		expect(rest).toEqual(['npm', 'start'])
		expect(rest).not.toContain('--force')
		expect(rest).not.toContain('--app-port')
		expect(rest).not.toContain('4000')
	})

	it('option with alias -p works', () => {
		const parser = new ArgParser(['-p', '3000'])
		expect(parser.option('port', 'p')).toBe('3000')
	})

	it('multiple positionals consumed in order', () => {
		const parser = new ArgParser(['proxy', 'start'])
		expect(parser.positional()).toBe('proxy')
		expect(parser.positional()).toBe('start')
		expect(parser.positional()).toBeUndefined()
	})
})

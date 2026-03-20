import { describe, it, expect } from 'vitest'
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
})

import { describe, expect, it, vi } from 'vitest'
import { ConsoleLogger } from './console-logger.js'

describe('ConsoleLogger', () => {
	it('logs info messages', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new ConsoleLogger('info')
		logger.info('hello')
		expect(spy).toHaveBeenCalledWith('hello')
		spy.mockRestore()
	})

	it('suppresses info in silent mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new ConsoleLogger('silent')
		logger.info('hello')
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
	})

	it('suppresses warn in silent mode', () => {
		const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const logger = new ConsoleLogger('silent')
		logger.warn('hello')
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
	})

	it('always logs errors even in silent mode', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const logger = new ConsoleLogger('silent')
		logger.error('fail')
		expect(spy).toHaveBeenCalledWith('fail')
		spy.mockRestore()
	})

	it('shows debug in debug mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new ConsoleLogger('debug')
		logger.debug('trace')
		expect(spy).toHaveBeenCalledWith('[debug] trace')
		spy.mockRestore()
	})

	it('suppresses debug in info mode', () => {
		const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const logger = new ConsoleLogger('info')
		logger.debug('trace')
		expect(spy).not.toHaveBeenCalled()
		spy.mockRestore()
	})
})

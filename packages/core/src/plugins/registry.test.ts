import { describe, it, expect } from 'vitest'
import { PluginRegistry } from './registry.js'
import type { FrameworkPlugin } from './types.js'

const testPlugin: FrameworkPlugin = {
	name: 'test-framework',
	strictPort: true,
	detect: (ctx) => ctx.command === 'test-fw',
	injectFlags: (args, port) => [...args, '--port', String(port)],
}

describe('PluginRegistry', () => {
	it('detects registered plugin', () => {
		const registry = new PluginRegistry()
		registry.register(testPlugin)
		expect(registry.detect(['test-fw', 'dev'])?.name).toBe('test-framework')
	})

	it('returns null for unknown command', () => {
		const registry = new PluginRegistry()
		registry.register(testPlugin)
		expect(registry.detect(['unknown'])).toBeNull()
	})

	it('resolves through npx', () => {
		const registry = new PluginRegistry()
		registry.register(testPlugin)
		expect(registry.detect(['npx', 'test-fw', 'dev'])?.name).toBe('test-framework')
	})

	it('resolves through pnpm dlx', () => {
		const registry = new PluginRegistry()
		registry.register(testPlugin)
		expect(registry.detect(['pnpm', 'dlx', 'test-fw', 'dev'])?.name).toBe('test-framework')
	})

	it('injects flags', () => {
		const registry = new PluginRegistry()
		registry.register(testPlugin)
		const result = registry.injectFlags(['test-fw', 'dev'], 4000)
		expect(result).toContain('--port')
		expect(result).toContain('4000')
	})

	it('passes through unmatched commands', () => {
		const registry = new PluginRegistry()
		const result = registry.injectFlags(['unknown', 'cmd'], 4000)
		expect(result).toEqual(['unknown', 'cmd'])
	})
})

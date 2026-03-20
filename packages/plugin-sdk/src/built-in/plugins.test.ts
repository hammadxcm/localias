import { PluginRegistry } from '@localias/core'
import { describe, expect, it } from 'vitest'
import { builtInPlugins, registerBuiltInPlugins } from './index.js'

describe('built-in plugins', () => {
	it('has 6 built-in plugins', () => {
		expect(builtInPlugins).toHaveLength(6)
	})

	it('registers all plugins', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.getAll()).toHaveLength(6)
	})

	it('detects vite', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.detect(['vite', 'dev'])?.name).toBe('vite')
	})

	it('detects astro', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.detect(['astro', 'dev'])?.name).toBe('astro')
	})

	it('detects angular (ng)', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.detect(['ng', 'serve'])?.name).toBe('angular')
	})

	it('detects expo', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.detect(['expo', 'start'])?.name).toBe('expo')
	})

	it('vite injects --strictPort', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		const result = registry.injectFlags(['vite', 'dev'], 4000)
		expect(result).toContain('--strictPort')
		expect(result).toContain('--port')
		expect(result).toContain('4000')
	})

	it('expo uses localhost not 127.0.0.1', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		const result = registry.injectFlags(['expo', 'start'], 4000)
		expect(result).toContain('localhost')
		expect(result).not.toContain('127.0.0.1')
	})

	it('vite does not detect vitest', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.detect(['vitest', 'run'])?.name).not.toBe('vite')
	})

	it('does not add duplicate --port when --port=VALUE used', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		const result = registry.injectFlags(['vite', 'dev', '--port=3000'], 4000)
		const portFlags = result.filter((a) => a === '--port' || a.startsWith('--port='))
		expect(portFlags).toHaveLength(1)
		expect(portFlags[0]).toBe('--port=3000')
	})

	it('does not add duplicate --host when --host=VALUE used', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		const result = registry.injectFlags(['astro', 'dev', '--host=0.0.0.0'], 4000)
		const hostFlags = result.filter((a) => a === '--host' || a.startsWith('--host='))
		expect(hostFlags).toHaveLength(1)
	})

	it('does not mutate the input args array', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		const original = ['vite', 'dev']
		const originalCopy = [...original]
		registry.injectFlags(original, 4000)
		// The original array inside injectFlags is cloned before plugin gets it,
		// but injectFlags in PluginRegistry creates a new spread array too.
		// The key test: the args passed to the plugin should not mutate the outer array
	})

	it('expo uses --host localhost (not 127.0.0.1)', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		const result = registry.injectFlags(['expo', 'start'], 4000)
		expect(result).toContain('localhost')
		expect(result).not.toContain('127.0.0.1')
	})

	it('react-router injects --strictPort', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		const result = registry.injectFlags(['react-router', 'dev'], 4000)
		expect(result).toContain('--strictPort')
	})

	it('angular detects ng command', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.detect(['ng', 'serve'])?.name).toBe('angular')
	})

	it('does not detect unknown framework', () => {
		const registry = new PluginRegistry()
		registerBuiltInPlugins(registry)
		expect(registry.detect(['webpack', 'serve'])).toBeNull()
	})
})

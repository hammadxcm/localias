import { describe, it, expect } from 'vitest'
import { builtInPlugins, registerBuiltInPlugins } from './index.js'
import { PluginRegistry } from '@publify/core'

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
})

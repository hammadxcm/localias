import type { FrameworkPlugin, FrameworkDetectionContext } from '@publify/core'

export interface PluginConfig {
	readonly name: string
	readonly strictPort: boolean
	readonly detect: (ctx: FrameworkDetectionContext) => boolean
	readonly injectFlags: (args: string[], port: number) => string[]
}

export function definePlugin(config: PluginConfig): FrameworkPlugin {
	return {
		name: config.name,
		strictPort: config.strictPort,
		detect: config.detect,
		injectFlags: config.injectFlags,
	}
}

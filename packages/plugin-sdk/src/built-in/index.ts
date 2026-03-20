import type { PluginRegistry } from '@localias/core'
import { angularPlugin } from './angular.js'
import { astroPlugin } from './astro.js'
import { expoPlugin } from './expo.js'
import { reactNativePlugin } from './react-native.js'
import { reactRouterPlugin } from './react-router.js'
import { vitePlugin } from './vite.js'

export const builtInPlugins = [
	vitePlugin,
	reactRouterPlugin,
	astroPlugin,
	angularPlugin,
	reactNativePlugin,
	expoPlugin,
] as const

export function registerBuiltInPlugins(registry: PluginRegistry): void {
	for (const plugin of builtInPlugins) {
		registry.register(plugin)
	}
}

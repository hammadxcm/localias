import type { PluginRegistry } from '@publify/core'
import { vitePlugin } from './vite.js'
import { reactRouterPlugin } from './react-router.js'
import { astroPlugin } from './astro.js'
import { angularPlugin } from './angular.js'
import { reactNativePlugin } from './react-native.js'
import { expoPlugin } from './expo.js'

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

export { definePlugin } from './define-plugin.js'
export type { PluginConfig } from './define-plugin.js'
export { builtInPlugins, registerBuiltInPlugins } from './built-in/index.js'
export { vitePlugin } from './built-in/vite.js'
export { reactRouterPlugin } from './built-in/react-router.js'
export { astroPlugin } from './built-in/astro.js'
export { angularPlugin } from './built-in/angular.js'
export { reactNativePlugin } from './built-in/react-native.js'
export { expoPlugin } from './built-in/expo.js'

// Re-export core plugin types for convenience
export type { FrameworkPlugin, FrameworkDetectionContext } from '@publify/core'
export { PluginRegistry } from '@publify/core'

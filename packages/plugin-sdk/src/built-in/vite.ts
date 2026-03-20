import { definePlugin } from '../define-plugin.js'

export const vitePlugin = definePlugin({
	name: 'vite',
	strictPort: true,
	detect: (ctx) => ctx.command === 'vite',
	injectFlags: (args, port) => {
		const result = [...args]
		if (!result.some((a) => a === '--port' || a.startsWith('--port='))) {
			result.push('--port', String(port))
		}
		if (!result.some((a) => a === '--strictPort' || a.startsWith('--strictPort='))) {
			result.push('--strictPort')
		}
		if (!result.some((a) => a === '--host' || a.startsWith('--host='))) {
			result.push('--host', '127.0.0.1')
		}
		return result
	},
})

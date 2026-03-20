import { definePlugin } from '../define-plugin.js'

export const expoPlugin = definePlugin({
	name: 'expo',
	strictPort: false,
	detect: (ctx) => ctx.command === 'expo',
	injectFlags: (args, port) => {
		const result = [...args]
		if (!result.some((a) => a === '--port' || a.startsWith('--port='))) {
			result.push('--port', String(port))
		}
		if (!result.some((a) => a === '--host' || a.startsWith('--host='))) {
			result.push('--host', 'localhost')
		}
		return result
	},
})

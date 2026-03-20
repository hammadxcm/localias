import { definePlugin } from '../define-plugin.js'

export const angularPlugin = definePlugin({
	name: 'angular',
	strictPort: false,
	detect: (ctx) => ctx.command === 'ng',
	injectFlags: (args, port) => {
		const result = [...args]
		if (!result.some((a) => a === '--port' || a.startsWith('--port='))) {
			result.push('--port', String(port))
		}
		if (!result.some((a) => a === '--host' || a.startsWith('--host='))) {
			result.push('--host', '127.0.0.1')
		}
		return result
	},
})

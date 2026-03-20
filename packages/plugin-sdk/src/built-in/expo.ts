import { definePlugin } from '../define-plugin.js'

export const expoPlugin = definePlugin({
	name: 'expo',
	strictPort: false,
	detect: (ctx) => ctx.command === 'expo',
	injectFlags: (args, port) => {
		if (!args.some((a) => a === '--port')) {
			args.push('--port', String(port))
		}
		if (!args.some((a) => a === '--host')) {
			args.push('--host', 'localhost')
		}
		return args
	},
})

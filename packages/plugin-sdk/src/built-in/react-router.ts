import { definePlugin } from '../define-plugin.js'

export const reactRouterPlugin = definePlugin({
	name: 'react-router',
	strictPort: true,
	detect: (ctx) => ctx.command === 'react-router',
	injectFlags: (args, port) => {
		if (!args.some((a) => a === '--port')) {
			args.push('--port', String(port))
		}
		if (!args.some((a) => a === '--strictPort')) {
			args.push('--strictPort')
		}
		if (!args.some((a) => a === '--host')) {
			args.push('--host', '127.0.0.1')
		}
		return args
	},
})

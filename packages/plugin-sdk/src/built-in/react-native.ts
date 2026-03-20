import { definePlugin } from '../define-plugin.js'

export const reactNativePlugin = definePlugin({
	name: 'react-native',
	strictPort: false,
	detect: (ctx) => ctx.command === 'react-native',
	injectFlags: (args, port) => {
		if (!args.some((a) => a === '--port')) {
			args.push('--port', String(port))
		}
		if (!args.some((a) => a === '--host')) {
			args.push('--host', '127.0.0.1')
		}
		return args
	},
})

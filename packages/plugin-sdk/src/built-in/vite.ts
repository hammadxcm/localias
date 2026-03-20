import { definePlugin } from '../define-plugin.js'

export const vitePlugin = definePlugin({
	name: 'vite',
	strictPort: true,
	detect: (ctx) => ctx.command === 'vite' || ctx.command === 'vitest',
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

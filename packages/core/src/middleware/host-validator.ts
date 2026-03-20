import type { ProxyMiddleware } from './types.js'

export const hostValidator: ProxyMiddleware = (ctx, next) => {
	const host = ctx.request.headers['host'] ?? ctx.request.headers[':authority']
	if (!host) {
		ctx.response.statusCode = 400
		ctx.response.end('Bad Request: Missing Host header')
		return
	}
	ctx.metadata['host'] = typeof host === 'string' ? host : host[0]
	return next()
}

import type { ProxyMiddleware } from './types.js'

export const hostValidator: ProxyMiddleware = (ctx, next) => {
	const raw = ctx.request.headers.host ?? ctx.request.headers[':authority']
	const host = Array.isArray(raw) ? raw[0] : raw
	if (!host) {
		ctx.response.statusCode = 400
		ctx.response.end('Bad Request: Missing Host header')
		return
	}
	ctx.metadata.host = host
	return next()
}

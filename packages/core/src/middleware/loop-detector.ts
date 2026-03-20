import type { ProxyMiddleware } from './types.js'

const MAX_HOPS = 5
const HOP_HEADER = 'x-publify-hops'

export const loopDetector: ProxyMiddleware = (ctx, next) => {
	const hopsRaw = ctx.request.headers[HOP_HEADER]
	const hops = typeof hopsRaw === 'string' ? parseInt(hopsRaw, 10) : 0

	if (hops >= MAX_HOPS) {
		ctx.response.statusCode = 508
		ctx.response.end(`Loop detected: ${hops} hops`)
		return
	}

	ctx.metadata['hops'] = hops
	return next()
}

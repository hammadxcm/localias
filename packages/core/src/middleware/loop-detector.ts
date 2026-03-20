import type { ProxyMiddleware } from './types.js'

const MAX_HOPS = 5
const HOP_HEADER = 'x-localias-hops'

export const loopDetector: ProxyMiddleware = (ctx, next) => {
	const hopsRaw = ctx.request.headers[HOP_HEADER]
	const hopsStr = Array.isArray(hopsRaw) ? hopsRaw[0] : hopsRaw
	const parsed = typeof hopsStr === 'string' ? Number.parseInt(hopsStr, 10) : 0
	const hops = Number.isNaN(parsed) ? 0 : parsed

	if (hops >= MAX_HOPS) {
		ctx.response.statusCode = 508
		ctx.response.end(`Loop detected: ${hops} hops`)
		return
	}

	ctx.metadata.hops = hops
	return next()
}

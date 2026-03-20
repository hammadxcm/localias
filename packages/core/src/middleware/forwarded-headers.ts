import type { ProxyMiddleware } from './types.js'

const HOP_HEADER = 'x-localias-hops'

export const forwardedHeaders: ProxyMiddleware = (ctx, next) => {
	const hops = (ctx.metadata.hops as number | undefined) ?? 0
	const host = ctx.metadata.host as string | undefined
	const proto = ctx.config.tls ? 'https' : 'http'
	const remoteAddress = ctx.request.remoteAddress ?? '127.0.0.1'

	const existingXff = ctx.request.headers['x-forwarded-for']
	const xffValue = existingXff
		? `${Array.isArray(existingXff) ? existingXff.join(', ') : existingXff}, ${remoteAddress}`
		: remoteAddress

	ctx.metadata.forwardedHeaders = {
		'x-forwarded-for': xffValue,
		'x-forwarded-proto': proto,
		'x-forwarded-host': host ?? '',
		[HOP_HEADER]: String(hops + 1),
		'x-localias': '1',
	}

	return next()
}

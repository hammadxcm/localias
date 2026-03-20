import type { ProxyMiddleware } from './types.js'

const HOP_HEADER = 'x-publify-hops'

export const forwardedHeaders: ProxyMiddleware = (ctx, next) => {
	const hops = (ctx.metadata['hops'] as number | undefined) ?? 0
	const host = ctx.metadata['host'] as string | undefined
	const proto = ctx.config.tls ? 'https' : 'http'
	const remoteAddress = ctx.request.remoteAddress ?? '127.0.0.1'

	ctx.metadata['forwardedHeaders'] = {
		'x-forwarded-for': remoteAddress,
		'x-forwarded-proto': proto,
		'x-forwarded-host': host ?? '',
		[HOP_HEADER]: String(hops + 1),
		'x-publify': '1',
	}

	return next()
}

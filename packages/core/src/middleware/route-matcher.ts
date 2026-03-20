import type { ProxyMiddleware } from './types.js'

export const routeMatcher: ProxyMiddleware = (ctx, next) => {
	const host = ctx.metadata['host'] as string | undefined
	if (!host) return next()

	const routes = ctx.routes()
	const normalized = host.toLowerCase().replace(/:\d+$/, '')

	// Exact match first
	for (const route of routes) {
		if (route.hostname.matches(normalized) === 'exact') {
			ctx.matchedRoute = route
			return next()
		}
	}

	// Wildcard match
	for (const route of routes) {
		if (route.hostname.matches(normalized) === 'wildcard') {
			ctx.matchedRoute = route
			return next()
		}
	}

	return next()
}

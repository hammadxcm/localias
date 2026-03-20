import type { ProxyConfig } from '../values/proxy-config.js'
import type { Route } from '../values/route.js'

export interface ProxyContext {
	readonly request: {
		readonly method: string
		readonly url: string
		readonly headers: Record<string, string | string[] | undefined>
		readonly remoteAddress?: string
	}
	readonly response: {
		statusCode: number
		setHeader(name: string, value: string | string[]): void
		end(body?: string): void
		headersSent: boolean
	}
	readonly routes: () => Route[]
	readonly config: ProxyConfig
	matchedRoute?: Route
	metadata: Record<string, unknown>
}

export type NextFunction = () => Promise<void> | void
export type ProxyMiddleware = (ctx: ProxyContext, next: NextFunction) => Promise<void> | void

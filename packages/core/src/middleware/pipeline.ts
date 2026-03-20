import type { ProxyContext, ProxyMiddleware } from './types.js'

export class MiddlewarePipeline {
	private readonly middlewares: ProxyMiddleware[] = []

	use(middleware: ProxyMiddleware): this {
		this.middlewares.push(middleware)
		return this
	}

	async execute(ctx: ProxyContext): Promise<void> {
		let index = -1

		const dispatch = async (i: number): Promise<void> => {
			if (i <= index) {
				throw new Error('next() called multiple times')
			}
			index = i
			const middleware = this.middlewares[i]
			if (!middleware) return
			await middleware(ctx, () => dispatch(i + 1))
		}

		await dispatch(0)
	}
}

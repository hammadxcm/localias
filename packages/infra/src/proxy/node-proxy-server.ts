import { readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import type {
	CertificateInfo,
	ICertificateManager,
	IProxyServer,
	ProxyConfig,
	Route,
} from '@localias/core'
import type { Result } from '@localias/core'
import { err, ok } from '@localias/core'
import {
	MiddlewarePipeline,
	forwardedHeaders,
	hostValidator,
	loopDetector,
	routeMatcher,
} from '@localias/core'
import type { ProxyContext } from '@localias/core'
import { PageRenderer } from './page-renderer.js'

const HOP_BY_HOP = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
])

export class NodeProxyServer implements IProxyServer {
	private server: net.Server | http.Server | null = null
	private errorHandlers: Array<(error: Error) => void> = []
	private readonly pageRenderer = new PageRenderer()
	private certManager: ICertificateManager | undefined

	constructor(certManager?: ICertificateManager) {
		this.certManager = certManager
	}

	async start(
		config: ProxyConfig,
		getRoutes: () => Route[],
		certInfo?: CertificateInfo,
	): Promise<Result<void, Error>> {
		if (this.server) {
			return err(new Error('Server already started'))
		}

		const pipeline = new MiddlewarePipeline()
		pipeline.use(hostValidator)
		pipeline.use(loopDetector)
		pipeline.use(routeMatcher)
		pipeline.use(forwardedHeaders)

		const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
			this.handleRequest(req, res, getRoutes, config, pipeline)
		}

		const upgradeHandler = (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
			this.handleUpgrade(req, socket, head, getRoutes, config)
		}

		try {
			if (config.tls && certInfo) {
				const tlsOptions: https.ServerOptions = {
					cert: readFileSync(certInfo.certPath),
					key: readFileSync(certInfo.keyPath),
					ca: readFileSync(certInfo.caPath),
				}

				if (this.certManager) {
					const sniCallback = this.certManager.createSNICallback(
						config.stateDir,
						certInfo.certPath,
						certInfo.keyPath,
						config.tld,
					)
					;(tlsOptions as any).SNICallback = sniCallback
				}

				this.server = https.createServer(tlsOptions, requestHandler)
				this.server.on('upgrade', upgradeHandler)
			} else {
				this.server = http.createServer(requestHandler)
				this.server.on('upgrade', upgradeHandler)
			}

			await new Promise<void>((resolve, reject) => {
				const onError = (e: Error) => {
					this.server?.removeListener('listening', onListening)
					reject(e)
				}
				const onListening = () => {
					this.server?.removeListener('error', onError)
					resolve()
				}
				this.server?.once('error', onError)
				this.server?.once('listening', onListening)
				this.server?.listen(config.port.value)
			})

			return ok(undefined)
		} catch (e) {
			this.server = null
			return err(e as Error)
		}
	}

	async stop(): Promise<Result<void, Error>> {
		if (!this.server) {
			return err(new Error('Server not started'))
		}
		return new Promise((resolve) => {
			this.server?.close((e) => {
				this.server = null
				if (e) resolve(err(e))
				else resolve(ok(undefined))
			})
		})
	}

	async isRunning(): Promise<boolean> {
		return this.server?.listening ?? false
	}

	onError(handler: (error: Error) => void): void {
		this.errorHandlers.push(handler)
		if (this.server) {
			this.server.on('error', handler)
		}
	}

	private handleRequest(
		req: http.IncomingMessage,
		res: http.ServerResponse,
		getRoutes: () => Route[],
		config: ProxyConfig,
		pipeline: MiddlewarePipeline,
	): void {
		const ctx: ProxyContext = {
			request: {
				method: req.method ?? 'GET',
				url: req.url ?? '/',
				headers: req.headers as Record<string, string | string[] | undefined>,
				remoteAddress: req.socket.remoteAddress ?? '127.0.0.1',
			},
			response: {
				get statusCode() {
					return res.statusCode
				},
				set statusCode(code: number) {
					res.statusCode = code
				},
				setHeader: (name, value) => res.setHeader(name, value),
				end: (body) => res.end(body),
				get headersSent() {
					return res.headersSent
				},
			},
			routes: getRoutes,
			config,
			metadata: {},
		}

		pipeline
			.execute(ctx)
			.then(() => {
				if (res.headersSent) return

				const route = ctx.matchedRoute
				if (!route) {
					const host = (ctx.metadata.host as string) ?? ''
					res.statusCode = 404
					res.setHeader('Content-Type', 'text/html; charset=utf-8')
					res.end(this.pageRenderer.render404(host, getRoutes(), config.port.value, config.tls))
					return
				}

				// Proxy the request — try IPv4 first, fall back to IPv6
				const fwdHeaders = (ctx.metadata.forwardedHeaders ?? {}) as Record<string, string>
				const tryProxy = (hostname: string) => {
					const proxyReq = http.request(
						{
							hostname,
							port: route.port.value,
							path: req.url,
							method: req.method,
							headers: { ...req.headers, ...fwdHeaders },
						},
						(proxyRes) => {
							const headers = { ...proxyRes.headers }
							if ((req as any).httpVersion === '2.0') {
								for (const key of Object.keys(headers)) {
									if (HOP_BY_HOP.has(key.toLowerCase())) {
										delete headers[key]
									}
								}
							}

							res.writeHead(proxyRes.statusCode ?? 502, headers)
							proxyRes.pipe(res)
						},
					)

					proxyReq.on('error', () => {
						if (hostname === '127.0.0.1') {
							// IPv4 failed — retry on IPv6
							tryProxy('::1')
							return
						}
						if (!res.headersSent) {
							const host = (ctx.metadata.host as string) ?? ''
							res.statusCode = 502
							res.setHeader('Content-Type', 'text/html; charset=utf-8')
							res.end(this.pageRenderer.render502(host, route.port.value))
						}
					})

					req.pipe(proxyReq)
				}
				tryProxy('127.0.0.1')
			})
			.catch((e) => {
				for (const handler of this.errorHandlers) handler(e as Error)
				if (!res.headersSent) {
					res.statusCode = 500
					res.end('Internal Server Error')
				}
			})
	}

	private handleUpgrade(
		req: http.IncomingMessage,
		clientSocket: net.Socket,
		head: Buffer,
		getRoutes: () => Route[],
		config: ProxyConfig,
	): void {
		const host = req.headers.host ?? ''
		const normalized = host.toLowerCase().replace(/:\d+$/, '')
		const routes = getRoutes()

		let matched: Route | undefined
		for (const route of routes) {
			const result = route.hostname.matches(normalized)
			if (result === 'exact') {
				matched = route
				break
			}
			if (result === 'wildcard' && !matched) matched = route
		}

		if (!matched) {
			clientSocket.destroy()
			return
		}

		const target = matched
		const connectUpstream = (hostname: string) => {
			const serverSocket = net.connect(target.port.value, hostname, () => {
				const rawReq = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${Object.entries(
					req.headers,
				)
					.filter(([, v]) => v != null)
					.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
					.join('\r\n')}\r\n\r\n`

				serverSocket.write(rawReq)
				serverSocket.write(head)
				clientSocket.pipe(serverSocket)
				serverSocket.pipe(clientSocket)
			})

			serverSocket.on('error', () => {
				if (hostname === '127.0.0.1') {
					connectUpstream('::1')
					return
				}
				clientSocket.destroy()
			})
			clientSocket.on('error', () => serverSocket.destroy())
		}
		connectUpstream('127.0.0.1')
	}
}

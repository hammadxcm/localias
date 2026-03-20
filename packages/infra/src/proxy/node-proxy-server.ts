import http from 'node:http'
import https from 'node:https'
import http2 from 'node:http2'
import net from 'node:net'
import tls from 'node:tls'
import { readFileSync } from 'node:fs'
import type { IProxyServer, Route, ProxyConfig, CertificateInfo, ICertificateManager } from '@publify/core'
import type { Result } from '@publify/core'
import { ok, err } from '@publify/core'
import {
	MiddlewarePipeline,
	hostValidator,
	loopDetector,
	routeMatcher,
	forwardedHeaders,
} from '@publify/core'
import type { ProxyContext } from '@publify/core'
import { PageRenderer } from './page-renderer.js'

const HOP_BY_HOP = new Set([
	'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
	'te', 'trailer', 'transfer-encoding', 'upgrade',
])

export class NodeProxyServer implements IProxyServer {
	private server: net.Server | http.Server | null = null
	private errorHandlers: Array<(error: Error) => void> = []
	private readonly pageRenderer = new PageRenderer()
	private certManager?: ICertificateManager

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
				const tlsOptions: tls.TlsOptions = {
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

				// Use net.Server to peek first byte for TLS detection
				this.server = net.createServer((socket) => {
					socket.once('data', (data) => {
						socket.pause()
						// 0x16 = TLS handshake
						if (data[0] === 0x16) {
							const secureServer = http2.createSecureServer(
								{ ...tlsOptions, allowHTTP1: true },
								requestHandler,
							)
							secureServer.on('upgrade', upgradeHandler)
							secureServer.emit('connection', socket)
						} else {
							const httpServer = http.createServer(requestHandler)
							httpServer.on('upgrade', upgradeHandler)
							httpServer.emit('connection', socket)
						}
						socket.unshift(data)
						socket.resume()
					})
				})
			} else {
				this.server = http.createServer(requestHandler)
				this.server.on('upgrade', upgradeHandler)
			}

			await new Promise<void>((resolve, reject) => {
				this.server!.listen(config.port.value, () => resolve())
				this.server!.once('error', reject)
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
			this.server!.close((e) => {
				this.server = null
				if (e) resolve(err(e))
				else resolve(ok(undefined))
			})
		})
	}

	async isRunning(): Promise<boolean> {
		return this.server !== null && this.server.listening
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
				remoteAddress: req.socket.remoteAddress,
			},
			response: {
				get statusCode() { return res.statusCode },
				set statusCode(code: number) { res.statusCode = code },
				setHeader: (name, value) => res.setHeader(name, value),
				end: (body) => res.end(body),
				get headersSent() { return res.headersSent },
			},
			routes: getRoutes,
			config,
			metadata: {},
		}

		pipeline.execute(ctx).then(() => {
			if (res.headersSent) return

			const route = ctx.matchedRoute
			if (!route) {
				const host = (ctx.metadata['host'] as string) ?? ''
				res.statusCode = 404
				res.setHeader('Content-Type', 'text/html; charset=utf-8')
				res.end(this.pageRenderer.render404(host, getRoutes(), config.port.value, config.tls))
				return
			}

			// Proxy the request
			const fwdHeaders = (ctx.metadata['forwardedHeaders'] ?? {}) as Record<string, string>
			const proxyReq = http.request(
				{
					hostname: '127.0.0.1',
					port: route.port.value,
					path: req.url,
					method: req.method,
					headers: { ...req.headers, ...fwdHeaders },
				},
				(proxyRes) => {
					// Strip hop-by-hop headers for HTTP/2
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
				if (!res.headersSent) {
					const host = (ctx.metadata['host'] as string) ?? ''
					res.statusCode = 502
					res.setHeader('Content-Type', 'text/html; charset=utf-8')
					res.end(this.pageRenderer.render502(host, route.port.value))
				}
			})

			req.pipe(proxyReq)
		}).catch((e) => {
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
		const host = req.headers['host'] ?? ''
		const normalized = host.toLowerCase().replace(/:\d+$/, '')
		const routes = getRoutes()

		let matched: Route | undefined
		for (const route of routes) {
			const result = route.hostname.matches(normalized)
			if (result === 'exact') { matched = route; break }
			if (result === 'wildcard' && !matched) matched = route
		}

		if (!matched) {
			clientSocket.destroy()
			return
		}

		const serverSocket = net.connect(matched.port.value, '127.0.0.1', () => {
			const rawReq = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
				Object.entries(req.headers)
					.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
					.join('\r\n') +
				'\r\n\r\n'

			serverSocket.write(rawReq)
			serverSocket.write(head)
			clientSocket.pipe(serverSocket)
			serverSocket.pipe(clientSocket)
		})

		serverSocket.on('error', () => clientSocket.destroy())
		clientSocket.on('error', () => serverSocket.destroy())
	}
}

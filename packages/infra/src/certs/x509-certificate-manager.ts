import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ICertificateManager, SNICallback, CertificateInfo } from '@publify/core'
import type { Result } from '@publify/core'
import { ok, err, CertificateInfo as CertInfo, CertificateError } from '@publify/core'

// We'll use @peculiar/x509 for cert generation
import * as x509 from '@peculiar/x509'
import { Crypto } from '@peculiar/webcrypto'

const crypto = new Crypto()
x509.cryptoProvider.set(crypto as any)

const CA_CERT_FILE = 'ca.crt'
const CA_KEY_FILE = 'ca.key'
const CERT_DIR = 'certs'
const KEY_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' }
const SIGN_ALGORITHM = { name: 'ECDSA', hash: 'SHA-256' }
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export class X509CertificateManager implements ICertificateManager {
	private readonly sniCache = new Map<string, Promise<{ cert: string; key: string }>>()

	async ensureCertificates(stateDir: string): Promise<Result<CertificateInfo, CertificateError>> {
		const certDir = join(stateDir, CERT_DIR)
		mkdirSync(certDir, { recursive: true })

		const caPath = join(certDir, CA_CERT_FILE)
		const caKeyPath = join(certDir, CA_KEY_FILE)
		let caGenerated = false

		try {
			if (!existsSync(caPath) || !existsSync(caKeyPath)) {
				await this.generateCA(caPath, caKeyPath)
				caGenerated = true
			}

			// Generate default cert
			const defaultCertPath = join(certDir, 'default.crt')
			const defaultKeyPath = join(certDir, 'default.key')

			if (!existsSync(defaultCertPath) || !existsSync(defaultKeyPath)) {
				await this.generateCert(caPath, caKeyPath, defaultCertPath, defaultKeyPath, 'localhost')
			}

			return ok(new CertInfo(defaultCertPath, defaultKeyPath, caPath, caGenerated))
		} catch (e) {
			return err(new CertificateError((e as Error).message))
		}
	}

	async isCATrusted(_stateDir: string): Promise<boolean> {
		// Platform-specific check would go here
		return false
	}

	async trustCA(stateDir: string): Promise<Result<void, CertificateError>> {
		const caPath = join(stateDir, CERT_DIR, CA_CERT_FILE)
		if (!existsSync(caPath)) {
			return err(new CertificateError('CA certificate not found. Run ensureCertificates first.'))
		}

		try {
			const { PlatformTrustManager } = await import('./platform-trust.js')
			const trustMgr = new PlatformTrustManager()
			await trustMgr.trustCA(caPath)
			return ok(undefined)
		} catch (e) {
			return err(new CertificateError(`Failed to trust CA: ${(e as Error).message}`))
		}
	}

	createSNICallback(
		stateDir: string,
		_defaultCert: string,
		_defaultKey: string,
		tld = 'localhost',
	): SNICallback {
		const certDir = join(stateDir, CERT_DIR)
		const caPath = join(certDir, CA_CERT_FILE)
		const caKeyPath = join(certDir, CA_KEY_FILE)

		return (servername, cb) => {
			const getCert = this.sniCache.get(servername) ?? this.generateAndCache(
				servername,
				caPath,
				caKeyPath,
				certDir,
				tld,
			)

			getCert
				.then(({ cert, key }) => {
					// The caller (NodeProxyServer) will need to create the SecureContext
					// For now we store paths and let the server handle it
					cb(null, { cert, key } as any)
				})
				.catch((e) => cb(e as Error))
		}
	}

	private async generateAndCache(
		servername: string,
		caPath: string,
		caKeyPath: string,
		certDir: string,
		_tld: string,
	): Promise<{ cert: string; key: string }> {
		const promise = (async () => {
			const certPath = join(certDir, `${servername}.crt`)
			const keyPath = join(certDir, `${servername}.key`)

			if (existsSync(certPath) && existsSync(keyPath)) {
				return {
					cert: readFileSync(certPath, 'utf-8'),
					key: readFileSync(keyPath, 'utf-8'),
				}
			}

			await this.generateCert(caPath, caKeyPath, certPath, keyPath, servername)
			return {
				cert: readFileSync(certPath, 'utf-8'),
				key: readFileSync(keyPath, 'utf-8'),
			}
		})()

		this.sniCache.set(servername, promise)
		return promise
	}

	private async generateCA(caPath: string, caKeyPath: string): Promise<void> {
		const keys = await crypto.subtle.generateKey(KEY_ALGORITHM, true, ['sign', 'verify']) as CryptoKeyPair

		const cert = await x509.X509CertificateGenerator.createSelfSigned({
			serialNumber: this.randomSerial(),
			name: 'CN=Publify Local CA',
			notBefore: new Date(),
			notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			keys,
			signingAlgorithm: SIGN_ALGORITHM,
			extensions: [
				new x509.BasicConstraintsExtension(true, undefined, true),
				new x509.KeyUsagesExtension(
					x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
					true,
				),
			],
		})

		writeFileSync(caPath, cert.toString('pem'), 'utf-8')
		const exported = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
		const pem = this.toPem(exported, 'PRIVATE KEY')
		writeFileSync(caKeyPath, pem, 'utf-8')
	}

	private async generateCert(
		caPath: string,
		caKeyPath: string,
		certPath: string,
		keyPath: string,
		hostname: string,
	): Promise<void> {
		const caCert = new x509.X509Certificate(readFileSync(caPath, 'utf-8'))
		const caKeyPem = readFileSync(caKeyPath, 'utf-8')
		const caKey = await this.importPrivateKey(caKeyPem)

		const keys = await crypto.subtle.generateKey(KEY_ALGORITHM, true, ['sign', 'verify']) as CryptoKeyPair

		const sans = [hostname]
		if (!hostname.startsWith('*.')) {
			sans.push(`*.${hostname}`)
		}

		const cert = await x509.X509CertificateGenerator.create({
			serialNumber: this.randomSerial(),
			subject: `CN=${hostname}`,
			issuer: caCert.subject,
			notBefore: new Date(),
			notAfter: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			publicKey: keys.publicKey,
			signingKey: caKey,
			signingAlgorithm: SIGN_ALGORITHM,
			extensions: [
				new x509.BasicConstraintsExtension(false),
				new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature),
				new x509.SubjectAlternativeNameExtension(
					sans.map((s) => ({ type: 'dns', value: s })) as any,
				),
			],
		})

		writeFileSync(certPath, cert.toString('pem'), 'utf-8')
		const exported = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
		writeFileSync(keyPath, this.toPem(exported, 'PRIVATE KEY'), 'utf-8')
	}

	private async importPrivateKey(pem: string): Promise<CryptoKey> {
		const b64 = pem
			.replace(/-----BEGIN PRIVATE KEY-----/, '')
			.replace(/-----END PRIVATE KEY-----/, '')
			.replace(/\s/g, '')
		const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
		return crypto.subtle.importKey('pkcs8', binary, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
	}

	private toPem(buffer: ArrayBuffer, label: string): string {
		const b64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
		const lines = b64.match(/.{1,64}/g) ?? []
		return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`
	}

	private randomSerial(): string {
		const bytes = new Uint8Array(16)
		crypto.getRandomValues(bytes)
		return Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
	}
}

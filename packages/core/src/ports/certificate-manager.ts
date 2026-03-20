import type { CertificateError } from '../errors.js'
import type { Result } from '../result.js'
import type { CertificateInfo } from '../values/certificate-info.js'

export type SNICallback = (
	servername: string,
	cb: (err: Error | null, ctx?: unknown) => void,
) => void

export interface ICertificateManager {
	ensureCertificates(stateDir: string): Promise<Result<CertificateInfo, CertificateError>>
	isCATrusted(stateDir: string): Promise<boolean>
	trustCA(stateDir: string): Promise<Result<void, CertificateError>>
	createSNICallback(
		stateDir: string,
		defaultCert: string,
		defaultKey: string,
		tld?: string,
	): SNICallback
}

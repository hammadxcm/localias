import type { Result } from '../result.js'
import { ok, err } from '../result.js'
import { HostnameValidationError } from '../errors.js'

const LABEL_MAX = 63
const NAME_MAX = 253
const LABEL_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export class Hostname {
	readonly labels: readonly string[]
	readonly tld: string
	readonly name: string

	private constructor(readonly value: string) {
		this.labels = value.split('.')
		this.tld = this.labels[this.labels.length - 1]!
		this.name = this.labels[0]!
	}

	static create(input: string, tld = 'localhost'): Result<Hostname, HostnameValidationError> {
		let cleaned = input.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '')
		cleaned = cleaned.toLowerCase().trim()

		if (!cleaned) {
			return err(new HostnameValidationError(input, 'empty hostname'))
		}

		if (!cleaned.endsWith(`.${tld}`) && !cleaned.includes('.')) {
			cleaned = `${cleaned}.${tld}`
		}

		if (cleaned.length > NAME_MAX) {
			return err(new HostnameValidationError(input, `exceeds ${NAME_MAX} characters`))
		}

		const labels = cleaned.split('.')
		for (const label of labels) {
			if (label.length === 0) {
				return err(new HostnameValidationError(input, 'empty label'))
			}
			if (label.length > LABEL_MAX) {
				return err(new HostnameValidationError(input, `label "${label}" exceeds ${LABEL_MAX} characters`))
			}
			if (!LABEL_RE.test(label)) {
				return err(new HostnameValidationError(input, `label "${label}" contains invalid characters`))
			}
		}

		return ok(new Hostname(cleaned))
	}

	matches(host: string): 'exact' | 'wildcard' | 'none' {
		const normalized = host.toLowerCase().replace(/:\d+$/, '')
		if (normalized === this.value) return 'exact'
		if (normalized.endsWith(`.${this.value}`)) return 'wildcard'
		return 'none'
	}

	toUrl(proxyPort: number, tls: boolean): string {
		const scheme = tls ? 'https' : 'http'
		const defaultPort = tls ? 443 : 80
		const portSuffix = proxyPort === defaultPort ? '' : `:${proxyPort}`
		return `${scheme}://${this.value}${portSuffix}`
	}
}

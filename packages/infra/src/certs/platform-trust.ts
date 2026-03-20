import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

export class PlatformTrustManager {
	async trustCA(caPath: string): Promise<void> {
		switch (process.platform) {
			case 'darwin':
				return this.trustMacOS(caPath)
			case 'linux':
				return this.trustLinux(caPath)
			case 'win32':
				return this.trustWindows(caPath)
			default:
				throw new Error(`Unsupported platform: ${process.platform}`)
		}
	}

	private trustMacOS(caPath: string): void {
		const home = process.env.HOME
		if (!home) throw new Error('HOME environment variable not set')
		execFileSync('security', [
			'add-trusted-cert',
			'-d',
			'-r',
			'trustRoot',
			'-k',
			`${home}/Library/Keychains/login.keychain-db`,
			caPath,
		])
	}

	private trustLinux(caPath: string): void {
		// Detect distro
		let distro = 'unknown'
		try {
			const osRelease = readFileSync('/etc/os-release', 'utf-8')
			const osReleaseLower = osRelease.toLowerCase()
			if (osReleaseLower.includes('ubuntu') || osReleaseLower.includes('debian')) {
				distro = 'debian'
			} else if (
				osReleaseLower.includes('fedora') ||
				osReleaseLower.includes('rhel') ||
				osReleaseLower.includes('centos')
			) {
				distro = 'redhat'
			} else if (osReleaseLower.includes('arch')) {
				distro = 'arch'
			}
		} catch {
			// fall through
		}

		switch (distro) {
			case 'debian': {
				execFileSync('sudo', ['cp', caPath, '/usr/local/share/ca-certificates/localias-ca.crt'])
				execFileSync('sudo', ['update-ca-certificates'])
				break
			}
			case 'redhat':
			case 'arch': {
				execFileSync('sudo', ['cp', caPath, '/etc/pki/ca-trust/source/anchors/localias-ca.crt'])
				execFileSync('sudo', ['update-ca-trust'])
				break
			}
			default: {
				// Try certutil for NSS databases (Firefox, Chrome)
				if (existsSync('/usr/bin/certutil')) {
					execFileSync('certutil', [
						'-d',
						`sql:${process.env.HOME}/.pki/nssdb`,
						'-A',
						'-t',
						'C,,',
						'-n',
						'Localias Local CA',
						'-i',
						caPath,
					])
				} else {
					throw new Error(
						`Cannot determine how to trust CA on this Linux distribution. Manually install ${caPath}.`,
					)
				}
			}
		}
	}

	private trustWindows(caPath: string): void {
		execFileSync('certutil', ['-addstore', '-user', 'Root', caPath])
	}
}

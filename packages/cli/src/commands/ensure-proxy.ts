import { isErr } from '@localias/core'
import type { Container } from '@localias/infra'

export async function ensureProxy(container: Container): Promise<void> {
	const state = await container.state.discoverState()
	if (state.running) return

	container.logger.info('Proxy not running — starting automatically...')
	const result = await container.startProxy.execute({ foreground: false })
	if (isErr(result)) {
		container.logger.warn(`Could not auto-start proxy: ${result.error.message}`)
	}
}

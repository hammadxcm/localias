import type { FrameworkDetectionContext, FrameworkPlugin } from './types.js'

const PACKAGE_RUNNERS = new Set(['npx', 'bunx', 'pnpm', 'yarn'])
const DLX_COMMANDS = new Set(['dlx', 'exec', 'x'])

function resolveCommand(args: readonly string[]): { command: string; restArgs: readonly string[] } {
	if (args.length === 0) return { command: '', restArgs: [] }

	const first = args[0]!
	// Handle npx/bunx/pnpm dlx/yarn dlx
	if (PACKAGE_RUNNERS.has(first) && args.length > 1) {
		const second = args[1]!
		if (DLX_COMMANDS.has(second) && args.length > 2) {
			return { command: args[2]!, restArgs: args.slice(3) }
		}
		if (first === 'npx' || first === 'bunx') {
			return { command: second, restArgs: args.slice(2) }
		}
	}

	return { command: first, restArgs: args.slice(1) }
}

export class PluginRegistry {
	private readonly plugins: FrameworkPlugin[] = []

	register(plugin: FrameworkPlugin): void {
		this.plugins.push(plugin)
	}

	detect(commandArgs: readonly string[]): FrameworkPlugin | null {
		const { command, restArgs } = resolveCommand(commandArgs)
		const ctx: FrameworkDetectionContext = {
			command,
			args: restArgs,
			fullCommand: commandArgs.join(' '),
		}

		for (const plugin of this.plugins) {
			if (plugin.detect(ctx)) return plugin
		}

		return null
	}

	injectFlags(commandArgs: string[], port: number): string[] {
		const plugin = this.detect(commandArgs)
		if (!plugin) return commandArgs

		const { command, restArgs } = resolveCommand(commandArgs)
		const injected = plugin.injectFlags([...restArgs], port)

		// Rebuild the full command preserving the runner prefix
		const prefix = commandArgs.slice(0, commandArgs.length - restArgs.length - 1)
		return [...prefix, command, ...injected]
	}

	getAll(): readonly FrameworkPlugin[] {
		return this.plugins
	}
}

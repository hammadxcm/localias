export class ArgParser {
	private readonly args: string[]
	private consumed = new Set<number>()

	constructor(argv: string[]) {
		this.args = argv
	}

	flag(name: string, alias?: string): boolean {
		for (let i = 0; i < this.args.length; i++) {
			if (this.consumed.has(i)) continue
			if (this.args[i] === `--${name}` || (alias && this.args[i] === `-${alias}`)) {
				this.consumed.add(i)
				return true
			}
		}
		return false
	}

	option(name: string, alias?: string): string | undefined {
		for (let i = 0; i < this.args.length - 1; i++) {
			if (this.consumed.has(i)) continue
			if (this.args[i] === `--${name}` || (alias && this.args[i] === `-${alias}`)) {
				this.consumed.add(i)
				this.consumed.add(i + 1)
				return this.args[i + 1]
			}
		}
		return undefined
	}

	optionNumber(name: string, alias?: string): number | undefined {
		const val = this.option(name, alias)
		if (val === undefined) return undefined
		const n = parseInt(val, 10)
		return Number.isNaN(n) ? undefined : n
	}

	positional(): string | undefined {
		for (let i = 0; i < this.args.length; i++) {
			if (this.consumed.has(i)) continue
			if (this.args[i]!.startsWith('-')) continue
			this.consumed.add(i)
			return this.args[i]
		}
		return undefined
	}

	rest(): string[] {
		const dashDash = this.args.indexOf('--')
		if (dashDash !== -1) {
			return this.args.slice(dashDash + 1)
		}
		const remaining: string[] = []
		for (let i = 0; i < this.args.length; i++) {
			if (!this.consumed.has(i)) remaining.push(this.args[i]!)
		}
		return remaining
	}

	unknown(): string[] {
		const result: string[] = []
		for (let i = 0; i < this.args.length; i++) {
			if (this.consumed.has(i)) continue
			if (this.args[i]!.startsWith('--') || (this.args[i]!.startsWith('-') && this.args[i]!.length === 2)) {
				result.push(this.args[i]!)
			}
		}
		return result
	}
}

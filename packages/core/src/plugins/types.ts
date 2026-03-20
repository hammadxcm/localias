export interface FrameworkDetectionContext {
	readonly command: string
	readonly args: readonly string[]
	readonly fullCommand: string
}

export interface FrameworkPlugin {
	readonly name: string
	readonly strictPort: boolean
	detect(ctx: FrameworkDetectionContext): boolean
	injectFlags(args: string[], port: number): string[]
}

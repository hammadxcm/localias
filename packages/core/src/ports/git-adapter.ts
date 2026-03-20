export interface WorktreeResult {
	readonly prefix: string
	readonly source: string
}

export interface IGitAdapter {
	findGitRoot(cwd: string): string | null
	detectWorktreePrefix(cwd: string): WorktreeResult | null
	isWorktree(cwd: string): boolean
}

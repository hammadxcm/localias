import { describe, expect, it } from 'vitest'
import { CliGitAdapter } from './cli-git-adapter.js'

describe('CliGitAdapter', () => {
	const adapter = new CliGitAdapter()

	it('finds git root from subdirectory', () => {
		// This test runs inside the localias repo
		const root = adapter.findGitRoot(process.cwd())
		expect(root).not.toBeNull()
	})

	it('returns null for non-git directory', () => {
		const root = adapter.findGitRoot('/tmp')
		expect(root).toBeNull()
	})

	it('isWorktree returns false for main repo', () => {
		expect(adapter.isWorktree(process.cwd())).toBe(false)
	})

	it('detectWorktreePrefix returns null for main repo', () => {
		expect(adapter.detectWorktreePrefix(process.cwd())).toBeNull()
	})
})

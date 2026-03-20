import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import type { IGitAdapter, WorktreeResult } from '@publify/core'

const SKIP_BRANCHES = new Set(['main', 'master', 'develop', 'dev'])

function execGit(args: string[], cwd: string): string | null {
	try {
		return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
	} catch {
		return null
	}
}

function branchToPrefix(branch: string): string {
	// Take last segment after '/'
	const segments = branch.split('/')
	const last = segments[segments.length - 1]!
	if (SKIP_BRANCHES.has(last)) return ''
	return last
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{2,}/g, '-')
		.replace(/^-|-$/g, '')
}

export class CliGitAdapter implements IGitAdapter {
	findGitRoot(cwd: string): string | null {
		const result = execGit(['rev-parse', '--show-toplevel'], cwd)
		if (result) return result

		// Filesystem fallback: walk up looking for .git
		let dir = resolve(cwd)
		while (true) {
			if (existsSync(join(dir, '.git'))) return dir
			const parent = dirname(dir)
			if (parent === dir) return null
			dir = parent
		}
	}

	detectWorktreePrefix(cwd: string): WorktreeResult | null {
		// Try git command first
		const gitDir = execGit(['rev-parse', '--git-dir'], cwd)
		const gitCommonDir = execGit(['rev-parse', '--git-common-dir'], cwd)

		if (gitDir && gitCommonDir) {
			const resolvedGitDir = resolve(cwd, gitDir)
			const resolvedCommonDir = resolve(cwd, gitCommonDir)

			if (resolvedGitDir !== resolvedCommonDir) {
				// We're in a worktree
				const branch = this.getCurrentBranch(cwd, resolvedGitDir)
				if (branch) {
					const prefix = branchToPrefix(branch)
					if (prefix) {
						return { prefix, source: `branch:${branch}` }
					}
				}
			}
		}

		// Filesystem fallback: check if .git is a file (worktree indicator)
		const gitPath = join(cwd, '.git')
		try {
			const content = readFileSync(gitPath, 'utf-8').trim()
			if (content.startsWith('gitdir:')) {
				const gitdir = content.slice(7).trim()
				const branch = this.getCurrentBranch(cwd, resolve(cwd, gitdir))
				if (branch) {
					const prefix = branchToPrefix(branch)
					if (prefix) {
						return { prefix, source: `branch:${branch}` }
					}
				}
			}
		} catch {
			// Not a worktree
		}

		return null
	}

	isWorktree(cwd: string): boolean {
		return this.detectWorktreePrefix(cwd) !== null
	}

	private getCurrentBranch(cwd: string, gitDir: string): string | null {
		// Try git symbolic-ref
		const branch = execGit(['symbolic-ref', '--short', 'HEAD'], cwd)
		if (branch) return branch

		// Filesystem fallback: read HEAD
		try {
			const head = readFileSync(join(gitDir, 'HEAD'), 'utf-8').trim()
			if (head.startsWith('ref: refs/heads/')) {
				return head.slice(16)
			}
		} catch {
			// ignore
		}

		return null
	}
}

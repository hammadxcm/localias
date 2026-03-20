import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import type { IProjectDetector, InferredProject } from '@localias/core'
import type { Result } from '@localias/core'
import { err, ok } from '@localias/core'
import type { IGitAdapter } from '@localias/core'

export class FilesystemProjectDetector implements IProjectDetector {
	constructor(private readonly git: IGitAdapter) {}

	inferName(cwd: string): Result<InferredProject, Error> {
		// 1. Try package.json name field
		const pkgName = this.findPackageName(cwd)
		if (pkgName) {
			const cleaned = pkgName.replace(/^@[^/]+\//, '')
			return ok({ name: cleaned, source: 'package.json' })
		}

		// 2. Try git root directory name
		const gitRoot = this.git.findGitRoot(cwd)
		if (gitRoot) {
			return ok({ name: basename(gitRoot), source: 'git-root' })
		}

		// 3. Fallback to cwd basename
		const name = basename(resolve(cwd))
		if (!name || name === '/') {
			return err(new Error('Could not infer project name'))
		}

		return ok({ name, source: 'directory' })
	}

	private findPackageName(cwd: string): string | null {
		let dir = resolve(cwd)
		while (true) {
			const pkgPath = join(dir, 'package.json')
			if (existsSync(pkgPath)) {
				try {
					const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
					if (typeof pkg.name === 'string' && pkg.name) {
						return pkg.name
					}
				} catch {
					// malformed package.json
				}
			}
			const parent = dirname(dir)
			if (parent === dir) return null
			dir = parent
		}
	}
}

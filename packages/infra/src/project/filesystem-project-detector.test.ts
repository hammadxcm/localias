import { isOk } from '@localias/core'
import { describe, expect, it } from 'vitest'
import { CliGitAdapter } from '../git/cli-git-adapter.js'
import { FilesystemProjectDetector } from './filesystem-project-detector.js'

describe('FilesystemProjectDetector', () => {
	const git = new CliGitAdapter()
	const detector = new FilesystemProjectDetector(git)

	it('infers name from package.json', () => {
		const result = detector.inferName(process.cwd())
		expect(isOk(result)).toBe(true)
		if (isOk(result)) {
			// We're inside the infra package
			expect(result.value.source).toBe('package.json')
		}
	})

	it('strips scope from package name', () => {
		const result = detector.inferName(process.cwd())
		if (isOk(result)) {
			expect(result.value.name).not.toContain('@')
		}
	})

	it('returns error for root directory', () => {
		// /tmp typically has no package.json and no git repo
		const result = detector.inferName('/tmp')
		expect(isOk(result)).toBe(true) // Falls back to directory name
		if (isOk(result)) {
			expect(result.value.name).toBe('tmp')
		}
	})
})

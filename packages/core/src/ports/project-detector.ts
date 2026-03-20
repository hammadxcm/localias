import type { Result } from '../result.js'

export interface InferredProject {
	readonly name: string
	readonly source: string
}

export interface IProjectDetector {
	inferName(cwd: string): Result<InferredProject, Error>
}

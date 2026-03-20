export class ProcessId {
	private constructor(readonly value: number) {}

	static alias(): ProcessId {
		return new ProcessId(0)
	}

	static create(pid: number): ProcessId {
		return new ProcessId(pid)
	}
}

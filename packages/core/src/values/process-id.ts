export class ProcessId {
	private constructor(readonly value: number) {}

	static alias(): ProcessId {
		return new ProcessId(0)
	}

	static create(pid: number): ProcessId {
		if (!Number.isInteger(pid) || pid < 0) {
			throw new RangeError(`Invalid PID: ${pid}`)
		}
		return new ProcessId(pid)
	}
}

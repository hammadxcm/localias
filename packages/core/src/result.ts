export type Ok<T> = { readonly _tag: 'Ok'; readonly value: T }
export type Err<E> = { readonly _tag: 'Err'; readonly error: E }
export type Result<T, E> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
	return Object.freeze({ _tag: 'Ok', value }) as Ok<T>
}

export function err<E>(error: E): Err<E> {
	return Object.freeze({ _tag: 'Err', error }) as Err<E>
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
	return result._tag === 'Ok'
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
	return result._tag === 'Err'
}

export function unwrap<T, E>(result: Result<T, E>): T {
	if (isOk(result)) return result.value
	throw result.error instanceof Error ? result.error : new Error(String(result.error))
}

export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
	if (isOk(result)) return ok(fn(result.value))
	return result
}

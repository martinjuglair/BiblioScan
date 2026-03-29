/** Result pattern — no throw/catch in domain logic */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  fail<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },
};

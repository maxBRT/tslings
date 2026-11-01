// Run async jobs with a limited number in flight at once.

import { availableParallelism } from "node:os";

const DEFAULT_PARALLELISM = 8;

/** How many exercises to check at the same time. */
export function checkParallelism(): number {
  try {
    return Math.max(1, availableParallelism());
  } catch {
    return DEFAULT_PARALLELISM;
  }
}

/**
 * Call `job` for every index in `0..count`, with at most `limit` calls running
 * at once. Like rustlings' worker threads that pick the next exercise index.
 * Returns the settled results in index order.
 */
export async function runPool<T>(
  count: number,
  limit: number,
  job: (index: number) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(count);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < count) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await job(index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, count) }, worker));
  return results;
}

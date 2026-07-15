/**
 * Circuit breaker shared by all providers (§8.1). Opens after `threshold`
 * consecutive failures; while open, calls fail fast until `cooldownMs` elapses,
 * then a single trial (half-open) decides whether to close or re-open.
 */
export type BreakerState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private failures = 0;
  private state: BreakerState = "closed";
  private openedAt = 0;

  constructor(
    private readonly threshold = 5,
    private readonly cooldownMs = 30_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get currentState(): BreakerState {
    if (this.state === "open" && this.now() - this.openedAt >= this.cooldownMs) {
      this.state = "half-open";
    }
    return this.state;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.currentState === "open") {
      throw new Error("circuit-open: provider temporarily unavailable");
    }
    try {
      const result = await fn();
      this.failures = 0;
      this.state = "closed";
      return result;
    } catch (err) {
      this.failures += 1;
      if (this.failures >= this.threshold || this.state === "half-open") {
        this.state = "open";
        this.openedAt = this.now();
      }
      throw err;
    }
  }
}

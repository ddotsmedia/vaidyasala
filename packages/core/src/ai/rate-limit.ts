/**
 * Simple token-bucket rate limiter shared by all providers (§8.1). Refills at
 * `ratePerSec` up to `capacity`; `acquire()` waits until a token is available.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly ratePerSec: number,
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {
    this.tokens = capacity;
    this.lastRefill = now();
  }

  private refill(): void {
    const t = this.now();
    const elapsed = (t - this.lastRefill) / 1000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.ratePerSec);
      this.lastRefill = t;
    }
  }

  /** How many whole tokens are available right now (for tests/introspection). */
  available(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  async acquire(cost = 1): Promise<void> {
    for (;;) {
      this.refill();
      if (this.tokens >= cost) {
        this.tokens -= cost;
        return;
      }
      const deficit = cost - this.tokens;
      await this.sleep(Math.ceil((deficit / this.ratePerSec) * 1000));
    }
  }
}

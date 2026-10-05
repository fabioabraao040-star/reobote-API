interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

/**
 * Armazenamento temporário em memória para idempotência de cobranças e webhooks.
 * Facilmente substituível por Redis ou banco de dados se o volume escalar.
 */
class IdempotencyStore {
  private store = new Map<string, CacheItem<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTtlMs: number = 24 * 60 * 60 * 1000) {
    // Limpeza periódica a cada 30 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTtlMs;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

export const idempotencyStore = new IdempotencyStore();

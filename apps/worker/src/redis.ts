/** URL de Redis del worker (§3, Redis propio del LXP). */
export function redisUrl(): string {
  return (
    process.env.REDIS_URL ??
    `redis://${process.env.REDIS_HOST ?? 'localhost'}:${process.env.REDIS_PORT ?? '6379'}`
  );
}

let counter = 0;

/** 本地唯一 ID（不依赖 crypto.randomUUID，局域网 http 下也能用） */
export function uid(): string {
  counter = (counter + 1) % 1679616;
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + counter.toString(36);
}

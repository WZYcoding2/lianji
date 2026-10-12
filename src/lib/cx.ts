export function cx(...args: (string | false | null | undefined | 0)[]): string {
  return args.filter(Boolean).join(' ');
}

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function alpha(hex: string, a: number): string {
  return `rgba(${hexToRgb(hex)}, ${a})`;
}

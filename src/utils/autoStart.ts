export function resolveAutoStart(general?: { autoStart?: boolean }): boolean {
  return general?.autoStart ?? true
}

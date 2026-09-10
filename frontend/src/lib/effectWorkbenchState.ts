// keep in sync with scripts/effect-workbench-state.cjs

export function isLive(
  activeEffect: string | null,
  selectedId: string | null,
): boolean {
  return Boolean(activeEffect && selectedId && activeEffect === selectedId);
}

export function liveChipLabel(
  activeEffect: string | null,
  _selectedId: string | null,
  resolveName: (id: string) => string,
): string | null {
  if (!activeEffect) return null;
  return resolveName(activeEffect);
}

export function previewEffectId(selectedId: string | null): string | null {
  return selectedId || null;
}

export function customNeedsBuilder(selectedId: string | null): boolean {
  return selectedId === 'custom';
}

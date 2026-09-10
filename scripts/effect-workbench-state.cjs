'use strict';

function isLive(activeEffect, selectedId) {
  return Boolean(activeEffect && selectedId && activeEffect === selectedId);
}

function liveChipLabel(activeEffect, selectedId, resolveName) {
  if (!activeEffect) return null;
  return resolveName(activeEffect);
}

function previewEffectId(selectedId) {
  return selectedId || null;
}

function customNeedsBuilder(selectedId) {
  return selectedId === 'custom';
}

module.exports = { isLive, liveChipLabel, previewEffectId, customNeedsBuilder };

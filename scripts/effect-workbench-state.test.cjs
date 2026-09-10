'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isLive,
  liveChipLabel,
  previewEffectId,
  customNeedsBuilder,
} = require('./effect-workbench-state.cjs');

const name = (id) => ({ breathing: 'Respirar', strobing: 'Estrobo', custom: 'Sequência' }[id] || id);

test('isLive true only when active equals selected', () => {
  assert.equal(isLive('strobing', 'strobing'), true);
  assert.equal(isLive('strobing', 'breathing'), false);
  assert.equal(isLive(null, 'breathing'), false);
});

test('liveChipLabel null when nothing active; else active name', () => {
  assert.equal(liveChipLabel(null, 'breathing', name), null);
  assert.equal(liveChipLabel('strobing', 'breathing', name), 'Estrobo');
  assert.equal(liveChipLabel('strobing', 'strobing', name), 'Estrobo');
});

test('previewEffectId is selected only', () => {
  assert.equal(previewEffectId('rainbow'), 'rainbow');
  assert.equal(previewEffectId(null), null);
});

test('customNeedsBuilder', () => {
  assert.equal(customNeedsBuilder('custom'), true);
  assert.equal(customNeedsBuilder('strobing'), false);
  assert.equal(customNeedsBuilder(null), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { getContextMenuPosition } from '../src/utils/contextMenuPosition.js';

test('context menu opens beside the cursor when there is room on the right', () => {
  assert.deepEqual(getContextMenuPosition({
    anchorX: 320,
    anchorY: 180,
    menuWidth: 220,
    menuHeight: 300,
    viewportWidth: 1280,
    viewportHeight: 720
  }), { x: 324, y: 180, maxHeight: 300 });
});

test('context menu flips left near the right edge and fits vertically', () => {
  assert.deepEqual(getContextMenuPosition({
    anchorX: 1200,
    anchorY: 650,
    menuWidth: 220,
    menuHeight: 300,
    viewportWidth: 1280,
    viewportHeight: 720
  }), { x: 976, y: 412, maxHeight: 300 });
});

test('header menu aligns its right edge with the button', () => {
  assert.deepEqual(getContextMenuPosition({
    anchorX: 800,
    anchorY: 60,
    menuWidth: 220,
    menuHeight: 300,
    viewportWidth: 1280,
    viewportHeight: 720,
    horizontalOrigin: 'right-edge'
  }), { x: 580, y: 60, maxHeight: 300 });
});

test('context menu caps height instead of overflowing the viewport', () => {
  assert.deepEqual(getContextMenuPosition({
    anchorX: 320,
    anchorY: 180,
    menuWidth: 220,
    menuHeight: 900,
    viewportWidth: 1280,
    viewportHeight: 720
  }), { x: 324, y: 8, maxHeight: 704 });
});

test('context menu shifts upward just enough when full height can still fit', () => {
  assert.deepEqual(getContextMenuPosition({
    anchorX: 320,
    anchorY: 560,
    menuWidth: 220,
    menuHeight: 140,
    viewportWidth: 1280,
    viewportHeight: 720
  }), { x: 324, y: 560, maxHeight: 140 });

  assert.deepEqual(getContextMenuPosition({
    anchorX: 320,
    anchorY: 640,
    menuWidth: 220,
    menuHeight: 140,
    viewportWidth: 1280,
    viewportHeight: 720
  }), { x: 324, y: 572, maxHeight: 140 });
});

export const getContextMenuPosition = ({
  anchorX,
  anchorY,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  horizontalOrigin = 'cursor',
  gap = 4,
  margin = 8
}) => {
  let x = horizontalOrigin === 'right-edge'
    ? anchorX - menuWidth
    : anchorX + gap;

  if (horizontalOrigin === 'cursor' && x + menuWidth > viewportWidth - margin) {
    x = anchorX - menuWidth - gap;
  }

  const maxX = Math.max(margin, viewportWidth - menuWidth - margin);
  x = Math.min(Math.max(margin, x), maxX);

  const maxViewportHeight = Math.max(120, viewportHeight - (margin * 2));
  const maxHeight = Math.max(120, Math.min(menuHeight, maxViewportHeight));

  let y = Math.max(margin, anchorY);

  if (menuHeight > maxViewportHeight) {
    // When the menu is taller than the window, show the largest useful slice
    // instead of anchoring low and hiding the end of the menu.
    y = margin;
  } else if (y + menuHeight > viewportHeight - margin) {
    // If the full menu can fit in the viewport, shift it upward just enough.
    y = viewportHeight - menuHeight - margin;
  }

  y = Math.min(Math.max(margin, y), Math.max(margin, viewportHeight - maxHeight - margin));

  return { x, y, maxHeight };
};

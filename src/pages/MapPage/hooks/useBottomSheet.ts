import { useCallback, useEffect, useRef, useState } from 'react';
import { PREFERS_REDUCED_MOTION } from './useMapInit';

export type SheetSnap = 'peek' | 'full';

/** Past this downward speed a flick wins regardless of distance travelled. */
const FLICK_VELOCITY = 0.5; // px per ms
/** Ignore sub-pixel jitter so a tap on the handle never starts a drag. */
const DRAG_THRESHOLD = 4;

interface Options {
  /** Whether the sheet is currently shown. */
  open: boolean;
  /** Called when the sheet is dragged (or flicked) past the dismiss point. */
  onClose: () => void;
  /**
   * Fraction of the sheet's own height visible at the "peek" snap. The rest is
   * translated off-screen, leaving the map usable behind it.
   */
  peekRatio?: number;
  /** Sheets only behave this way on touch-sized viewports. */
  enabled: boolean;
}

interface SheetHandles {
  ref: React.RefObject<HTMLElement | null>;
  /**
   * Spread onto the sheet element. Publishes the drag offset as the
   * `--sheet-y` custom property plus a `data-dragging` flag; only the mobile
   * CSS reads them, so a stale value can never displace the desktop drawer.
   */
  sheetProps: {
    style: React.CSSProperties | undefined;
    'data-dragging': 'true' | undefined;
  };
  /** Spread onto the drag affordance (grab handle, header). */
  dragHandleProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  snap: SheetSnap;
  /** Lets a caller expand the sheet programmatically, e.g. on a tab change. */
  expand: () => void;
}

/**
 * Drag behaviour for the mobile bottom sheets.
 *
 * The sheet is laid out at its full height in CSS and positioned purely with
 * translateY, so dragging is a single GPU-friendly transform and each snap is
 * just a target offset: 0 for full, a fraction of the height for peek, and the
 * whole height for dismissed. Releasing picks the nearest snap, unless the
 * gesture was a fast downward flick, which always steps one snap down.
 */
export function useBottomSheet({
  open, onClose, peekRatio = 0.62, enabled,
}: Options): SheetHandles {
  const ref = useRef<HTMLElement | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('peek');
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const startYRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastYRef = useRef(0);

  // Every reopen starts at peek so the map stays visible behind the sheet.
  useEffect(() => {
    if (open) setSnap('peek');
  }, [open]);

  const heightOf = () => ref.current?.getBoundingClientRect().height ?? 0;
  const offsetFor = useCallback(
    (target: SheetSnap) => (target === 'full' ? 0 : heightOf() * (1 - peekRatio)),
    [peekRatio],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startYRef.current = e.touches[0].clientY;
    lastYRef.current = e.touches[0].clientY;
    startOffsetRef.current = offsetFor(snap);
    startTimeRef.current = performance.now();
  }, [enabled, offsetFor, snap]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const y = e.touches[0].clientY;
    lastYRef.current = y;
    const delta = y - startYRef.current;
    if (Math.abs(delta) < DRAG_THRESHOLD && dragOffset === null) return;
    // Never travel above the full snap; allow a little past the bottom so the
    // dismiss gesture doesn't feel like it hits a wall.
    setDragOffset(Math.max(0, startOffsetRef.current + delta));
  }, [dragOffset]);

  const handleTouchEnd = useCallback(() => {
    if (startYRef.current === null) return;

    const delta = lastYRef.current - startYRef.current;
    const elapsed = Math.max(1, performance.now() - startTimeRef.current);
    const velocity = delta / elapsed;
    const height = heightOf();
    const peekOffset = offsetFor('peek');
    const settled = startOffsetRef.current + delta;

    startYRef.current = null;
    setDragOffset(null);

    // A fast downward flick always steps one snap down, however far it moved.
    if (velocity > FLICK_VELOCITY) {
      if (snap === 'full') setSnap('peek');
      else onClose();
      return;
    }
    // A fast upward flick expands.
    if (velocity < -FLICK_VELOCITY) {
      setSnap('full');
      return;
    }

    // Otherwise settle on whichever snap the sheet was left closest to.
    const candidates: { snap: SheetSnap | 'closed'; offset: number }[] = [
      { snap: 'full', offset: 0 },
      { snap: 'peek', offset: peekOffset },
      { snap: 'closed', offset: height },
    ];
    const nearest = candidates.reduce((best, c) =>
      Math.abs(settled - c.offset) < Math.abs(settled - best.offset) ? c : best,
    );

    if (nearest.snap === 'closed') onClose();
    else setSnap(nearest.snap);
  }, [offsetFor, onClose, snap]);

  const expand = useCallback(() => setSnap('full'), []);

  const style = enabled && open
    ? ({ '--sheet-y': `${dragOffset ?? offsetFor(snap)}px` } as React.CSSProperties)
    : undefined;

  return {
    ref,
    sheetProps: {
      style,
      'data-dragging': dragOffset !== null || PREFERS_REDUCED_MOTION ? 'true' : undefined,
    },
    dragHandleProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    snap,
    expand,
  };
}

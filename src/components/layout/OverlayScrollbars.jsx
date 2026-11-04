import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const THICKNESS = 8;
const INSET = 2;
const MIN_THUMB = 28;
const HIDE_DELAY = 900;

function scrollElement(target) {
  return target === document || target === window ? document.scrollingElement : target;
}

function geometry(element) {
  if (!element?.isConnected) return null;
  const isPage = element === document.scrollingElement;
  const rect = isPage
    ? { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight }
    : element.getBoundingClientRect();
  const top = Math.max(0, rect.top);
  const bottom = Math.min(window.innerHeight, rect.bottom);
  const left = Math.max(0, rect.left);
  const right = Math.min(window.innerWidth, rect.right);
  const height = bottom - top;
  const width = right - left;
  if (height <= MIN_THUMB || width <= MIN_THUMB) return null;

  const verticalRange = element.scrollHeight - element.clientHeight;
  const horizontalRange = element.scrollWidth - element.clientWidth;
  const verticalLength = Math.max(MIN_THUMB, height * element.clientHeight / element.scrollHeight);
  const horizontalLength = Math.max(MIN_THUMB, width * element.clientWidth / element.scrollWidth);
  return {
    vertical: verticalRange > 2 ? {
      left: right - THICKNESS - INSET,
      top: top + (height - verticalLength) * element.scrollTop / verticalRange,
      width: THICKNESS,
      height: verticalLength,
      travel: height - verticalLength,
      range: verticalRange,
    } : null,
    horizontal: horizontalRange > 2 ? {
      left: left + (width - horizontalLength) * element.scrollLeft / horizontalRange,
      top: bottom - THICKNESS - INSET,
      width: horizontalLength,
      height: THICKNESS,
      travel: width - horizontalLength,
      range: horizontalRange,
    } : null,
  };
}

export default function OverlayScrollbars() {
  const activeElement = useRef(null);
  const hideTimer = useRef(null);
  const drag = useRef(null);
  const [bars, setBars] = useState(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    let frame = 0;
    let pendingElement = null;
    const update = (element) => {
      activeElement.current = element;
      setBars(geometry(element));
      setHidden(false);
      window.clearTimeout(hideTimer.current);
      if (!drag.current) hideTimer.current = window.setTimeout(() => setHidden(true), HIDE_DELAY);
    };
    const onScroll = (event) => {
      pendingElement = scrollElement(event.target);
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update(pendingElement);
      });
    };
    const onResize = () => {
      if (activeElement.current) update(activeElement.current);
    };
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer.current);
    };
  }, []);

  const startDrag = (event, axis) => {
    const element = activeElement.current;
    const bar = bars?.[axis];
    if (!element || !bar || bar.travel <= 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      element, axis, coordinate: axis === 'vertical' ? event.clientY : event.clientX,
      scroll: axis === 'vertical' ? element.scrollTop : element.scrollLeft,
      scale: bar.range / bar.travel,
    };
    window.clearTimeout(hideTimer.current);
    setHidden(false);
  };

  const moveDrag = (event) => {
    const current = drag.current;
    if (!current) return;
    const coordinate = current.axis === 'vertical' ? event.clientY : event.clientX;
    const next = current.scroll + (coordinate - current.coordinate) * current.scale;
    if (current.axis === 'vertical') current.element.scrollTop = next;
    else current.element.scrollLeft = next;
  };

  const stopDrag = () => {
    drag.current = null;
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setHidden(true), HIDE_DELAY);
  };

  return createPortal(<>
    {bars?.vertical && <div
      className="app-overlay-scrollbar"
      data-hidden={hidden}
      style={{ left: bars.vertical.left, top: bars.vertical.top, width: bars.vertical.width, height: bars.vertical.height }}
      onPointerDown={(event) => startDrag(event, 'vertical')}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      aria-hidden="true"
    />}
    {bars?.horizontal && <div
      className="app-overlay-scrollbar"
      data-hidden={hidden}
      style={{ left: bars.horizontal.left, top: bars.horizontal.top, width: bars.horizontal.width, height: bars.horizontal.height }}
      onPointerDown={(event) => startDrag(event, 'horizontal')}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      aria-hidden="true"
    />}
  </>, document.body);
}

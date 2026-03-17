import { useRef, useState, useCallback, useEffect } from 'react';
import BookmarkCard from './BookmarkCard';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 1.8;
const ZOOM_SPEED = 0.001;

export default function Canvas({ bookmarks, onUpdatePosition, onDelete }) {
  const containerRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.6);
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const lastTap = useRef(0);

  // Center on mount
  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setPan({ x: width / 2, y: height / 2 });
    }
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY * ZOOM_SPEED;
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - delta * z)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e) => {
    if (e.target !== containerRef.current && !e.target.classList.contains('canvas-world')) return;
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.preventDefault();
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch support
  const touchStart = useRef(null);
  const lastPinchDist = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY, panX: pan.x, panY: pan.y };
      lastPinchDist.current = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, [pan]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1 && touchStart.current) {
      const t = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      setPan({ x: touchStart.current.panX + dx, y: touchStart.current.panY + dy });
    } else if (e.touches.length === 2 && lastPinchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / lastPinchDist.current;
      lastPinchDist.current = dist;
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * scale)));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchStart.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    setZoom(0.6);
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setPan({ x: width / 2, y: height / 2 });
    }
  }, []);

  const handleCardDragChange = useCallback((dragging) => {
    setIsDraggingCard(dragging);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${isPanning ? 'panning' : ''} ${isDraggingCard ? 'card-dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="canvas-world"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {bookmarks.map(bookmark => (
          <BookmarkCard
            key={bookmark.id}
            bookmark={bookmark}
            zoom={zoom}
            onDragChange={handleCardDragChange}
            onPositionUpdate={onUpdatePosition}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="canvas-hint">
        <span>Drag to explore · Scroll to zoom · Double-click to reset</span>
      </div>
    </div>
  );
}

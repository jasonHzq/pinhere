import { useEffect, useRef, useState } from "react";
import type { Rect } from "@/types";

export function Cropper({ src, crop, onChange }: { src: string; crop: Rect; onChange: (value: Rect) => void }) {
  const container = useRef<HTMLDivElement>(null); const image = useRef<HTMLImageElement>(null); const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null); const [display, setDisplay] = useState<Rect>(crop);
  const toNatural = (event: React.PointerEvent) => { const rect = container.current!.getBoundingClientRect(); return { x: (event.clientX - rect.left) * (image.current!.naturalWidth / rect.width), y: (event.clientY - rect.top) * (image.current!.naturalHeight / rect.height) }; };
  useEffect(() => setDisplay(crop), [crop]);
  function start(event: React.PointerEvent) { const point = toNatural(event); setDrawing(point); setDisplay({ x: point.x, y: point.y, width: 1, height: 1 }); event.currentTarget.setPointerCapture(event.pointerId); }
  function move(event: React.PointerEvent) { if (!drawing) return; const point = toNatural(event); setDisplay({ x: Math.min(drawing.x, point.x), y: Math.min(drawing.y, point.y), width: Math.abs(point.x - drawing.x), height: Math.abs(point.y - drawing.y) }); }
  function end() { if (display.width > 20 && display.height > 20) onChange(display); setDrawing(null); }
  const naturalWidth = image.current?.naturalWidth ?? 1; const naturalHeight = image.current?.naturalHeight ?? 1;
  return <div ref={container} className="relative cursor-crosshair overflow-hidden rounded-[10px] border border-[#c9c8c1] bg-[#171916]" onPointerDown={start} onPointerMove={move} onPointerUp={end}><img ref={image} src={src} onLoad={() => setDisplay({ ...crop })} className="block w-full select-none" draggable={false} alt="Screenshot crop" /><div className="pointer-events-none absolute border-2 border-[#5f88ff] bg-[#164dd818] shadow-[0_0_0_999px_rgba(5,8,12,.5)]" style={{ left: `${display.x / naturalWidth * 100}%`, top: `${display.y / naturalHeight * 100}%`, width: `${display.width / naturalWidth * 100}%`, height: `${display.height / naturalHeight * 100}%` }} /></div>;
}

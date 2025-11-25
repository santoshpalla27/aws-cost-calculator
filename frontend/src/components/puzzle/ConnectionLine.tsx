'use client';

interface ConnectionLineProps {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  type: string;
}

export function ConnectionLine({ fromPos, toPos, type }: ConnectionLineProps) {
  const style = {
    network: 'stroke-gray-500',
    data: 'stroke-blue-500 stroke-dasharray-4',
    security: 'stroke-red-500 stroke-dasharray-2',
  };

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <line
        x1={fromPos.x}
        y1={fromPos.y}
        x2={toPos.x}
        y2={toPos.y}
        className={`stroke-2 ${style[type] || style.network}`}
      />
    </svg>
  );
}
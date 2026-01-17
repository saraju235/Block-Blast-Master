import React from 'react';
import { DraggableBlock } from '../types';

interface BlockPieceProps {
  block: DraggableBlock;
  cellSize: number;
  className?: string;
  isGhost?: boolean;
}

export const BlockPiece: React.FC<BlockPieceProps> = ({ block, cellSize, className = '', isGhost = false }) => {
  const shape = block.shape;
  const rows = shape.length;
  const cols = shape[0].length;
  
  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{ width: cols * cellSize, height: rows * cellSize }}
    >
      {shape.map((row, r) => 
        row.map((cell, c) => {
          if (!cell) return null;
          return (
            <div
              key={`${r}-${c}`}
              className="absolute rounded-md box-border"
              style={{
                top: r * cellSize,
                left: c * cellSize,
                width: cellSize - 2, // gap
                height: cellSize - 2, // gap
                margin: 1,
                backgroundColor: isGhost ? 'rgba(255,255,255,0.3)' : block.color,
                boxShadow: isGhost ? 'none' : `inset 0 0 10px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)`,
                border: isGhost ? '1px dashed white' : 'none',
              }}
            />
          );
        })
      )}
    </div>
  );
};
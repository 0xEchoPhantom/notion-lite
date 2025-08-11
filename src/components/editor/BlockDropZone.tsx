import React from 'react';

interface BlockDropZoneProps {
  blockId: string;
  children: React.ReactNode;
}

export const BlockDropZone: React.FC<BlockDropZoneProps> = ({ blockId, children }) => {
  return (
    <div className="relative">
      {children}
    </div>
  );
};
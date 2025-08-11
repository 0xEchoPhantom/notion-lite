import React, { useState } from 'react';

export const DragTest = () => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);

  const handleDragStart = (e: React.DragEvent, item: string) => {
    console.log('Test drag started:', item);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetItem: string) => {
    e.preventDefault();
    console.log('Test drop:', draggedItem, 'onto', targetItem);
    
    if (draggedItem && draggedItem !== targetItem) {
      const draggedIndex = items.indexOf(draggedItem);
      const targetIndex = items.indexOf(targetItem);
      
      const newItems = [...items];
      newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, draggedItem);
      
      setItems(newItems);
    }
    setDraggedItem(null);
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Drag Test</h2>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, item)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, item)}
            className={`p-4 bg-gray-100 cursor-move rounded ${
              draggedItem === item ? 'opacity-50' : ''
            }`}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};
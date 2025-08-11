'use client';

import React, { useState } from 'react';

export const DragDebug: React.FC = () => {
  const [events, setEvents] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addEvent = (event: string) => {
    setEvents(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${event}`]);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <h3 className="font-bold text-sm mb-2">Drag Debug</h3>
      
      <div className="mb-4">
        <div
          className={`border-2 border-dashed p-4 text-center cursor-grab ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          draggable="true"
          onDragStart={(e) => {
            addEvent('Drag started');
            setIsDragging(true);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', 'test-drag');
          }}
          onDragEnd={() => {
            addEvent('Drag ended');
            setIsDragging(false);
          }}
        >
          Drag Me (Test)
        </div>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 p-4 text-center mb-4"
        onDragOver={(e) => {
          e.preventDefault();
          addEvent('Drag over drop zone');
        }}
        onDrop={(e) => {
          e.preventDefault();
          addEvent('Dropped!');
        }}
      >
        Drop Zone
      </div>

      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-gray-400">No events yet...</div>
        ) : (
          events.map((event, i) => (
            <div key={i} className="text-gray-600">{event}</div>
          ))
        )}
      </div>
      
      <button
        onClick={() => setEvents([])}
        className="mt-2 text-xs text-blue-500 hover:text-blue-700"
      >
        Clear
      </button>
    </div>
  );
};
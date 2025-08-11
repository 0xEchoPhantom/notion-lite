import React from 'react';
import { AIChat } from '@/components/ai/AIChat';
import type { Task } from '@/types/task';

// Simple AI test page that renders the AI chat with no initial tasks
// Add tasks or wire this page to your data as needed
export default function AITestPage() {
	const tasks: Task[] = [];
	return (
		<div className="p-6 max-w-5xl mx-auto">
			<h1 className="text-2xl font-semibold mb-4">AI Chat Playground</h1>
			<AIChat tasks={tasks} currentView="roi" selectedTasks={[]} />
		</div>
	);
}


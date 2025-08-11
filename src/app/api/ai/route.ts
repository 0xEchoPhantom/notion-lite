import { NextRequest, NextResponse } from 'next/server';
import { geminiAssistant } from '@/lib/ai/gemini';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const message: string = body.message || 'Analyze my tasks';
		const tasks = Array.isArray(body.tasks) ? body.tasks : [];
		const context = { tasks } as const;
		const res = await geminiAssistant.chatWithTasks(message, context);
		return NextResponse.json(res);
	} catch {
		return NextResponse.json({ error: 'AI route error' }, { status: 500 });
	}
}

export async function GET() {
	return NextResponse.json({ status: 'ok' });
}

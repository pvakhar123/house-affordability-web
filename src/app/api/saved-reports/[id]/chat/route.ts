import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withTracking } from "@/lib/db/track";
import { getChatHistory, saveChatHistory } from "@/lib/db/queries";

export const GET = withTracking("/api/saved-reports/[id]/chat", async (_request, ...args) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { params } = args[0] as { params: Promise<{ id: string }> };
  const { id } = await params;

  const history = await getChatHistory(id, session.user.id);
  return NextResponse.json(history ?? { messages: [], conversationSummary: null, sessionMemory: null });
});

export const PUT = withTracking("/api/saved-reports/[id]/chat", async (request, ...args) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { params } = args[0] as { params: Promise<{ id: string }> };
  const { id } = await params;
  const body = await request.json();

  await saveChatHistory(id, session.user.id, body);
  return NextResponse.json({ ok: true });
});

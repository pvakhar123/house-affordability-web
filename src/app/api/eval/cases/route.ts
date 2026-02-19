import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { paths } from "@/lib/eval/paths";

export async function GET() {
  try {
    const raw = await readFile(paths.goldenDataset, "utf-8");
    const dataset = JSON.parse(raw);
    const cases = (dataset.testCases ?? []).map(
      (tc: { id: string; category: string; question: string }) => ({
        id: tc.id,
        category: tc.category,
        question: tc.question,
      }),
    );
    return NextResponse.json({ cases });
  } catch (err) {
    console.error("Failed to load golden dataset:", err);
    return NextResponse.json({ error: "Failed to load test cases" }, { status: 500 });
  }
}

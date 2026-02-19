import { join } from "path";

/**
 * Writable data directory.
 * Vercel serverless functions have a read-only filesystem — only /tmp is writable.
 * Locally, we use the project's data/ directory.
 */
const WRITABLE_DIR = process.env.VERCEL ? "/tmp/data" : join(process.cwd(), "data");

/** Read-only data directory (for bundled files like golden-dataset.json). */
const STATIC_DIR = join(process.cwd(), "data");

export const paths = {
  feedback: join(WRITABLE_DIR, "feedback.jsonl"),
  evalResults: join(WRITABLE_DIR, "eval-results.jsonl"),
  judgeScores: join(WRITABLE_DIR, "judge-scores.jsonl"),
  goldenDataset: join(STATIC_DIR, "golden-dataset.json"),
  writableDir: WRITABLE_DIR,
};

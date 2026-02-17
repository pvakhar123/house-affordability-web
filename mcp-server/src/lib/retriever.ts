import { KNOWLEDGE_BASE, type Document } from "./knowledge-base.js";

type Vector = number[];

interface ScoredDocument {
  document: Document;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can",
  "had", "her", "was", "one", "our", "out", "has", "have", "from",
  "they", "been", "this", "that", "with", "will", "each", "make",
  "like", "than", "them", "some", "what", "when", "who", "how",
  "its", "also", "into", "just", "your", "more", "other", "which",
  "their", "about", "would", "these", "most", "could", "does",
]);

let vocabulary: Map<string, number> = new Map();
let idfValues: Map<string, number> = new Map();
let docVectors: { doc: Document; vector: Vector }[] = [];
let isIndexed = false;

export function buildIndex(): void {
  if (isIndexed) return;

  const allTokenized = KNOWLEDGE_BASE.map((doc) =>
    tokenize(doc.title + " " + doc.content)
  );

  const wordSet = new Set<string>();
  for (const tokens of allTokenized) {
    for (const token of tokens) {
      wordSet.add(token);
    }
  }
  vocabulary = new Map([...wordSet].sort().map((word, i) => [word, i]));

  const N = allTokenized.length;
  for (const word of vocabulary.keys()) {
    const docsWithWord = allTokenized.filter((tokens) =>
      tokens.includes(word)
    ).length;
    idfValues.set(word, Math.log((N + 1) / (docsWithWord + 1)) + 1);
  }

  docVectors = KNOWLEDGE_BASE.map((doc, i) => ({
    doc,
    vector: computeTfIdfVector(allTokenized[i]),
  }));

  isIndexed = true;
}

function computeTfIdfVector(tokens: string[]): Vector {
  const vec = new Array(vocabulary.size).fill(0);
  const termCounts = new Map<string, number>();

  for (const token of tokens) {
    termCounts.set(token, (termCounts.get(token) || 0) + 1);
  }

  for (const [word, count] of termCounts) {
    const idx = vocabulary.get(word);
    if (idx !== undefined) {
      const tf = count / tokens.length;
      const idf = idfValues.get(word) || 1;
      vec[idx] = tf * idf;
    }
  }

  return vec;
}

function cosineSimilarity(a: Vector, b: Vector): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export function retrieve(query: string, topK: number = 3): ScoredDocument[] {
  buildIndex();

  const queryTokens = tokenize(query);
  const queryVector = computeTfIdfVector(queryTokens);

  const scored: ScoredDocument[] = docVectors.map(({ doc, vector }) => ({
    document: doc,
    score: cosineSimilarity(queryVector, vector),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0.05)
    .slice(0, topK);
}

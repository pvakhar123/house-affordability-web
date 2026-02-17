/**
 * STEP 3: THE RETRIEVER
 *
 * This is the "R" in RAG — the part that finds relevant documents
 * for a given user query.
 *
 * HOW REAL VECTOR SEARCH WORKS:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ 1. EMBED: Convert text → numbers (a "vector")               │
 * │    "FHA loan" → [0.12, -0.45, 0.78, 0.33, ...]  (1536 dims)│
 * │                                                              │
 * │ 2. STORE: Save vectors in a vector database                  │
 * │    (Pinecone, Chroma, pgvector, Qdrant, etc.)               │
 * │                                                              │
 * │ 3. SEARCH: Embed the user's query, find nearest vectors     │
 * │    "What's an FHA loan?" → [0.11, -0.44, 0.79, ...]        │
 * │    Cosine similarity → finds "FHA Loan Basics" doc          │
 * └──────────────────────────────────────────────────────────────┘
 *
 * WHAT WE USE HERE (for learning):
 * TF-IDF = a simpler way to convert text → numbers.
 *   - TF  (Term Frequency)  = how often a word appears in THIS doc
 *   - IDF (Inverse Doc Freq) = how RARE a word is across ALL docs
 *   - TF-IDF = TF × IDF  (common-in-doc + rare-overall = important)
 *
 * This teaches the same concept as neural embeddings:
 *   text → numbers → similarity search
 *
 * TO UPGRADE TO REAL EMBEDDINGS:
 *   Replace computeTfIdf() with an API call to:
 *   - Voyage AI (voyage-3) — Anthropic's recommended embeddings
 *   - OpenAI (text-embedding-3-small)
 *   - Cohere (embed-english-v3)
 *   And store results in Pinecone/Supabase pgvector instead of memory.
 */

import { KNOWLEDGE_BASE, type Document } from "./knowledge-base";

// A vector is just an array of numbers representing text
type Vector = number[];

interface ScoredDocument {
  document: Document;
  score: number; // 0 to 1, higher = more relevant
}

// ─── Tokenizer ───────────────────────────────────────────────
// Real systems use sophisticated tokenizers (BPE, WordPiece).
// We use simple word splitting + normalization.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ") // remove punctuation
    .split(/\s+/) // split on whitespace
    .filter((w) => w.length > 2) // drop tiny words
    .filter((w) => !STOP_WORDS.has(w)); // drop common words
}

// Words that don't carry meaning for search
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can",
  "had", "her", "was", "one", "our", "out", "has", "have", "from",
  "they", "been", "this", "that", "with", "will", "each", "make",
  "like", "than", "them", "some", "what", "when", "who", "how",
  "its", "also", "into", "just", "your", "more", "other", "which",
  "their", "about", "would", "these", "most", "could", "does",
]);

// ─── TF-IDF Engine ───────────────────────────────────────────

// Vocabulary: maps each unique word → index in the vector
let vocabulary: Map<string, number> = new Map();
// IDF values for each word
let idfValues: Map<string, number> = new Map();
// Pre-computed document vectors
let docVectors: { doc: Document; vector: Vector }[] = [];
// Has the index been built?
let isIndexed = false;

/**
 * Build the search index. This is like "uploading documents to a vector DB".
 * In production, this happens once at startup or when docs change.
 */
export function buildIndex(): void {
  if (isIndexed) return;

  // Step 1: Tokenize all documents
  const allTokenized = KNOWLEDGE_BASE.map((doc) =>
    tokenize(doc.title + " " + doc.content)
  );

  // Step 2: Build vocabulary (every unique word gets an index)
  const wordSet = new Set<string>();
  for (const tokens of allTokenized) {
    for (const token of tokens) {
      wordSet.add(token);
    }
  }
  vocabulary = new Map([...wordSet].sort().map((word, i) => [word, i]));

  // Step 3: Compute IDF for each word
  // IDF = log(total docs / docs containing the word)
  // Rare words get HIGH IDF, common words get LOW IDF
  const N = allTokenized.length;
  for (const word of vocabulary.keys()) {
    const docsWithWord = allTokenized.filter((tokens) =>
      tokens.includes(word)
    ).length;
    idfValues.set(word, Math.log((N + 1) / (docsWithWord + 1)) + 1);
  }

  // Step 4: Compute TF-IDF vector for each document
  docVectors = KNOWLEDGE_BASE.map((doc, i) => ({
    doc,
    vector: computeTfIdfVector(allTokenized[i]),
  }));

  isIndexed = true;
  console.log(
    `[RAG] Index built: ${KNOWLEDGE_BASE.length} docs, ${vocabulary.size} terms`
  );
}

/**
 * Convert tokens into a TF-IDF vector.
 * This is analogous to what an embedding model does,
 * but using word frequency instead of neural networks.
 */
function computeTfIdfVector(tokens: string[]): Vector {
  const vec = new Array(vocabulary.size).fill(0);
  const termCounts = new Map<string, number>();

  // Count term frequencies
  for (const token of tokens) {
    termCounts.set(token, (termCounts.get(token) || 0) + 1);
  }

  // TF-IDF = (count / totalTokens) * IDF
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

/**
 * Cosine similarity: measures how "similar" two vectors are.
 * Returns 0 (completely different) to 1 (identical direction).
 *
 * This is the EXACT same math used by Pinecone, pgvector, etc.
 * cos(θ) = (A · B) / (|A| × |B|)
 */
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

/**
 * RETRIEVE: The core RAG function.
 * Given a user query, find the most relevant documents.
 *
 * @param query - User's question
 * @param topK  - Number of documents to return (default 3)
 * @returns     - Top-K documents sorted by relevance
 */
export function retrieve(query: string, topK: number = 3): ScoredDocument[] {
  buildIndex(); // Ensure index is ready

  // Step 1: Convert query to vector (same process as documents)
  const queryTokens = tokenize(query);
  const queryVector = computeTfIdfVector(queryTokens);

  // Step 2: Score every document by similarity to query
  const scored: ScoredDocument[] = docVectors.map(({ doc, vector }) => ({
    document: doc,
    score: cosineSimilarity(queryVector, vector),
  }));

  // Step 3: Sort by score and return top K
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0.05) // minimum relevance threshold
    .slice(0, topK);
}

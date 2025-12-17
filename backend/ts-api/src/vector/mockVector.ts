// Simple in-memory mock vector DB for dev. Replace with Milvus/FAISS/Pinecone client.
const store = new Map();
let counter = 1;


export async function insertVector(vec: number[], meta: any) {
const id = `v${counter++}`;
store.set(id, { vec, meta });
return id;
}


export async function searchVector(vec: number[], topK = 10) {
// naive cosine-similarity ranking
function dot(a: number[], b: number[]) { return a.reduce((s, v, i) => s + v * (b[i] || 0), 0); }
function norm(a: number[]) { return Math.sqrt(a.reduce((s, v) => s + v * v, 0)); }
const results: any[] = [];
for (const [id, { vec: v, meta }] of store.entries()) {
const score = dot(vec, v) / (norm(vec) * norm(v) + 1e-9);
results.push({ id, score, meta });
}
return results.sort((a, b) => b.score - a.score).slice(0, topK);
}
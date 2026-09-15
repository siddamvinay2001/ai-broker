-- HNSW indexes for cosine similarity search. Prisma's schema language cannot
-- express these, so they live in a hand-written migration.
CREATE INDEX IF NOT EXISTS property_embedding_hnsw_idx
  ON "property" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS community_embedding_hnsw_idx
  ON "community" USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS broker_embedding_hnsw_idx
  ON "broker" USING hnsw (embedding vector_cosine_ops);

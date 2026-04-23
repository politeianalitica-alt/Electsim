-- Crear índice vectorial solo cuando exista masa crítica de datos.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM posts_redes_sociales) > 5000 THEN
        CREATE INDEX IF NOT EXISTS idx_posts_embedding_ivfflat
        ON posts_redes_sociales USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    ELSE
        RAISE NOTICE 'IVFFlat index skipped: tabla insuficiente para centroides';
    END IF;
END $$;

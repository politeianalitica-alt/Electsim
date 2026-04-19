-- Índices de soporte para checkpoint/resume de simulaciones en agent_memory_log
CREATE INDEX IF NOT EXISTS idx_agent_memory_log_session_kind_cluster
ON agent_memory_log (session_id, kind, cluster_id);

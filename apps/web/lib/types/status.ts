// Data mode types — mirrors api/schemas/status.py
export type DataMode = "real" | "demo" | "fallback" | "error";

export interface ModeMeta {
  mode: DataMode;
  source: string;
  message: string;
  updated_at: string; // ISO 8601
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ModeMeta;
}

// Brain status types
export interface BrainStatusData {
  ollama_available: boolean;
  brain_available: boolean;
  active_model: string;
  routing: RoutingConfig;
  env: Record<string, string>;
  timestamp: number;
}

export interface RoutingConfig {
  task_types: Record<string, TaskTypeConfig>;
  speed_models: Record<string, string>;
  ollama_available: boolean;
  cache_stats: CacheStats;
}

export interface TaskTypeConfig {
  speed: "fast" | "normal" | "deep";
  timeout: number;
  json_output: boolean;
  cache_ttl_seconds: number;
  model: string;
}

export interface CacheStats {
  size: number;
  max_size: number;
  ttl_seconds: number;
}

export interface BrainTestRequest {
  prompt: string;
  task_type?: string;
}

export interface BrainTestData {
  success: boolean;
  response?: string;
  model_used?: string;
  cached?: boolean;
  elapsed_ms: number;
  task_type: string;
  error?: string;
}

export interface EmbedTestRequest {
  text: string;
}

export interface EmbedTestData {
  success: boolean;
  model?: string;
  elapsed_ms: number;
  char_count?: number;
  error?: string;
}

// Envelope-wrapped response types from endpoints
export interface BrainStatusResponse {
  mode: DataMode;
  data: BrainStatusData;
  source?: string;
  updated_at: string;
  error?: string;
}

export interface BrainTestResponse {
  mode: DataMode;
  data: BrainTestData;
  updated_at: string;
}

export interface EmbedTestResponse {
  mode: DataMode;
  data: EmbedTestData;
  updated_at: string;
}

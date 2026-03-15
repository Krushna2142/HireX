/* eslint-disable prettier/prettier */
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options?: OllamaOptions;
}

export interface OllamaOptions {
  temperature?: number;    // 0.0 = deterministic, 1.0 = creative
  top_p?: number;
  top_k?: number;
  num_predict?: number;   // max tokens to generate
  repeat_penalty?: number;
  stop?: string[];        // stop sequences
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaTagsResponse {
  models: Array<{
    name: string;
    size: number;
    digest: string;
    modified_at: string;
  }>;
}

export interface OllamaHealthStatus {
  isHealthy: boolean;
  model: string;
  availableModels: string[];
  responseTimeMs?: number;
}
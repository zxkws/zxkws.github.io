export type KnowledgeModality = 'text' | 'multimodal' | 'graph';

export type KnowledgeStatus = 'active' | 'syncing' | 'paused';

export interface KnowledgeMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  trend: 'up' | 'down' | 'flat';
  delta: string;
}

export interface KnowledgeSpace {
  id: string;
  name: string;
  description: string;
  modality: KnowledgeModality;
  documentCount: number;
  tokens: number;
  lastSync: string;
  owners: string[];
  status: KnowledgeStatus;
  searchLatencyMs: number;
  recall: number;
}

export type PipelineStageType =
  | 'ingest'
  | 'chunk'
  | 'embed'
  | 'classify'
  | 'moderate'
  | 'index'
  | 'graph-build'
  | 'graph-enrich'
  | 'search'
  | 'rerank';

export interface PipelineStage {
  id: string;
  name: string;
  type: PipelineStageType;
  description: string;
  owner: string;
  status: 'idle' | 'running' | 'success' | 'error';
  durationMs?: number;
  config: Record<string, unknown>;
}

export interface IngestionPipeline {
  id: string;
  name: string;
  modality: KnowledgeModality;
  stages: PipelineStage[];
  schedule: 'realtime' | 'hourly' | 'daily' | 'manual';
  lastRunAt: string;
  nextRunAt: string;
  successRate: number;
}

export interface RetrievalEvaluator {
  id: string;
  name: string;
  metric: string;
  baseline: number;
  target: number;
  current: number;
  lastRunAt: string;
}

export interface MultimodalAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'document';
  title: string;
  modality: string[];
  vectorSize: number;
  status: 'ready' | 'processing' | 'error';
  updatedAt: string;
  tags: string[];
}

export interface GraphNodeType {
  id: string;
  label: string;
  description: string;
  example: string;
}

export interface GraphRelationshipType {
  id: string;
  label: string;
  source: string;
  target: string;
  description: string;
}

export interface GraphRagRun {
  id: string;
  triggeredBy: string;
  query: string;
  createdAt: string;
  status: 'running' | 'success' | 'error';
  latencyMs: number;
  hops: number;
  reasoningTokens: number;
}

export interface DataQualityIssue {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  detectedAt: string;
  owner: string;
  remediation: string;
}

export interface WorkflowPlaybook {
  id: string;
  name: string;
  category: 'ingestion' | 'quality' | 'retrieval' | 'governance';
  description: string;
  steps: string[];
  owner: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: unknown;
}

export interface ApiError {
  code: string;
  message: string;
  httpStatus: number;
}

export interface ApiEndpoint {
  id: string;
  name: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  requestBody?: SchemaField[];
  queryParams?: SchemaField[];
  responseBody: SchemaField[];
  errors?: ApiError[];
}

export interface BackendService {
  name: string;
  description: string;
  basePath: string;
  endpoints: ApiEndpoint[];
}

// ─── Node Category ──────────────────────────────────────────────────────────

export type NodeCategory = 'agent' | 'model' | 'tool' | 'control' | 'data';

export const NODE_CATEGORY_COLORS: Record<NodeCategory, string> = {
  agent: 'var(--node-agent)',
  model: 'var(--node-model)',
  tool: 'var(--node-tool)',
  control: 'var(--node-control)',
  data: 'var(--node-data)',
};

export const NODE_CATEGORY_LABELS: Record<NodeCategory, string> = {
  agent: 'Agent',
  model: 'Model',
  tool: 'Tool',
  control: 'Control Flow',
  data: 'Data',
};

// ─── Handle Definition ──────────────────────────────────────────────────────

export interface HandleDefinition {
  id: string;
  type: 'source' | 'target';
  position: 'top' | 'bottom' | 'left' | 'right';
  label?: string;
  maxConnections?: number;
}

// ─── Config Field Types ─────────────────────────────────────────────────────

export type ConfigFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'json'
  | 'code'
  | 'model-selector'
  | 'tool-selector'
  | 'key-value'
  | 'slider';

export interface ConfigFieldOption {
  label: string;
  value: string;
  description?: string;
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

export interface ConfigField {
  name: string;
  label: string;
  type: ConfigFieldType;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  description?: string;
  options?: ConfigFieldOption[];
  validation?: FieldValidation;
  dependsOn?: { field: string; value: unknown };
  group?: string;
}

// ─── Node Definition ────────────────────────────────────────────────────────

export interface NodeDefinition {
  type: string;
  category: NodeCategory;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  inputs: HandleDefinition[];
  outputs: HandleDefinition[];
  configFields: ConfigField[];
  defaultConfig: Record<string, unknown>;
  version: number;
  tags?: string[];
}


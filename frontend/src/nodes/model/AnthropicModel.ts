import type { NodeDefinition } from '@/types/node-definitions';

export const anthropicModelNode: NodeDefinition = {
  type: 'anthropic-model',
  category: 'model',
  displayName: 'Anthropic Claude',
  description: 'Cloud LLM inference with Anthropic Claude models (Claude 3.7 Sonnet, Claude 3.5 Haiku).',
  icon: 'Sparkles',
  color: 'var(--node-model)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Prompt / Messages',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Model Response',
    },
  ],
  configFields: [
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      required: true,
      defaultValue: 'claude-3-7-sonnet-20250219',
      options: [
        { label: 'Claude 3.7 Sonnet (Hybrid reasoning)', value: 'claude-3-7-sonnet-20250219' },
        { label: 'Claude 3.5 Sonnet (Coding & reasoning)', value: 'claude-3-5-sonnet-20241022' },
        { label: 'Claude 3.5 Haiku (Fast & responsive)', value: 'claude-3-5-haiku-20241022' },
      ],
      group: 'Model',
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      placeholder: 'sk-ant-... or {{env.ANTHROPIC_API_KEY}}',
      description: 'Anthropic API Key or environment variable reference.',
      group: 'Authentication',
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'slider',
      defaultValue: 0.7,
      validation: { min: 0, max: 1 },
      group: 'Parameters',
    },
    {
      name: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      defaultValue: 4096,
      group: 'Parameters',
    },
  ],
  defaultConfig: {
    model: 'claude-3-7-sonnet-20250219',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4096,
  },
  version: 1,
  tags: ['cloud', 'anthropic', 'claude', 'reasoning'],
};


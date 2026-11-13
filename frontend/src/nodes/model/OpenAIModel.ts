import type { NodeDefinition } from '@/types/node-definitions';

export const openAIModelNode: NodeDefinition = {
  type: 'openai-model',
  category: 'model',
  displayName: 'OpenAI Model',
  description: 'Cloud LLM inference using OpenAI models (GPT-4o, GPT-4o-mini, o1, o3-mini).',
  icon: 'Cloud',
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
      defaultValue: 'gpt-4o',
      options: [
        { label: 'GPT-4o (Omni flagship)', value: 'gpt-4o' },
        { label: 'GPT-4o-mini (Fast & efficient)', value: 'gpt-4o-mini' },
        { label: 'o1 (Reasoning)', value: 'o1' },
        { label: 'o3-mini (Reasoning compact)', value: 'o3-mini' },
      ],
      group: 'Model',
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      placeholder: 'sk-... or {{env.OPENAI_API_KEY}}',
      description: 'OpenAI API Key or environment variable reference.',
      group: 'Authentication',
    },
    {
      name: 'temperature',
      label: 'Temperature',
      type: 'slider',
      defaultValue: 0.7,
      validation: { min: 0, max: 2 },
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
    model: 'gpt-4o',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4096,
  },
  version: 1,
  tags: ['cloud', 'openai', 'gpt4o', 'reasoning'],
};


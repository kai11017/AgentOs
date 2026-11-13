import type { NodeDefinition } from '@/types/node-definitions';

export const customAPIModelNode: NodeDefinition = {
  type: 'custom-api-model',
  category: 'model',
  displayName: 'Custom OpenAI-Compatible API',
  description: 'Connect to any OpenAI-compatible LLM endpoint (vLLM, LM Studio, Groq, Together, DeepSeek API).',
  icon: 'Globe',
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
      name: 'baseUrl',
      label: 'Base URL',
      type: 'text',
      required: true,
      defaultValue: 'https://api.groq.com/openai/v1',
      placeholder: 'https://api.together.xyz/v1 or http://localhost:8000/v1',
      group: 'Endpoint',
    },
    {
      name: 'modelId',
      label: 'Model Identifier',
      type: 'text',
      required: true,
      defaultValue: 'llama-3.3-70b-versatile',
      placeholder: 'e.g. meta-llama/Llama-3-70b-chat-hf',
      group: 'Endpoint',
    },
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      placeholder: 'Bearer token or API key',
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
      defaultValue: 2048,
      group: 'Parameters',
    },
  ],
  defaultConfig: {
    baseUrl: 'https://api.groq.com/openai/v1',
    modelId: 'llama-3.3-70b-versatile',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
  },
  version: 1,
  tags: ['custom', 'vllm', 'groq', 'together', 'openai-compatible'],
};


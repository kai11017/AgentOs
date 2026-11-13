import type { NodeDefinition } from '@/types/node-definitions';

export const customToolNode: NodeDefinition = {
  type: 'custom-tool',
  category: 'tool',
  displayName: 'Custom Tool Definition',
  description: 'Define an arbitrary custom tool with schema and handler logic for agents to invoke.',
  icon: 'Puzzle',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Input',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Output',
    },
  ],
  configFields: [
    {
      name: 'name',
      label: 'Tool Name',
      type: 'text',
      required: true,
      placeholder: 'calculator_tool',
      group: 'Metadata',
    },
    {
      name: 'description',
      label: 'Tool Description (for Agent planning)',
      type: 'textarea',
      required: true,
      placeholder: 'Explains what the tool does so LLM agents know when and how to call it...',
      group: 'Metadata',
    },
    {
      name: 'inputSchema',
      label: 'JSON Schema (Parameters)',
      type: 'json',
      defaultValue: '{\n  "type": "object",\n  "properties": {\n    "query": { "type": "string" }\n  },\n  "required": ["query"]\n}',
      group: 'Schema',
    },
    {
      name: 'implementation',
      label: 'Handler Code (JavaScript)',
      type: 'code',
      defaultValue: `export default async function execute(params) {\n  return { success: true, processed: params };\n}`,
      group: 'Code',
    },
  ],
  defaultConfig: {
    name: 'custom_tool',
    description: 'A custom tool for agent use',
    inputSchema: '{\n  "type": "object",\n  "properties": {}\n}',
    implementation: 'export default async function execute(params) { return params; }',
  },
  version: 1,
  tags: ['custom', 'plugin', 'tool', 'function-calling'],
};


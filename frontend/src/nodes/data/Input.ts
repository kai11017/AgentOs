import type { NodeDefinition } from '@/types/node-definitions';

export const inputNode: NodeDefinition = {
  type: 'input',
  category: 'data',
  displayName: 'Workflow Input',
  description: 'Provide static, mock, or parameterized input data into the workflow canvas.',
  icon: 'ArrowRightToLine',
  color: 'var(--node-data)',
  inputs: [],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Input Data',
    },
  ],
  configFields: [
    {
      name: 'inputType',
      label: 'Data Type',
      type: 'select',
      defaultValue: 'json',
      options: [
        { label: 'JSON Object / Array', value: 'json' },
        { label: 'Plain Text / Prompt', value: 'text' },
        { label: 'File Path / Binary Reference', value: 'file' },
      ],
      group: 'Format',
    },
    {
      name: 'value',
      label: 'Initial / Default Value',
      type: 'textarea',
      defaultValue: '{\n  "query": "Analyze quarterly performance report",\n  "userId": "usr_123"\n}',
      group: 'Value',
    },
  ],
  defaultConfig: {
    inputType: 'json',
    value: '{\n  "query": "Analyze quarterly report"\n}',
  },
  version: 1,
  tags: ['input', 'data', 'parameters', 'payload'],
};


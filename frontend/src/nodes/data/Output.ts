import type { NodeDefinition } from '@/types/node-definitions';

export const outputNode: NodeDefinition = {
  type: 'output',
  category: 'data',
  displayName: 'Workflow Output',
  description: 'Capture and finalize the terminal result of the workflow execution.',
  icon: 'ArrowLeftFromLine',
  color: 'var(--node-data)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Final Result',
    },
  ],
  outputs: [], // Terminal node has no outgoing edges
  configFields: [
    {
      name: 'outputType',
      label: 'Output Format',
      type: 'select',
      defaultValue: 'json',
      options: [
        { label: 'JSON Structured Object', value: 'json' },
        { label: 'Markdown Document', value: 'markdown' },
        { label: 'Raw String', value: 'text' },
      ],
      group: 'Format',
    },
    {
      name: 'saveToDisk',
      label: 'Persist Output File to Local Disk',
      type: 'boolean',
      defaultValue: false,
      group: 'Storage',
    },
    {
      name: 'outputPath',
      label: 'Destination File Path',
      type: 'text',
      placeholder: './outputs/result-{{timestamp}}.json',
      dependsOn: { field: 'saveToDisk', value: true },
      group: 'Storage',
    },
  ],
  defaultConfig: {
    outputType: 'json',
    saveToDisk: false,
    outputPath: './outputs/result.json',
  },
  version: 1,
  tags: ['output', 'result', 'terminal', 'export'],
};


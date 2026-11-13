import type { NodeDefinition } from '@/types/node-definitions';

export const transformNode: NodeDefinition = {
  type: 'transform',
  category: 'data',
  displayName: 'Data Transformation',
  description: 'Filter, map, reshape, or extract fields from incoming payloads using simple JSON path expressions.',
  icon: 'Shuffle',
  color: 'var(--node-data)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Input Data',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Transformed Data',
    },
  ],
  configFields: [
    {
      name: 'transformType',
      label: 'Operation Mode',
      type: 'select',
      defaultValue: 'pick',
      options: [
        { label: 'Pick / Filter Keys', value: 'pick' },
        { label: 'Map Array Items', value: 'map' },
        { label: 'Custom Expression ($input => ...)', value: 'custom' },
      ],
      group: 'Operation',
    },
    {
      name: 'expression',
      label: 'Transformation Logic',
      type: 'code',
      defaultValue: `// Accessible: $input\nreturn {\n  id: $input.id,\n  title: $input.title,\n  tags: $input.categories || []\n};`,
      group: 'Logic',
    },
  ],
  defaultConfig: {
    transformType: 'custom',
    expression: 'return $input;',
  },
  version: 1,
  tags: ['transform', 'json', 'map', 'filter', 'reshape'],
};


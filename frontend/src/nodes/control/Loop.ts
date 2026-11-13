import type { NodeDefinition } from '@/types/node-definitions';

export const loopNode: NodeDefinition = {
  type: 'loop',
  category: 'control',
  displayName: 'Loop / For Each',
  description: 'Iterate over an array of items, run a fixed count loop, or loop until a condition is met.',
  icon: 'Repeat',
  color: 'var(--node-control)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Items Array / Trigger',
    },
  ],
  outputs: [
    {
      id: 'loop-item',
      type: 'source',
      position: 'bottom',
      label: 'Per Item (Loop Body)',
    },
    {
      id: 'done',
      type: 'source',
      position: 'right',
      label: 'Completed (All Items)',
    },
  ],
  configFields: [
    {
      name: 'loopType',
      label: 'Loop Mode',
      type: 'select',
      required: true,
      defaultValue: 'forEach',
      options: [
        { label: 'For Each (Iterate array elements)', value: 'forEach' },
        { label: 'Fixed Count (Repeat N times)', value: 'count' },
        { label: 'While Condition (Repeat while true)', value: 'while' },
      ],
      group: 'Loop Strategy',
    },
    {
      name: 'batchSize',
      label: 'Concurrency / Batch Size',
      type: 'number',
      defaultValue: 1,
      description: 'Run items 1 by 1 sequentially, or in concurrent chunks.',
      validation: { min: 1, max: 20 },
      group: 'Execution',
    },
    {
      name: 'count',
      label: 'Repetition Count',
      type: 'number',
      defaultValue: 5,
      dependsOn: { field: 'loopType', value: 'count' },
      group: 'Loop Strategy',
    },
    {
      name: 'maxIterations',
      label: 'Safety Max Iterations',
      type: 'number',
      defaultValue: 100,
      description: 'Prevents infinite loops.',
      group: 'Safety',
    },
  ],
  defaultConfig: {
    loopType: 'forEach',
    batchSize: 1,
    count: 5,
    maxIterations: 100,
  },
  version: 1,
  tags: ['loop', 'iteration', 'batch', 'for-each'],
};


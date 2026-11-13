import type { NodeDefinition } from '@/types/node-definitions';

export const parallelExecutionNode: NodeDefinition = {
  type: 'parallel',
  category: 'control',
  displayName: 'Parallel Execution',
  description: 'Fork execution into multiple concurrent branches simultaneously to accelerate throughput.',
  icon: 'GitFork',
  color: 'var(--node-control)',
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
      id: 'branch-1',
      type: 'source',
      position: 'bottom',
      label: 'Branch 1',
    },
    {
      id: 'branch-2',
      type: 'source',
      position: 'right',
      label: 'Branch 2',
    },
  ],
  configFields: [
    {
      name: 'waitForAll',
      label: 'Wait Strategy',
      type: 'select',
      defaultValue: 'all',
      options: [
        { label: 'Wait for All Branches to Complete (Promise.all)', value: 'all' },
        { label: 'Wait for First Branch (Race / First win)', value: 'race' },
        { label: 'Fire & Forget (Do not block workflow)', value: 'async' },
      ],
      group: 'Concurrency',
    },
    {
      name: 'maxTimeout',
      label: 'Branch Timeout (seconds)',
      type: 'number',
      defaultValue: 60,
      group: 'Execution',
    },
  ],
  defaultConfig: {
    waitForAll: 'all',
    maxTimeout: 60,
  },
  version: 1,
  tags: ['parallel', 'fork', 'async', 'concurrency'],
};


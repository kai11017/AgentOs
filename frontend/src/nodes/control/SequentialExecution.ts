import type { NodeDefinition } from '@/types/node-definitions';

export const sequentialExecutionNode: NodeDefinition = {
  type: 'sequential',
  category: 'control',
  displayName: 'Sequential Execution',
  description: 'Ensure strict ordered step-by-step pipeline execution with customizable error recovery.',
  icon: 'ArrowDown',
  color: 'var(--node-control)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Previous Step',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Next Step',
    },
  ],
  configFields: [
    {
      name: 'errorHandling',
      label: 'On Step Failure',
      type: 'select',
      defaultValue: 'stop',
      options: [
        { label: 'Halt Workflow Execution', value: 'stop' },
        { label: 'Continue with Warning & Null Value', value: 'continue' },
        { label: 'Retry Step', value: 'retry' },
      ],
      group: 'Error Handling',
    },
    {
      name: 'retryCount',
      label: 'Max Retry Attempts',
      type: 'number',
      defaultValue: 3,
      dependsOn: { field: 'errorHandling', value: 'retry' },
      group: 'Error Handling',
    },
  ],
  defaultConfig: {
    errorHandling: 'stop',
    retryCount: 3,
  },
  version: 1,
  tags: ['sequential', 'pipeline', 'order'],
};


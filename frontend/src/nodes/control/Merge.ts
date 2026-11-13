import type { NodeDefinition } from '@/types/node-definitions';

export const mergeNode: NodeDefinition = {
  type: 'merge',
  category: 'control',
  displayName: 'Merge Streams',
  description: 'Merge or combine data streams from multiple previous branches into a single consolidated output.',
  icon: 'GitMerge',
  color: 'var(--node-control)',
  inputs: [
    {
      id: 'input-1',
      type: 'target',
      position: 'top',
      label: 'Input 1',
    },
    {
      id: 'input-2',
      type: 'target',
      position: 'left',
      label: 'Input 2',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Merged Data',
    },
  ],
  configFields: [
    {
      name: 'mergeStrategy',
      label: 'Merge Mode',
      type: 'select',
      defaultValue: 'combineObject',
      options: [
        { label: 'Combine Objects (Shallow Merge: Object.assign)', value: 'combineObject' },
        { label: 'Append to Array ([...input1, ...input2])', value: 'appendArray' },
        { label: 'Wait for All and Emit Keyed Map', value: 'keyedMap' },
        { label: 'Pass-through First Ready (Multiplexer)', value: 'firstReady' },
      ],
      group: 'Strategy',
    },
  ],
  defaultConfig: {
    mergeStrategy: 'combineObject',
  },
  version: 1,
  tags: ['merge', 'join', 'combine', 'aggregate'],
};


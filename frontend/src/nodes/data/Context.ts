import type { NodeDefinition } from '@/types/node-definitions';

export const contextNode: NodeDefinition = {
  type: 'context',
  category: 'data',
  displayName: 'Context Aggregator',
  description: 'Assemble and inject system instructions, user guidelines, and runtime metadata into prompts.',
  icon: 'Layers',
  color: 'var(--node-data)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Incoming Context Stream',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Synthesized Prompt Context',
    },
  ],
  configFields: [
    {
      name: 'contextScope',
      label: 'Context Scope',
      type: 'select',
      defaultValue: 'workflow',
      options: [
        { label: 'Workflow Lifetime', value: 'workflow' },
        { label: 'Global Environment', value: 'global' },
      ],
      group: 'Scope',
    },
    {
      name: 'staticContext',
      label: 'Static Context / System Rules',
      type: 'textarea',
      defaultValue: 'You must always write code with strict TypeScript and proper comments.\nPrioritize privacy-first and local operations.',
      group: 'Rules',
    },
  ],
  defaultConfig: {
    contextScope: 'workflow',
    staticContext: 'Default agent instructions',
  },
  version: 1,
  tags: ['context', 'system-prompt', 'instructions', 'rules'],
};


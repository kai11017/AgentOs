import type { NodeDefinition } from '@/types/node-definitions';

export const variableNode: NodeDefinition = {
  type: 'variable',
  category: 'data',
  displayName: 'Variable / State',
  description: 'Store, read, or update state variables across workflow stages.',
  icon: 'Variable',
  color: 'var(--node-data)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Value to Set',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Current Value',
    },
  ],
  configFields: [
    {
      name: 'variableName',
      label: 'Variable Identifier',
      type: 'text',
      required: true,
      defaultValue: 'userContext',
      placeholder: 'e.g. sessionToken, retryCount, userProfile',
      group: 'Definition',
    },
    {
      name: 'scope',
      label: 'Scope',
      type: 'select',
      defaultValue: 'execution',
      options: [
        { label: 'Execution Scope (Single Run)', value: 'execution' },
        { label: 'Workflow Scope (Persists across runs)', value: 'workflow' },
        { label: 'Global System Scope (Shared across all flows)', value: 'global' },
      ],
      group: 'Scope',
    },
    {
      name: 'initialValue',
      label: 'Default / Initial Value (JSON)',
      type: 'textarea',
      defaultValue: '""',
      group: 'Value',
    },
  ],
  defaultConfig: {
    variableName: 'var1',
    scope: 'execution',
    initialValue: '""',
  },
  version: 1,
  tags: ['variable', 'state', 'storage', 'memory'],
};


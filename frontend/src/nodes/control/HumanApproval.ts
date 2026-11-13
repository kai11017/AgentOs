import type { NodeDefinition } from '@/types/node-definitions';

export const humanApprovalNode: NodeDefinition = {
  type: 'human-approval',
  category: 'control',
  displayName: 'Human In The Loop (Approval)',
  description: 'Pause execution and request manual human review / confirmation before proceeding with high-impact actions.',
  icon: 'UserCheck',
  color: 'var(--node-control)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Action Proposal',
    },
  ],
  outputs: [
    {
      id: 'approved',
      type: 'source',
      position: 'bottom',
      label: 'Approved',
    },
    {
      id: 'rejected',
      type: 'source',
      position: 'right',
      label: 'Rejected',
    },
  ],
  configFields: [
    {
      name: 'prompt',
      label: 'Approval Question / Review Summary',
      type: 'textarea',
      required: true,
      defaultValue: 'The agent wants to execute shell commands or file changes. Do you approve?',
      description: 'The prompt displayed to the user when approval is required.',
      group: 'Prompt',
    },
    {
      name: 'timeoutMinutes',
      label: 'Timeout (Minutes)',
      type: 'number',
      defaultValue: 60,
      description: 'Time before defaulting if no human responds.',
      group: 'Options',
    },
    {
      name: 'timeoutAction',
      label: 'Default Action on Timeout',
      type: 'select',
      defaultValue: 'reject',
      options: [
        { label: 'Reject / Cancel', value: 'reject' },
        { label: 'Auto-Approve', value: 'approve' },
      ],
      group: 'Options',
    },
  ],
  defaultConfig: {
    prompt: 'Review and approve agent action proposal.',
    timeoutMinutes: 60,
    timeoutAction: 'reject',
  },
  version: 1,
  tags: ['human-in-the-loop', 'approval', 'safety', 'gate'],
};


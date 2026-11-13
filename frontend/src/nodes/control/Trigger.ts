import type { NodeDefinition } from '@/types/node-definitions';

export const triggerNode: NodeDefinition = {
  type: 'trigger',
  category: 'control',
  displayName: 'Workflow Trigger',
  description: 'The starting entry point that triggers execution (manual click, cron schedule, webhook, or file event).',
  icon: 'Zap',
  color: 'var(--node-control)',
  inputs: [], // Triggers have no inputs - they start the graph
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Start Flow',
    },
  ],
  configFields: [
    {
      name: 'triggerType',
      label: 'Trigger Mode',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: [
        { label: 'Manual (Run button in UI)', value: 'manual' },
        { label: 'Schedule (Cron Expression / Interval)', value: 'schedule' },
        { label: 'Incoming Webhook (HTTP POST/GET)', value: 'webhook' },
        { label: 'Local File Watcher (On Change/Create)', value: 'file-watch' },
      ],
      group: 'Trigger',
    },
    {
      name: 'cronExpression',
      label: 'Cron Expression',
      type: 'text',
      defaultValue: '0 9 * * 1-5',
      placeholder: '0 9 * * 1-5 (Every weekday at 9am)',
      dependsOn: { field: 'triggerType', value: 'schedule' },
      group: 'Schedule',
    },
    {
      name: 'webhookPath',
      label: 'Webhook Path Slug',
      type: 'text',
      defaultValue: '/webhook/agentos-trigger',
      placeholder: '/webhook/my-flow',
      dependsOn: { field: 'triggerType', value: 'webhook' },
      group: 'Webhook',
    },
    {
      name: 'watchPath',
      label: 'Watch Directory / File',
      type: 'text',
      placeholder: './inbox/*.pdf',
      dependsOn: { field: 'triggerType', value: 'file-watch' },
      group: 'File Watcher',
    },
  ],
  defaultConfig: {
    triggerType: 'manual',
    cronExpression: '0 9 * * 1-5',
    webhookPath: '/webhook/agentos-trigger',
    watchPath: './inbox',
  },
  version: 1,
  tags: ['trigger', 'start', 'entry', 'webhook', 'cron'],
};


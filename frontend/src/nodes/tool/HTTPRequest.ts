import type { NodeDefinition } from '@/types/node-definitions';

export const httpRequestNode: NodeDefinition = {
  type: 'http-request',
  category: 'tool',
  displayName: 'HTTP Request',
  description: 'Send webhooks, REST API calls, or GraphQL requests with configurable auth and headers.',
  icon: 'Globe',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Payload',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Response (Status & Body)',
    },
  ],
  configFields: [
    {
      name: 'method',
      label: 'Method',
      type: 'select',
      required: true,
      defaultValue: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' },
      ],
      group: 'Request',
    },
    {
      name: 'url',
      label: 'Request URL',
      type: 'text',
      required: true,
      placeholder: 'https://api.example.com/v1/data',
      description: 'Supports template variables like {{input.id}}.',
      group: 'Request',
    },
    {
      name: 'authentication',
      label: 'Authentication',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Bearer Token', value: 'bearer' },
        { label: 'Basic Auth', value: 'basic' },
        { label: 'Header API Key', value: 'header-key' },
      ],
      group: 'Auth',
    },
    {
      name: 'authSecret',
      label: 'Token / Key / Password',
      type: 'text',
      placeholder: 'Token value or secret reference',
      dependsOn: { field: 'authentication', value: 'bearer' },
      group: 'Auth',
    },
    {
      name: 'headers',
      label: 'Headers (JSON)',
      type: 'json',
      defaultValue: '{\n  "Content-Type": "application/json"\n}',
      group: 'Headers',
    },
    {
      name: 'body',
      label: 'JSON Body (for POST/PUT)',
      type: 'json',
      defaultValue: '{\n  "message": "Hello from AgentOS"\n}',
      group: 'Body',
    },
  ],
  defaultConfig: {
    method: 'GET',
    url: 'https://httpbin.org/get',
    authentication: 'none',
    authSecret: '',
    headers: '{\n  "Content-Type": "application/json"\n}',
    body: '{}',
  },
  version: 1,
  tags: ['http', 'api', 'rest', 'webhook', 'fetch'],
};


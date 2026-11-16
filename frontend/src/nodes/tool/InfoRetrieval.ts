import type { NodeDefinition } from '@/types/node-definitions';

export const infoRetrievalNode: NodeDefinition = {
  type: 'info-retrieval',
  category: 'tool',
  displayName: 'Info Retrieval',
  description: 'Searches public web sources (DuckDuckGo), reads web URLs, and retrieves verified facts into the pipeline.',
  icon: 'Search',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Input Context',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Retrieved Sources & Context',
    },
  ],
  configFields: [
    {
      name: 'query',
      label: 'Search Query / URL',
      type: 'text',
      required: true,
      defaultValue: '{{ $json.topic || $json.query || "Autonomous AI Workflows" }}',
      placeholder: 'Search term or URL. Supports {{ $json.topic }}',
      description: 'The search query or URL to inspect.',
      group: 'Search',
    },
    {
      name: 'searchType',
      label: 'Retrieval Source',
      type: 'select',
      required: true,
      defaultValue: 'web',
      options: [
        { label: 'DuckDuckGo Live Web Search', value: 'web' },
        { label: 'Fetch & Read Web URL', value: 'url' },
        { label: 'Local Vector Knowledge Base', value: 'knowledge' },
      ],
      group: 'Search',
    },
    {
      name: 'maxResults',
      label: 'Max Results Count',
      type: 'number',
      required: false,
      defaultValue: 5,
      validation: { min: 1, max: 15 },
      description: 'Number of top search results to return.',
      group: 'Settings',
    },
  ],
  defaultConfig: {
    query: '{{ $json.topic || $json.query || "Autonomous AI Workflows" }}',
    searchType: 'web',
    maxResults: 5,
  },
  version: 1,
  tags: ['search', 'retrieval', 'web', 'facts', 'research'],
};

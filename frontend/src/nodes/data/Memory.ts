import type { NodeDefinition } from '@/types/node-definitions';

export const memoryNode: NodeDefinition = {
  type: 'memory',
  category: 'data',
  displayName: 'Agent Memory (Buffer/Vector)',
  description: 'Provide short-term buffer memory or long-term vector embeddings semantic retrieval for agent chains.',
  icon: 'Brain',
  color: 'var(--node-data)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'New Memory / Query',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Retrieved Context',
    },
  ],
  configFields: [
    {
      name: 'memoryType',
      label: 'Memory Strategy',
      type: 'select',
      defaultValue: 'buffer',
      options: [
        { label: 'Sliding Window Buffer (Recent K interactions)', value: 'buffer' },
        { label: 'Vector Store (Semantic pgvector / local FAISS)', value: 'vector' },
        { label: 'Summary Memory (LLM-compressed running history)', value: 'summary' },
      ],
      group: 'Strategy',
    },
    {
      name: 'maxItems',
      label: 'Max Memory Items / History Window',
      type: 'number',
      defaultValue: 10,
      validation: { min: 1, max: 100 },
      group: 'Parameters',
    },
    {
      name: 'collectionName',
      label: 'Vector Collection Name',
      type: 'text',
      defaultValue: 'agent_knowledge',
      dependsOn: { field: 'memoryType', value: 'vector' },
      group: 'Vector Store',
    },
  ],
  defaultConfig: {
    memoryType: 'buffer',
    maxItems: 10,
    collectionName: 'agent_knowledge',
  },
  version: 1,
  tags: ['memory', 'vector', 'embeddings', 'rag', 'context'],
};


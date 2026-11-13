import type { NodeDefinition } from '@/types/node-definitions';

export const docReferenceNode: NodeDefinition = {
  type: 'doc-reference',
  category: 'data',
  displayName: 'Document / Image Reference',
  description: 'Upload PDFs, text documents, or images to provide reference context to AI agents.',
  icon: 'Paperclip',
  color: 'var(--node-data)',
  inputs: [],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Document Context',
    },
  ],
  configFields: [
    {
      name: 'title',
      label: 'Reference Title',
      type: 'text',
      required: true,
      defaultValue: 'Project Reference Doc',
      placeholder: 'e.g. Q4 Guidelines, Architecture Diagram',
      group: 'General',
    },
    {
      name: 'description',
      label: 'Description / Instructions for Agent',
      type: 'textarea',
      defaultValue: 'Use this document as ground truth for answering queries.',
      placeholder: 'Explain what this document is so the AI Agent understands how to use it...',
      group: 'General',
    },
    {
      name: 'extractText',
      label: 'Extract Text / OCR',
      type: 'boolean',
      defaultValue: true,
      description: 'Automatically parse text and tables from uploaded PDFs and images.',
      group: 'Processing',
    },
  ],
  defaultConfig: {
    title: 'Project Reference Doc',
    description: 'Use this document as ground truth for answering queries.',
    files: [],
    extractText: true,
  },
  version: 1,
  tags: ['document', 'reference', 'pdf', 'image', 'context', 'upload'],
};


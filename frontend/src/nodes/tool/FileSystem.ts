import type { NodeDefinition } from '@/types/node-definitions';

export const fileSystemNode: NodeDefinition = {
  type: 'filesystem',
  category: 'tool',
  displayName: 'File System',
  description: 'Read, write, append, or inspect files and directories within your local filesystem safely.',
  icon: 'FolderOpen',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Input Data / Content',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'File Content / Info',
    },
  ],
  configFields: [
    {
      name: 'operation',
      label: 'Operation',
      type: 'select',
      required: true,
      defaultValue: 'read',
      options: [
        { label: 'Read File', value: 'read' },
        { label: 'Write / Overwrite File', value: 'write' },
        { label: 'Append to File', value: 'append' },
        { label: 'List Directory Contents', value: 'list' },
        { label: 'Check File Existence', value: 'exists' },
        { label: 'Delete File', value: 'delete' },
      ],
      group: 'Action',
    },
    {
      name: 'path',
      label: 'Target File / Directory Path',
      type: 'text',
      required: true,
      placeholder: './data/output.json or C:/Users/.../file.txt',
      description: 'Absolute or workspace-relative path.',
      group: 'Target',
    },
    {
      name: 'content',
      label: 'Content to Write (if not fed from Input)',
      type: 'textarea',
      placeholder: 'Text or JSON content to save to file...',
      dependsOn: { field: 'operation', value: 'write' },
      group: 'Content',
    },
    {
      name: 'encoding',
      label: 'Encoding',
      type: 'select',
      defaultValue: 'utf-8',
      options: [
        { label: 'UTF-8', value: 'utf-8' },
        { label: 'Base64', value: 'base64' },
        { label: 'Binary / Raw', value: 'binary' },
      ],
      group: 'Options',
    },
  ],
  defaultConfig: {
    operation: 'read',
    path: './data.txt',
    content: '',
    encoding: 'utf-8',
  },
  version: 1,
  tags: ['file', 'storage', 'read', 'write', 'local'],
};


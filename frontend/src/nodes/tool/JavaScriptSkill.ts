import type { NodeDefinition } from '@/types/node-definitions';

export const javaScriptSkillNode: NodeDefinition = {
  type: 'javascript-skill',
  category: 'tool',
  displayName: 'JavaScript / Node Script',
  description: 'Execute custom JavaScript or TypeScript logic directly in the workflow pipeline.',
  icon: 'FileCode',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Input Data',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Return Data',
    },
  ],
  configFields: [
    {
      name: 'name',
      label: 'Skill Name',
      type: 'text',
      required: true,
      defaultValue: 'Data Transformer',
      group: 'General',
    },
    {
      name: 'code',
      label: 'JavaScript Code',
      type: 'code',
      required: true,
      defaultValue: `// Accessible inputs: $input (payload from previous node), $env (environment)\nexport default async function run({ $input, $env }) {\n  console.log("Processing input:", $input);\n  \n  return {\n    processedAt: new Date().toISOString(),\n    data: $input,\n    summary: "Successfully transformed in JS sandbox"\n  };\n}`,
      description: 'Async function returning an output object.',
      group: 'Code',
    },
    {
      name: 'timeout',
      label: 'Timeout (ms)',
      type: 'number',
      defaultValue: 5000,
      group: 'Execution',
    },
  ],
  defaultConfig: {
    name: 'Data Transformer',
    code: `export default async function run({ $input }) {\n  return $input;\n}`,
    timeout: 5000,
  },
  version: 1,
  tags: ['code', 'javascript', 'typescript', 'skill'],
};


import type { NodeDefinition } from '@/types/node-definitions';

export const ifElseNode: NodeDefinition = {
  type: 'if-else',
  category: 'control',
  displayName: 'If / Else Branch',
  description: 'Evaluate a condition or boolean expression to direct execution to True or False branches.',
  icon: 'GitBranch',
  color: 'var(--node-control)',
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
      id: 'true',
      type: 'source',
      position: 'bottom',
      label: 'True (Yes)',
    },
    {
      id: 'false',
      type: 'source',
      position: 'right',
      label: 'False (No)',
    },
  ],
  configFields: [
    {
      name: 'conditionType',
      label: 'Condition Type',
      type: 'select',
      defaultValue: 'expression',
      options: [
        { label: 'JavaScript Expression', value: 'expression' },
        { label: 'Simple Comparison', value: 'comparison' },
        { label: 'LLM Evaluator Decision', value: 'llm' },
      ],
      group: 'Logic',
    },
    {
      name: 'expression',
      label: 'Condition Expression',
      type: 'code',
      required: true,
      defaultValue: '// Return true or false\n$input.status === "approved" || $input.score > 80',
      description: 'Expression evaluated in the sandbox. $input is the incoming data payload.',
      group: 'Logic',
    },
    {
      name: 'trueLabel',
      label: 'True Branch Label',
      type: 'text',
      defaultValue: 'Proceed / Success',
      group: 'Display',
    },
    {
      name: 'falseLabel',
      label: 'False Branch Label',
      type: 'text',
      defaultValue: 'Fallback / Reject',
      group: 'Display',
    },
  ],
  defaultConfig: {
    conditionType: 'expression',
    expression: '$input.success === true',
    trueLabel: 'True',
    falseLabel: 'False',
  },
  version: 1,
  tags: ['branch', 'conditional', 'control', 'if', 'else'],
};


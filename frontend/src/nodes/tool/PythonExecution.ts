import type { NodeDefinition } from '@/types/node-definitions';

export const pythonExecutionNode: NodeDefinition = {
  type: 'python-execution',
  category: 'tool',
  displayName: 'Python Execution',
  description: 'Execute Python scripts locally with access to virtual environments and libraries.',
  icon: 'Terminal',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Input Payload',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Script Output (stdout/json)',
    },
  ],
  configFields: [
    {
      name: 'name',
      label: 'Task Name',
      type: 'text',
      required: true,
      defaultValue: 'Python Task',
      group: 'General',
    },
    {
      name: 'script',
      label: 'Python Code',
      type: 'code',
      required: true,
      defaultValue: `import json\nimport sys\n\ndef main():\n    # Reads input passed through stdin or arguments\n    raw_input = sys.stdin.read()\n    payload = json.loads(raw_input) if raw_input else {}\n    \n    result = {\n        "status": "success",\n        "processed_items": len(payload.get("items", [])),\n        "echo": payload\n    }\n    \n    print(json.dumps(result))\n\nif __name__ == "__main__":\n    main()`,
      group: 'Code',
    },
    {
      name: 'pythonPath',
      label: 'Python Interpreter Path',
      type: 'text',
      defaultValue: 'python',
      placeholder: 'python or .venv/bin/python',
      description: 'Path to system or virtual environment python executable.',
      group: 'Environment',
    },
    {
      name: 'requirements',
      label: 'Pip Packages (comma-separated)',
      type: 'text',
      placeholder: 'pandas, requests, beautifulsoup4',
      group: 'Environment',
    },
    {
      name: 'timeout',
      label: 'Timeout (seconds)',
      type: 'number',
      defaultValue: 60,
      group: 'Execution',
    },
  ],
  defaultConfig: {
    name: 'Python Task',
    script: 'import sys, json\nprint(json.dumps({"success": True}))',
    pythonPath: 'python',
    requirements: '',
    timeout: 60,
  },
  version: 1,
  tags: ['python', 'script', 'data-science', 'ml'],
};


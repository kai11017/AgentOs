import type { NodeDefinition } from '@/types/node-definitions';

export const mcpToolNode: NodeDefinition = {
  type: 'mcp-tool',
  category: 'tool',
  displayName: 'Model Context Protocol (MCP) Tool',
  description: 'Invoke external tools and system capabilities via standardized Model Context Protocol servers.',
  icon: 'Wrench',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Arguments / Context',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Tool Result',
    },
  ],
  configFields: [
    {
      name: 'serverName',
      label: 'MCP Server',
      type: 'select',
      required: true,
      defaultValue: 'filesystem',
      options: [
        { label: 'Filesystem MCP Server (Local Workspace)', value: 'filesystem' },
        { label: 'Terminal / Shell MCP Server (Command Execution)', value: 'terminal' },
        { label: 'Browser Automation MCP Server (Playwright)', value: 'browser' },
        { label: 'Fetch / Web Search MCP Server', value: 'fetch' },
        { label: 'Custom Server URL / Stdio', value: 'custom' },
      ],
      group: 'Server',
    },
    {
      name: 'toolName',
      label: 'Tool Function',
      type: 'text',
      required: true,
      placeholder: 'e.g. read_file, execute_command, browse_page',
      description: 'The specific tool exported by the MCP server.',
      group: 'Server',
    },
    {
      name: 'protocol',
      label: 'Transport Protocol',
      type: 'select',
      defaultValue: 'stdio',
      options: [
        { label: 'stdio (Subprocess standard in/out)', value: 'stdio' },
        { label: 'SSE / HTTP (Server-Sent Events)', value: 'sse' },
      ],
      group: 'Connection',
    },
    {
      name: 'customServerPath',
      label: 'Custom Server Executable / URL',
      type: 'text',
      placeholder: 'npx -y @modelcontextprotocol/server-filesystem /path',
      dependsOn: { field: 'serverName', value: 'custom' },
      group: 'Connection',
    },
    {
      name: 'inputSchema',
      label: 'Tool Input Schema / Arguments (JSON)',
      type: 'json',
      defaultValue: '{\n  "path": "/workspace/data.txt"\n}',
      group: 'Arguments',
    },
    {
      name: 'timeout',
      label: 'Timeout (seconds)',
      type: 'number',
      defaultValue: 30,
      validation: { min: 1, max: 600 },
      group: 'Execution',
    },
  ],
  defaultConfig: {
    serverName: 'filesystem',
    toolName: 'read_file',
    protocol: 'stdio',
    customServerPath: '',
    inputSchema: '{\n  "path": ""\n}',
    timeout: 30,
  },
  version: 1,
  tags: ['mcp', 'tools', 'local', 'protocols', 'agentic'],
};


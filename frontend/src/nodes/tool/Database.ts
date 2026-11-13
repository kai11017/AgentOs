import type { NodeDefinition } from '@/types/node-definitions';

export const databaseNode: NodeDefinition = {
  type: 'database',
  category: 'tool',
  displayName: 'Database Query',
  description: 'Execute queries on PostgreSQL / Supabase, SQLite, MySQL, or MongoDB databases.',
  icon: 'Database',
  color: 'var(--node-tool)',
  inputs: [
    {
      id: 'input',
      type: 'target',
      position: 'top',
      label: 'Query Parameters',
    },
  ],
  outputs: [
    {
      id: 'output',
      type: 'source',
      position: 'bottom',
      label: 'Query Rows / Result',
    },
  ],
  configFields: [
    {
      name: 'dbType',
      label: 'Database Engine',
      type: 'select',
      required: true,
      defaultValue: 'sqlite',
      options: [
        { label: 'SQLite (Local File)', value: 'sqlite' },
        { label: 'PostgreSQL / Supabase (with pgvector)', value: 'postgresql' },
        { label: 'MySQL / MariaDB', value: 'mysql' },
        { label: 'MongoDB', value: 'mongodb' },
      ],
      group: 'Connection',
    },
    {
      name: 'connectionString',
      label: 'Connection String / Database Path',
      type: 'text',
      required: true,
      defaultValue: './agentos.db',
      placeholder: 'postgresql://user:pass@localhost:5432/agentos or ./data.db',
      group: 'Connection',
    },
    {
      name: 'query',
      label: 'SQL / Query Statement',
      type: 'code',
      required: true,
      defaultValue: 'SELECT * FROM tasks WHERE status = "pending" LIMIT 50;',
      description: 'Supports parameterized queries using $1 or :var.',
      group: 'Query',
    },
    {
      name: 'parameters',
      label: 'Parameters (JSON Array or Object)',
      type: 'json',
      defaultValue: '[]',
      group: 'Query',
    },
  ],
  defaultConfig: {
    dbType: 'sqlite',
    connectionString: './agentos.db',
    query: 'SELECT * FROM items LIMIT 10;',
    parameters: '[]',
  },
  version: 1,
  tags: ['database', 'sql', 'postgres', 'sqlite', 'vector'],
};


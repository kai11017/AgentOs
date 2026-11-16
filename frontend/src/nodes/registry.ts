import type { NodeDefinition, NodeCategory } from '@/types/node-definitions';

// Agent Nodes
import { researchAgentNode } from './agent/ResearchAgent';
import { codingAgentNode } from './agent/CodingAgent';
import { planningAgentNode } from './agent/PlanningAgent';
import { executionAgentNode } from './agent/ExecutionAgent';
import { reviewerAgentNode } from './agent/ReviewerAgent';
import { customAgentNode } from './agent/CustomAgent';

// Model Nodes
import { ollamaModelNode } from './model/OllamaModel';
import { openAIModelNode } from './model/OpenAIModel';
import { anthropicModelNode } from './model/AnthropicModel';
import { customAPIModelNode } from './model/CustomAPIModel';

// Tool Nodes
import { mcpToolNode } from './tool/MCPTool';
import { javaScriptSkillNode } from './tool/JavaScriptSkill';
import { pythonExecutionNode } from './tool/PythonExecution';
import { httpRequestNode } from './tool/HTTPRequest';
import { emailSendNode } from './tool/EmailSend';
import { infoRetrievalNode } from './tool/InfoRetrieval';
import { fileSystemNode } from './tool/FileSystem';
import { databaseNode } from './tool/Database';
import { customToolNode } from './tool/CustomTool';

// Control Flow Nodes
import { ifElseNode } from './control/IfElse';
import { loopNode } from './control/Loop';
import { parallelExecutionNode } from './control/ParallelExecution';
import { sequentialExecutionNode } from './control/SequentialExecution';
import { mergeNode } from './control/Merge';
import { triggerNode } from './control/Trigger';
import { humanApprovalNode } from './control/HumanApproval';

// Data Nodes
import { inputNode } from './data/Input';
import { outputNode } from './data/Output';
import { variableNode } from './data/Variable';
import { transformNode } from './data/Transform';
import { memoryNode } from './data/Memory';
import { contextNode } from './data/Context';
import { docReferenceNode } from './data/DocReference';

class NodeRegistry {
  private definitions: Map<string, NodeDefinition> = new Map();

  constructor() {
    this.registerAllBuiltins();
  }

  private registerAllBuiltins(): void {
    const all = [
      // Agents
      researchAgentNode,
      codingAgentNode,
      planningAgentNode,
      executionAgentNode,
      reviewerAgentNode,
      customAgentNode,

      // Models
      ollamaModelNode,
      openAIModelNode,
      anthropicModelNode,
      customAPIModelNode,

      // Tools
      mcpToolNode,
      javaScriptSkillNode,
      pythonExecutionNode,
      httpRequestNode,
      emailSendNode,
      infoRetrievalNode,
      fileSystemNode,
      databaseNode,
      customToolNode,

      // Control Flow
      ifElseNode,
      loopNode,
      parallelExecutionNode,
      sequentialExecutionNode,
      mergeNode,
      triggerNode,
      humanApprovalNode,

      // Data
      inputNode,
      outputNode,
      variableNode,
      transformNode,
      memoryNode,
      contextNode,
      docReferenceNode,
    ];

    for (const def of all) {
      this.register(def);
    }
  }

  register(definition: NodeDefinition): void {
    this.definitions.set(definition.type, definition);
  }

  get(type: string): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  getByCategory(category: NodeCategory): NodeDefinition[] {
    return this.getAll().filter((d) => d.category === category);
  }

  getCategories(): NodeCategory[] {
    return ['agent', 'model', 'tool', 'control', 'data'];
  }
}

export const nodeRegistry = new NodeRegistry();
export default nodeRegistry;


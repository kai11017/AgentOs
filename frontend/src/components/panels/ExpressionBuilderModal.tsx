import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { httpApiAdapter, type EvaluateExpressionResult } from '@/api/http-adapter';
import {
  X,
  Sparkles,
  Layers,
  ChevronRight,
  Code2,
  Copy,
  Check,
  Zap,
  Globe,
  Database,
  Terminal,
  Key,
} from 'lucide-react';

interface ExpressionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fieldName: string;
  initialValue: string;
  currentNodeId: string;
  onApply: (evaluatedOrExpression: string) => void;
}

export const ExpressionBuilderModal: React.FC<ExpressionBuilderModalProps> = ({
  isOpen,
  onClose,
  fieldName,
  initialValue,
  currentNodeId,
  onApply,
}) => {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  const [expression, setExpression] = useState(initialValue || '');
  const [evalResult, setEvalResult] = useState<EvaluateExpressionResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'json' | 'nodes' | 'env'>('json');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial expression when opening
  useEffect(() => {
    if (isOpen) {
      setExpression(initialValue || '');
    }
  }, [isOpen, initialValue]);

  // Compute upstream DAG ancestor nodes
  const upstreamNodes = useMemo(() => {
    const ancestors: typeof nodes = [];
    const visited = new Set<string>();
    const queue = [currentNodeId];

    while (queue.length > 0) {
      const targetId = queue.shift()!;
      const incoming = edges.filter((e) => e.target === targetId);
      for (const edge of incoming) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          const found = nodes.find((n) => n.id === edge.source);
          if (found) {
            ancestors.push(found);
            queue.push(found.id);
          }
        }
      }
    }
    return ancestors;
  }, [nodes, edges, currentNodeId]);

  // Compute representative sample context for current node
  const evaluationContext = useMemo(() => {
    const parentNode = upstreamNodes[0];
    const parentSample = parentNode?.data?.sampleOutput || {
      title: 'Autonomous Research Brief',
      summary: 'Deep learning reasoning loops verified with 99.8% precision.',
      status: 'success',
      timestamp: new Date().toISOString(),
      score: 95,
      items: ['Item Alpha', 'Item Beta'],
    };

    const upstreamNodesMap: Record<string, any> = {};
    for (const uNode of upstreamNodes) {
      upstreamNodesMap[uNode.id] = {
        label: uNode.data?.label || uNode.id,
        type: uNode.data?.definitionType || uNode.type,
        output: uNode.data?.sampleOutput || {
          status: 'completed',
          data: { result: 'Sample output from ' + (uNode.data?.label || uNode.id) },
        },
      };
    }

    return {
      $json: parentSample,
      $prev: parentSample,
      $nodes: upstreamNodesMap,
      $env: {
        APP_ENV: 'production',
        OLLAMA_MODEL: 'qwen3.5:4b',
      },
      $execution: {
        id: 'exec-preview-001',
      },
      $workflow: {
        name: 'AgentOS Workflow',
      },
    };
  }, [upstreamNodes]);

  // Debounced live evaluation
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsEvaluating(true);
      try {
        const res = await httpApiAdapter.evaluateExpression({
          expression,
          context: evaluationContext,
        });
        setEvalResult(res);
      } catch (err: any) {
        setEvalResult({
          success: false,
          result: null,
          type: 'error',
          preview: 'Error',
          error: err.message,
        });
      } finally {
        setIsEvaluating(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [expression, isOpen, evaluationContext]);

  if (!isOpen) return null;

  // Insert variable tag at cursor
  const handleInsertVariable = (variableExpr: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setExpression((prev) => `${prev} {{ ${variableExpr} }}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = expression.substring(0, start);
    const after = expression.substring(end);
    const toInsert = `{{ ${variableExpr} }}`;

    const updated = `${before}${toInsert}${after}`;
    setExpression(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + toInsert.length, start + toInsert.length);
    }, 10);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(expression);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleApply = () => {
    onApply(expression);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white border border-[#ded8cc] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ded8cc] bg-[#fcfbfa]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#15803d]/10 flex items-center justify-center text-[#15803d]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#19221d] flex items-center gap-2">
                Expression Builder
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f0ede6] text-[#5c6861] rounded-md font-normal">
                  Field: {fieldName}
                </span>
              </h3>
              <p className="text-[11px] text-[#5c6861]">
                Reference incoming data, upstream nodes, or environment variables in real time.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5c6861] hover:text-[#19221d] hover:bg-[#f5f2eb] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Split Layout */}
        <div className="grid grid-cols-12 flex-1 min-h-[420px] overflow-hidden">
          {/* Left Column: Variable Picker */}
          <div className="col-span-5 border-r border-[#ded8cc] bg-[#faf8f5] flex flex-col overflow-hidden">
            {/* Category Switcher */}
            <div className="flex items-center gap-1 p-3 border-b border-[#ded8cc] bg-white">
              <button
                type="button"
                onClick={() => setSelectedCategory('json')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  selectedCategory === 'json'
                    ? 'bg-[#15803d] text-white shadow-sm'
                    : 'text-[#5c6861] hover:bg-[#f5f2eb]'
                }`}
              >
                $json (Input)
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('nodes')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  selectedCategory === 'nodes'
                    ? 'bg-[#15803d] text-white shadow-sm'
                    : 'text-[#5c6861] hover:bg-[#f5f2eb]'
                }`}
              >
                $nodes ({upstreamNodes.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('env')}
                className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  selectedCategory === 'env'
                    ? 'bg-[#15803d] text-white shadow-sm'
                    : 'text-[#5c6861] hover:bg-[#f5f2eb]'
                }`}
              >
                System ($env)
              </button>
            </div>

            {/* Variable Items Tree */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Category 1: Current $json Input */}
              {selectedCategory === 'json' && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#5c6861] uppercase tracking-wider px-1">
                    Available Incoming Keys
                  </div>
                  {Object.entries(evaluationContext.$json).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleInsertVariable(`$json.${key}`)}
                      className="w-full text-left p-2 rounded-xl bg-white border border-[#ded8cc] hover:border-[#15803d] hover:bg-[#15803d]/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-medium text-[#19221d] group-hover:text-[#15803d]">
                        <span>$json.{key}</span>
                        <span className="text-[10px] text-[#5c6861] font-sans">
                          {typeof val}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5c6861] truncate font-mono mt-0.5">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Category 2: Upstream Nodes */}
              {selectedCategory === 'nodes' && (
                <div className="space-y-3">
                  {upstreamNodes.length === 0 ? (
                    <div className="text-center py-8 text-[#5c6861] text-xs">
                      No upstream nodes connected to this node in the canvas.
                    </div>
                  ) : (
                    upstreamNodes.map((uNode) => {
                      const sample = uNode.data?.sampleOutput || {
                        status: 'completed',
                        result: 'sample',
                      };
                      return (
                        <div
                          key={uNode.id}
                          className="p-2.5 rounded-xl bg-white border border-[#ded8cc] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#19221d] flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-[#15803d]" />
                              {uNode.data?.label || uNode.id}
                            </span>
                            <span className="text-[10px] font-mono text-[#5c6861]">
                              {uNode.data?.definitionType}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {Object.entries(sample).map(([k, v]) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleInsertVariable(`$nodes['${uNode.id}'].${k}`)}
                                className="w-full text-left px-2 py-1 rounded-lg bg-[#faf8f5] hover:bg-[#15803d]/10 hover:text-[#15803d] text-[11px] font-mono flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <span>.{k}</span>
                                <span className="text-[9px] text-[#5c6861] truncate max-w-[120px]">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Category 3: System Variables */}
              {selectedCategory === 'env' && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-[#5c6861] uppercase tracking-wider px-1">
                    System & Workflow Context
                  </div>
                  {[
                    { key: '$execution.id', val: 'exec-preview-001', desc: 'Current execution UUID' },
                    { key: '$workflow.name', val: 'AgentOS Workflow', desc: 'Active workflow name' },
                    { key: '$env.OLLAMA_MODEL', val: 'qwen3.5:4b', desc: 'Local model identifier' },
                    { key: '$env.APP_ENV', val: 'production', desc: 'Runtime environment' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleInsertVariable(item.key)}
                      className="w-full text-left p-2 rounded-xl bg-white border border-[#ded8cc] hover:border-[#15803d] hover:bg-[#15803d]/5 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-medium text-[#19221d] group-hover:text-[#15803d]">
                        <span>{item.key}</span>
                        <span className="text-[10px] text-[#5c6861]">{item.desc}</span>
                      </div>
                      <div className="text-[11px] text-[#5c6861] font-mono mt-0.5">{item.val}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Expression Editor & Live Evaluation */}
          <div className="col-span-7 p-5 flex flex-col justify-between space-y-4 bg-white overflow-y-auto">
            {/* Expression Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#19221d] flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#15803d]" />
                  Expression String
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[11px] text-[#5c6861] hover:text-[#19221d] flex items-center gap-1 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#15803d]" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. {{ $json.topic }} or Analysis for {{ $json.user.name }} (Score: {{ $json.score * 2 }})"
                rows={5}
                className="w-full p-3 font-mono text-xs bg-[#faf8f5] border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d] resize-none"
              />
              <p className="text-[10px] text-[#5c6861]">
                Wrap expressions in <code className="bg-[#f0ede6] px-1 py-0.5 rounded text-[#19221d]">{'{{ ... }}'}</code>. Supports nested keys, arithmetic, strings, and logical operators.
              </p>
            </div>

            {/* Live Evaluated Output Preview */}
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#19221d] flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Live Evaluated Output
                </span>
                {evalResult && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                      evalResult.success
                        ? 'bg-[#15803d]/10 text-[#15803d]'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    Type: {evalResult.type}
                  </span>
                )}
              </div>

              <div className="p-3 bg-[#faf8f5] border border-[#ded8cc] rounded-xl font-mono text-xs text-[#19221d] min-h-[100px] flex-1 overflow-x-auto">
                {isEvaluating ? (
                  <div className="text-[#5c6861] italic text-xs">Evaluating expression...</div>
                ) : evalResult?.error ? (
                  <div className="text-red-500 text-xs">
                    Evaluation Error: {evalResult.error}
                  </div>
                ) : evalResult?.result !== undefined ? (
                  <pre className="whitespace-pre-wrap">
                    {typeof evalResult.result === 'object'
                      ? JSON.stringify(evalResult.result, null, 2)
                      : String(evalResult.result)}
                  </pre>
                ) : (
                  <div className="text-[#5c6861] italic text-xs">
                    Type an expression above or click a variable from the left palette.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Helper Chips */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#ded8cc]">
              <span className="text-[10px] text-[#5c6861] self-center mr-1">Quick syntax:</span>
              <button
                type="button"
                onClick={() => handleInsertVariable('$json.title')}
                className="px-2 py-1 rounded-lg bg-[#f0ede6] hover:bg-[#ded8cc] text-[10px] font-mono text-[#19221d] transition-colors cursor-pointer"
              >
                + $json.title
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('$json.status')}
                className="px-2 py-1 rounded-lg bg-[#f0ede6] hover:bg-[#ded8cc] text-[10px] font-mono text-[#19221d] transition-colors cursor-pointer"
              >
                + $json.status
              </button>
              <button
                type="button"
                onClick={() => handleInsertVariable('$execution.id')}
                className="px-2 py-1 rounded-lg bg-[#f0ede6] hover:bg-[#ded8cc] text-[10px] font-mono text-[#19221d] transition-colors cursor-pointer"
              >
                + $execution.id
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#ded8cc] bg-[#fcfbfa]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#5c6861] hover:text-[#19221d] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            Apply Expression
          </button>
        </div>
      </div>
    </div>
  );
};

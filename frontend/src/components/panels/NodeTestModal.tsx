import React, { useState, useEffect, useMemo } from 'react';
import { useWorkflowStore } from '@/stores/workflow-store';
import { httpApiAdapter, type TestNodeStepResult } from '@/api/http-adapter';
import {
  X,
  Play,
  Check,
  AlertCircle,
  Copy,
  Terminal,
  Clock,
  Sparkles,
  Layers,
  RotateCcw,
  Download,
} from 'lucide-react';

interface NodeTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  nodeConfig: Record<string, any>;
}

export const NodeTestModal: React.FC<NodeTestModalProps> = ({
  isOpen,
  onClose,
  nodeId,
  nodeType,
  nodeLabel,
  nodeConfig,
}) => {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'logs'>('input');
  const [inputJsonText, setInputJsonText] = useState('{\n  "query": "Quantum computing advances",\n  "count": 5\n}');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestNodeStepResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sampleApplied, setSampleApplied] = useState(false);

  // Locate immediate upstream parent node
  const parentNode = useMemo(() => {
    const incomingEdge = edges.find((e) => e.target === nodeId);
    if (!incomingEdge) return null;
    return nodes.find((n) => n.id === incomingEdge.source) || null;
  }, [edges, nodes, nodeId]);

  // Seed default input JSON from parent node sampleOutput or sensible defaults
  useEffect(() => {
    if (isOpen) {
      if (parentNode?.data?.sampleOutput) {
        setInputJsonText(JSON.stringify(parentNode.data.sampleOutput, null, 2));
      } else if (nodeType.includes('agent')) {
        setInputJsonText(
          JSON.stringify(
            {
              topic: 'Artificial Intelligence automation and industrial agent design',
              objective: 'Synthesize key insights and compute operational metrics.',
            },
            null,
            2
          )
        );
      } else if (nodeType.includes('code') || nodeType.includes('python')) {
        setInputJsonText(JSON.stringify({ count: 12, items: ['Alpha', 'Beta', 'Gamma'] }, null, 2));
      } else {
        setInputJsonText(
          JSON.stringify(
            {
              title: 'Sample Workflow Payload',
              status: 'active',
              timestamp: new Date().toISOString(),
            },
            null,
            2
          )
        );
      }
    }
  }, [isOpen, parentNode, nodeType]);

  if (!isOpen) return null;

  const handleRunStep = async () => {
    let parsedInput: Record<string, any> = {};
    try {
      parsedInput = JSON.parse(inputJsonText);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(`Invalid JSON syntax: ${e.message}`);
      setActiveTab('input');
      return;
    }

    setIsRunning(true);
    setSampleApplied(false);

    // Build upstream nodes map
    const upstreamMap: Record<string, any> = {};
    for (const edge of edges.filter((e) => e.target === nodeId)) {
      const srcNode = nodes.find((n) => n.id === edge.source);
      if (srcNode) {
        upstreamMap[srcNode.id] = {
          label: srcNode.data.label,
          type: srcNode.data.definitionType,
          output: srcNode.data.sampleOutput || { status: 'mock' },
        };
      }
    }

    try {
      const stepRes = await httpApiAdapter.testNodeStep({
        node_id: nodeId,
        node_type: nodeType,
        label: nodeLabel,
        config: nodeConfig,
        input_data: parsedInput,
        upstream_nodes: upstreamMap,
      });

      setResult(stepRes);
      setActiveTab('output');

      // Auto-save sampleOutput to node data if successful
      if (stepRes.status === 'success' && stepRes.output) {
        updateNodeData(nodeId, {
          sampleOutput: stepRes.output,
        });
      }
    } catch (err: any) {
      setResult({
        status: 'error',
        duration_ms: 0,
        output: null,
        logs: [{ timestamp: new Date().toISOString(), level: 'error', message: err.message }],
        error: err.message,
      });
      setActiveTab('output');
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyOutput = () => {
    if (!result?.output) return;
    navigator.clipboard.writeText(JSON.stringify(result.output, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveAsSample = () => {
    if (result?.output) {
      updateNodeData(nodeId, {
        sampleOutput: result.output,
      });
      setSampleApplied(true);
      setTimeout(() => setSampleApplied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white border border-[#ded8cc] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ded8cc] bg-[#fcfbfa]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#15803d]/10 flex items-center justify-center text-[#15803d]">
              <Play className="w-4 h-4 fill-[#15803d]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#19221d]">{nodeLabel}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#f0ede6] text-[#5c6861] rounded-md font-semibold">
                  {nodeType}
                </span>
                {result?.status === 'success' && (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#15803d]/10 text-[#15803d] rounded-md font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> {result.duration_ms}ms
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#5c6861]">
                Test this step in an isolated sandbox with custom input data.
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

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#ded8cc] bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('input')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer ${
              activeTab === 'input'
                ? 'border-[#15803d] text-[#15803d] bg-[#fcfbfa]'
                : 'border-transparent text-[#5c6861] hover:text-[#19221d]'
            }`}
          >
            Input Data ($json)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('output')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'output'
                ? 'border-[#15803d] text-[#15803d] bg-[#fcfbfa]'
                : 'border-transparent text-[#5c6861] hover:text-[#19221d]'
            }`}
          >
            Step Output
            {result?.status === 'success' && (
              <span className="w-2 h-2 rounded-full bg-[#15803d]" />
            )}
            {result?.status === 'error' && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-[#15803d] text-[#15803d] bg-[#fcfbfa]'
                : 'border-transparent text-[#5c6861] hover:text-[#19221d]'
            }`}
          >
            Execution Logs ({result?.logs?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[340px] bg-[#faf8f5]">
          {/* Tab 1: Input JSON */}
          {activeTab === 'input' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#19221d] flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#15803d]" />
                  Incoming $json Payload
                </span>
                {parentNode && (
                  <button
                    type="button"
                    onClick={() => {
                      if (parentNode.data?.sampleOutput) {
                        setInputJsonText(JSON.stringify(parentNode.data.sampleOutput, null, 2));
                      }
                    }}
                    className="text-[11px] font-semibold text-[#15803d] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Load output from {parentNode.data.label}
                  </button>
                )}
              </div>

              {jsonError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <textarea
                value={inputJsonText}
                onChange={(e) => setInputJsonText(e.target.value)}
                rows={10}
                className="w-full p-3 font-mono text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d] resize-none"
              />
              <p className="text-[10px] text-[#5c6861]">
                Modify the JSON payload to simulate specific trigger payloads or edge cases before running the step.
              </p>
            </div>
          )}

          {/* Tab 2: Step Output */}
          {activeTab === 'output' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#19221d]">Step Result</span>
                  {result && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                        result.status === 'success'
                          ? 'bg-[#15803d]/10 text-[#15803d]'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {result.status === 'success' ? 'SUCCESS (200 OK)' : 'FAILED'}
                    </span>
                  )}
                  {result?.duration_ms !== undefined && (
                    <span className="text-[10px] font-mono text-[#5c6861]">
                      {result.duration_ms} ms
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {result?.output && (
                    <>
                      <button
                        type="button"
                        onClick={handleCopyOutput}
                        className="px-2.5 py-1 text-[11px] font-semibold text-[#5c6861] hover:text-[#19221d] bg-white border border-[#ded8cc] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#15803d]" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAsSample}
                        className="px-2.5 py-1 text-[11px] font-semibold text-[#15803d] hover:bg-[#15803d]/10 bg-white border border-[#15803d]/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {sampleApplied ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                        {sampleApplied ? 'Sample Stored!' : 'Save as Sample for Next Nodes'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {result?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
                  <span className="font-bold">Execution Error:</span> {result.error}
                </div>
              )}

              {result?.output ? (
                <pre className="p-4 bg-white border border-[#ded8cc] rounded-xl font-mono text-xs text-[#19221d] overflow-x-auto max-h-[280px]">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              ) : (
                <div className="p-8 text-center text-[#5c6861] text-xs bg-white border border-dashed border-[#ded8cc] rounded-xl">
                  {isRunning ? 'Executing node step...' : 'Click "Run Step" below to execute this node with input data.'}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Step Logs */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#19221d]">Step Telemetry Logs</div>
              <div className="p-3 bg-black/95 text-emerald-400 font-mono text-[11px] rounded-xl min-h-[240px] max-h-[300px] overflow-y-auto space-y-1">
                {result?.logs && result.logs.length > 0 ? (
                  result.logs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-neutral-500 shrink-0">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span
                        className={`font-semibold shrink-0 uppercase text-[9px] px-1 rounded ${
                          log.level === 'error'
                            ? 'bg-red-500/20 text-red-400'
                            : log.level === 'warn'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-neutral-200">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-500 italic py-4">No execution logs recorded yet.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#ded8cc] bg-[#fcfbfa]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#5c6861] hover:text-[#19221d] transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleRunStep}
            disabled={isRunning}
            className="px-6 py-2.5 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all flex items-center gap-2 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                Executing Step...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Run Step
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

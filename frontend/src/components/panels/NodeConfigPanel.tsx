import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import nodeRegistry from '@/nodes/registry';
import { getLucideIcon } from '@/lib/utils';
import { ExpressionBuilderModal } from './ExpressionBuilderModal';
import { NodeTestModal } from './NodeTestModal';
import {
  Check,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Paperclip,
  Mail,
  Database,
  Bot,
  Zap,
  GitBranch,
  Terminal,
  Wrench,
  Sparkles,
  Globe,
  Calculator,
  Sliders,
  Play,
  Code2,
} from 'lucide-react';

interface UploadedFileItem {
  id: string;
  name: string;
  size: string;
  type: string;
}

export const NodeConfigPanel: React.FC = () => {
  const isConfigPanelOpen = useUIStore((s) => s.isConfigPanelOpen);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const setEmailOutboxOpen = useUIStore((s) => s.setEmailOutboxOpen);

  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const definition = selectedNode ? nodeRegistry.get(selectedNode.data.definitionType) : null;

  const [activeTab, setActiveTab] = useState<'node' | 'output' | 'debug'>('node');
  const [isSaved, setIsSaved] = useState(false);

  // Expression Builder & Step Testing modal states
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isExpressionModalOpen, setIsExpressionModalOpen] = useState(false);
  const [activeExpressionField, setActiveExpressionField] = useState<{
    name: string;
    value: string;
  } | null>(null);

  // Unified config form state for the currently selected node
  const [config, setConfig] = useState<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenExpression = (fieldName: string, currentValue: any) => {
    setActiveExpressionField({
      name: fieldName,
      value: String(currentValue ?? ''),
    });
    setIsExpressionModalOpen(true);
  };

  const handleApplyExpression = (expr: string) => {
    if (activeExpressionField) {
      handleFieldChange(activeExpressionField.name, expr);
    }
  };

  const FieldLabelWithExpression: React.FC<{
    label: string;
    fieldName: string;
  }> = ({ label, fieldName }) => (
    <div className="flex items-center justify-between">
      <label className="text-[11px] font-semibold text-[#5c6861]">{label}</label>
      <button
        type="button"
        onClick={() => handleOpenExpression(fieldName, config[fieldName])}
        className="text-[10px] font-mono text-[#15803d] hover:text-[#166534] hover:bg-[#15803d]/10 px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer font-bold"
        title="Open Expression Builder for this field"
      >
        <Sparkles className="w-3 h-3 text-[#15803d]" />
        <span>{'{{ fx }}'}</span>
      </button>
    </div>
  );

  // Sync state whenever selected node changes
  useEffect(() => {
    if (selectedNode) {
      const existingConfig = selectedNode.data.config || {};
      const defDefaults = definition?.defaultConfig || {};

      // Seed smart defaults tailored to node type if not already populated
      const nodeType = selectedNode.data.definitionType;
      const nodeLabel = (selectedNode.data.label || '').toLowerCase();

      let initialTailoredConfig: Record<string, any> = {
        ...defDefaults,
        ...existingConfig,
      };

      // Email node profile
      if (nodeType === 'email-send' || nodeLabel.includes('email') || nodeLabel.includes('mail')) {
        initialTailoredConfig = {
          deliveryMode: 'smtp',
          fromEmail: 'ritikmistry712@gmail.com',
          toEmail: 'mr24csb1a37@student.nitw.ac.in',
          subject: 'Weekly Research Summary & Key Insights',
          bodyType: 'HTML',
          emailBody:
            'Hello Team,\n\nPlease find attached the automated research analysis and action items synthesized by the AI Agent:\n\n{{ $json.summary or $json.body }}',
          onError: 'Retry twice, then notify me',
          ...initialTailoredConfig,
        };
      } else if (nodeType === 'info-retrieval' || nodeLabel.includes('retrieval') || nodeLabel.includes('search')) {
        initialTailoredConfig = {
          query: '{{ $json.topic || $json.query || "Autonomous AI Workflows" }}',
          searchType: 'web',
          maxResults: 5,
          ...initialTailoredConfig,
        };
      } else if (nodeLabel.includes('notion') || nodeType === 'database') {
        // Notion / Database profile
        initialTailoredConfig = {
          service: 'Notion',
          operation: 'Create Page in Database',
          databaseId: 'Research Notes (db_82f1a9)',
          titleMapping: '{{$json.title || "AI Research Brief"}}',
          contentMapping: '{{$json.summary || $json.body}}',
          tags: 'AI, Automated, Research',
          onError: 'Halt workflow',
          ...initialTailoredConfig,
        };
      } else if (nodeType === 'trigger' || nodeLabel.includes('trigger')) {
        // Trigger profile
        initialTailoredConfig = {
          triggerEvent: 'New Email Received',
          account: 'rippika@gmail.com',
          filterFolder: 'INBOX / Important',
          pollInterval: 'Every 1 minute (Realtime Webhook)',
          fetchAttachments: true,
          ...initialTailoredConfig,
        };
      } else if (nodeType === 'doc-reference' || nodeLabel.includes('doc') || nodeLabel.includes('ref')) {
        // Document / Image Reference profile
        initialTailoredConfig = {
          title: 'Q4 Product & Architecture Brief',
          docInstructions: 'Use these documents and diagrams as ground truth for synthesis.',
          extractText: true,
          files: existingConfig.files || [
            { id: 'f-1', name: 'Q4_Strategy_Brief.pdf', size: '2.4 MB', type: 'application/pdf' },
            { id: 'f-2', name: 'Agent_Architecture.png', size: '840 KB', type: 'image/png' },
          ],
          ...initialTailoredConfig,
        };
      } else if (nodeType.includes('agent')) {
        // AI Agent profile
        initialTailoredConfig = {
          model: 'qwen3.5:4b',
          instructions:
            'Summarize the incoming data, research the topic on the web, and return key insights with sources.',
          tools: ['web_search', 'calculator', 'fetch_url', 'code_runner'],
          onError: 'Retry twice, then notify me',
          temperature: 0.7,
          ...initialTailoredConfig,
        };
      }

      setConfig(initialTailoredConfig);
      setIsSaved(false);
    }
  }, [selectedNode?.id, selectedNode?.data.definitionType]);

  if (!isConfigPanelOpen || !selectedNode) {
    return null;
  }

  const handleFieldChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = async () => {
    updateNodeData(selectedNode.id, {
      config: {
        ...selectedNode.data.config,
        ...config,
      },
    });
    setIsSaved(true);
    await saveWorkflow();
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Mock file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const newFiles: UploadedFileItem[] = Array.from(uploaded).map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
      type: f.type || 'document',
    }));

    const currentFiles = config.files || [];
    handleFieldChange('files', [...currentFiles, ...newFiles]);
  };

  const handleRemoveFile = (fileId: string) => {
    const currentFiles: UploadedFileItem[] = config.files || [];
    handleFieldChange(
      'files',
      currentFiles.filter((f) => f.id !== fileId)
    );
  };

  const nodeLabelLower = (selectedNode.data.label || '').toLowerCase();
  const nodeType = selectedNode.data.definitionType;

  const isEmailNode = nodeLabelLower.includes('email') || nodeLabelLower.includes('mail') || nodeType === 'email-send';
  const isInfoRetrievalNode =
    nodeLabelLower.includes('retriev') || nodeLabelLower.includes('search') || nodeType === 'info-retrieval';
  const isTriggerNode = nodeType === 'trigger' || nodeLabelLower.includes('trigger');
  const isDatabaseNode = nodeType === 'database' || nodeLabelLower.includes('notion');
  const isDocReferenceNode =
    nodeType === 'doc-reference' || nodeLabelLower.includes('doc') || nodeLabelLower.includes('ref');
  const isAgentNode = nodeType.includes('agent');
  const isConditionNode = nodeType === 'if-else';

  return (
    <aside className="w-80 shrink-0 bg-white border-l border-[#ded8cc] flex flex-col justify-between h-full select-none z-30 shadow-xs">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Segmented Tabs: Node | Output | Debug & Test Step Launcher */}
        <div className="flex items-center justify-between px-4 pt-3 border-b border-[#ded8cc]">
          <div className="flex items-center gap-5 text-xs font-bold text-[#6a7c72]">
            <button
              type="button"
              onClick={() => setActiveTab('node')}
              className={`pb-2.5 transition-colors relative cursor-pointer font-display ${
                activeTab === 'node'
                  ? 'text-[#15803d] border-b-2 border-[#15803d] font-bold'
                  : 'hover:text-[#0e2118]'
              }`}
            >
              Node
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('output')}
              className={`pb-2.5 transition-colors relative cursor-pointer font-display ${
                activeTab === 'output'
                  ? 'text-[#15803d] border-b-2 border-[#15803d] font-bold'
                  : 'hover:text-[#0e2118]'
              }`}
            >
              Output
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('debug')}
              className={`pb-2.5 transition-colors relative cursor-pointer font-display ${
                activeTab === 'debug'
                  ? 'text-[#15803d] border-b-2 border-[#15803d] font-bold'
                  : 'hover:text-[#0e2118]'
              }`}
            >
              Debug
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsTestModalOpen(true)}
            className="mb-2 px-2.5 py-1 bg-[#15803d]/10 hover:bg-[#15803d] text-[#15803d] hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs border border-[#15803d]/30"
            title="Run isolated step test with custom input"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            Test step
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'node' && (
            <>
              {/* Node Identity Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#f0ede4]">
                <div className="w-9 h-9 rounded-xl bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-[#d8b4fe]">
                  {getLucideIcon(definition?.icon || 'Box', 'w-4 h-4 stroke-[2.2]')}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold text-[#0e2118] truncate">
                    {selectedNode.data.label || definition?.displayName || 'Node'}
                  </h3>
                  <p className="font-sans text-[11px] font-semibold text-[#6a7c72] truncate">
                    {definition?.displayName || 'Workflow Node'}
                  </p>
                </div>
              </div>

              {/* 1. EMAIL NODE CONFIGURATION (When user clicks Send Email / Gmail) */}
              {isEmailNode && (
                <div className="space-y-4">
                  {/* Delivery Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#5c6861] flex items-center justify-between">
                      <span>Delivery Mode</span>
                      <button
                        type="button"
                        onClick={() => setEmailOutboxOpen(true)}
                        className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Mail className="w-2.5 h-2.5" />
                        <span>View Outbox</span>
                      </button>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleFieldChange('deliveryMode', 'local_outbox')}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          (config.deliveryMode || 'local_outbox') === 'local_outbox'
                            ? 'bg-amber-50/70 border-amber-300 text-amber-900 shadow-2xs'
                            : 'bg-white border-[#ded8cc] text-[#6a7c72] hover:bg-[#faf8f4]'
                        }`}
                      >
                        <div className="font-bold text-[11px] flex items-center gap-1">
                          <span>⚡ Local Outbox</span>
                        </div>
                        <div className="text-[9px] text-[#86948d] mt-0.5 leading-tight">
                          No credentials needed. Safe simulated testing.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFieldChange('deliveryMode', 'smtp')}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          config.deliveryMode === 'smtp'
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs'
                            : 'bg-white border-[#ded8cc] text-[#6a7c72] hover:bg-[#faf8f4]'
                        }`}
                      >
                        <div className="font-bold text-[11px] flex items-center gap-1">
                          <span>✉️ Live SMTP</span>
                        </div>
                        <div className="text-[9px] text-[#86948d] mt-0.5 leading-tight">
                          Sends real emails via Gmail/Custom server.
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Mode Notice Banner */}
                  {(config.deliveryMode || 'local_outbox') === 'local_outbox' ? (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[10px] text-amber-900 flex items-start justify-between gap-2">
                      <div>
                        <strong>Development Mode:</strong> Emails are captured into AgentOS Outbox and saved as HTML previews on disk.
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmailOutboxOpen(true)}
                        className="px-2 py-1 bg-amber-200/60 hover:bg-amber-200 text-amber-950 font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
                      >
                        Open Outbox
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#fdfcf9] rounded-xl border border-emerald-200/70 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          SMTP Mail Server Settings
                        </span>
                        <button
                          type="button"
                          onClick={() => setEmailOutboxOpen(true)}
                          className="text-[9px] font-bold text-emerald-700 hover:underline"
                        >
                          Test SMTP Connection
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] text-[#5c6861] flex items-center justify-between">
                            <span>Host</span>
                            <span className="text-[9px] text-[#86948d]">e.g. smtp.gmail.com</span>
                          </label>
                          <input
                            type="text"
                            value={config.smtpHost || 'smtp.gmail.com'}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.includes('@')) {
                                const dom = val.split('@')[1]?.toLowerCase() || '';
                                if (dom.includes('nitw.ac.in') || dom === 'gmail.com') {
                                  val = 'smtp.gmail.com';
                                } else if (dom.includes('outlook') || dom.includes('office')) {
                                  val = 'smtp.office365.com';
                                }
                              }
                              handleFieldChange('smtpHost', val);
                            }}
                            placeholder="smtp.gmail.com"
                            className="w-full px-2 py-1 text-xs bg-white border border-[#ded8cc] rounded-lg outline-none text-[#19221d]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#5c6861]">Port</label>
                          <input
                            type="number"
                            value={config.smtpPort || 587}
                            onChange={(e) => handleFieldChange('smtpPort', parseInt(e.target.value) || 587)}
                            className="w-full px-2 py-1 text-xs bg-white border border-[#ded8cc] rounded-lg outline-none text-[#19221d]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#5c6861]">Username / Sender Email</label>
                        <input
                          type="email"
                          value={config.smtpUser || config.fromEmail || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleFieldChange('smtpUser', val);
                            handleFieldChange('fromEmail', val);
                            if (val.includes('@nitw.ac.in') || val.includes('@gmail.com')) {
                              handleFieldChange('smtpHost', 'smtp.gmail.com');
                            }
                          }}
                          placeholder="yourname@gmail.com"
                          className="w-full px-2 py-1 text-xs bg-white border border-[#ded8cc] rounded-lg outline-none text-[#19221d]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-[#5c6861] flex items-center justify-between">
                          <span>App Password</span>
                          <span className="text-[9px] text-[#86948d]">Google App Password</span>
                        </label>
                        <input
                          type="password"
                          value={config.smtpPassword || ''}
                          onChange={(e) => handleFieldChange('smtpPassword', e.target.value)}
                          placeholder="16-character App Password"
                          className="w-full px-2 py-1 text-xs bg-white border border-[#ded8cc] rounded-lg outline-none text-[#19221d]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      From Email (Sender Address)
                    </label>
                    <input
                      type="text"
                      value={config.fromEmail || 'rippika@gmail.com'}
                      onChange={(e) => handleFieldChange('fromEmail', e.target.value)}
                      placeholder="e.g. sender@company.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <FieldLabelWithExpression label="To Email (Recipient) *" fieldName="toEmail" />
                    <input
                      type="text"
                      value={config.toEmail || ''}
                      onChange={(e) => handleFieldChange('toEmail', e.target.value)}
                      placeholder="e.g. team@company.com or {{$json.email}}"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <FieldLabelWithExpression label="Subject" fieldName="subject" />
                    <input
                      type="text"
                      value={config.subject || ''}
                      onChange={(e) => handleFieldChange('subject', e.target.value)}
                      placeholder="e.g. AI Research Digest"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <FieldLabelWithExpression label="Message Body (HTML / Markdown)" fieldName="emailBody" />
                    <textarea
                      rows={4}
                      value={config.emailBody || ''}
                      onChange={(e) => handleFieldChange('emailBody', e.target.value)}
                      placeholder="Write message or embed variables like {{$json.summary}}..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d] leading-relaxed resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Attachments
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-[#f5f2eb] rounded-xl border border-[#ded8cc] text-[11px] text-[#5c6861]">
                      <Paperclip className="w-3.5 h-3.5 text-[#78857e]" />
                      <span className="truncate flex-1">research-report.pdf</span>
                      <span className="text-[10px] text-[#86948d]">Auto</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      On error
                    </label>
                    <input
                      type="text"
                      value={config.onError || 'Retry twice, then notify me'}
                      onChange={(e) => handleFieldChange('onError', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>
                </div>
              )}

              {/* INFO RETRIEVAL / WEB SEARCH NODE CONFIGURATION */}
              {isInfoRetrievalNode && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <FieldLabelWithExpression label="Search Query / Prompt *" fieldName="query" />
                    <input
                      type="text"
                      value={config.query || ''}
                      onChange={(e) => handleFieldChange('query', e.target.value)}
                      placeholder="e.g. {{$json.topic}} or 'Autonomous AI trends'"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Search Source / Provider
                    </label>
                    <select
                      value={config.searchType || 'web'}
                      onChange={(e) => handleFieldChange('searchType', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    >
                      <option value="web">DuckDuckGo Web Search (Live)</option>
                      <option value="url">Direct URL Fetch & Extraction</option>
                      <option value="knowledge">Local Document Knowledge Base (RAG)</option>
                    </select>
                  </div>

                  {config.searchType === 'url' && (
                    <div className="space-y-1">
                      <FieldLabelWithExpression label="Target URL" fieldName="url" />
                      <input
                        type="text"
                        value={config.url || ''}
                        onChange={(e) => handleFieldChange('url', e.target.value)}
                        placeholder="https://example.com/article"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861] flex items-center justify-between">
                      <span>Max Results</span>
                      <span className="text-[#15803d] font-bold">{config.maxResults || 5}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={config.maxResults || 5}
                      onChange={(e) => handleFieldChange('maxResults', parseInt(e.target.value) || 5)}
                      className="w-full accent-[#15803d] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Output Format
                    </label>
                    <div className="p-2.5 bg-[#f5f2eb] rounded-xl border border-[#ded8cc] text-[11px] text-[#5c6861] space-y-1">
                      <div className="font-semibold text-[#19221d]">Stores into $json:</div>
                      <div className="font-mono text-[10px] text-[#2d6a4f] space-y-0.5">
                        <div>$json.results (raw items)</div>
                        <div>$json.sources (urls & titles)</div>
                        <div>$json.context_block (ready for AI Prompt)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GMAIL / WEBHOOK TRIGGER NODE CONFIGURATION */}
              {isTriggerNode && !isEmailNode && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Trigger Event
                    </label>
                    <select
                      value={config.triggerEvent || 'New Email Received'}
                      onChange={(e) => handleFieldChange('triggerEvent', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    >
                      <option value="New Email Received">New Email Received (Gmail)</option>
                      <option value="New Attachment">New Attachment in Email</option>
                      <option value="Webhook Call">Webhook Endpoint (HTTP POST)</option>
                      <option value="Schedule">Schedule / Interval (Cron)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Account Connection
                    </label>
                    <input
                      type="text"
                      value={config.account || 'rippika@gmail.com'}
                      onChange={(e) => handleFieldChange('account', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Filter / Folder
                    </label>
                    <input
                      type="text"
                      value={config.filterFolder || 'INBOX / Important'}
                      onChange={(e) => handleFieldChange('filterFolder', e.target.value)}
                      placeholder="e.g. label:unread or from:client@acme.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Polling Interval
                    </label>
                    <input
                      type="text"
                      value={config.pollInterval || 'Every 1 minute (Realtime Webhook)'}
                      onChange={(e) => handleFieldChange('pollInterval', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>
                </div>
              )}

              {/* 3. NOTION / DATABASE NODE CONFIGURATION */}
              {isDatabaseNode && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Database Platform
                    </label>
                    <select
                      value={config.service || 'Notion'}
                      onChange={(e) => handleFieldChange('service', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    >
                      <option value="Notion">Notion Database</option>
                      <option value="PostgreSQL">PostgreSQL / Supabase (pgvector)</option>
                      <option value="SQLite">SQLite Local File</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Operation
                    </label>
                    <input
                      type="text"
                      value={config.operation || 'Create Page in Database'}
                      onChange={(e) => handleFieldChange('operation', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Target Database ID / Table
                    </label>
                    <input
                      type="text"
                      value={config.databaseId || 'Research Notes (db_82f1a9)'}
                      onChange={(e) => handleFieldChange('databaseId', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <FieldLabelWithExpression label="Title Property Mapping" fieldName="titleMapping" />
                    <input
                      type="text"
                      value={config.titleMapping || '{{$json.title}}'}
                      onChange={(e) => handleFieldChange('titleMapping', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>
                </div>
              )}

              {/* 4. DOCUMENT / IMAGE REFERENCE NODE CONFIGURATION (User Request: upload files) */}
              {isDocReferenceNode && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Reference Title
                    </label>
                    <input
                      type="text"
                      value={config.title || 'Q4 Product & Architecture Brief'}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  {/* Drag & Drop File Upload Dropzone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Upload Reference Documents & Images
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.md,.csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 bg-[#fbf9f4] border-2 border-dashed border-[#dcd6c8] hover:border-[#1e4d3a] rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#f1ebfc] text-[#6b3fc9] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-[#19221d]">
                        Click to upload reference
                      </span>
                      <span className="text-[10px] text-[#78857e] mt-0.5">
                        PDF, PNG, JPG, Markdown, CSV (up to 25MB)
                      </span>
                    </div>
                  </div>

                  {/* Attached Files List */}
                  {config.files && config.files.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857e]">
                        Attached References ({config.files.length})
                      </span>
                      <div className="space-y-1.5">
                        {config.files.map((file: UploadedFileItem) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-[#f5f2eb] border border-[#ded8cc] text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {file.type.includes('image') ? (
                                <ImageIcon className="w-3.5 h-3.5 text-[#1e6191] shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-[#b85816] shrink-0" />
                              )}
                              <span className="truncate text-[11px] font-medium text-[#19221d]">
                                {file.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-[#86948d]">{file.size}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(file.id)}
                                className="p-1 text-[#86948d] hover:text-[#a83838] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Instructions for AI Agent
                    </label>
                    <textarea
                      rows={3}
                      value={config.docInstructions || ''}
                      onChange={(e) => handleFieldChange('docInstructions', e.target.value)}
                      placeholder="e.g. Consult Section 3 for revenue breakdown..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d] leading-relaxed resize-none"
                    />
                  </div>
                </div>
              )}

              {/* 5. AI AGENT NODE CONFIGURATION */}
              {isAgentNode && (
                <div className="space-y-4">
                  {/* Model Selection */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861] flex items-center justify-between">
                      <span>Model Runtime</span>
                      <span className="text-[10px] text-[#15803d] font-bold">Hybrid Local/Cloud</span>
                    </label>
                    <select
                      value={config.model || 'gemini-3.5-flash'}
                      onChange={(e) => handleFieldChange('model', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d] font-semibold"
                    >
                      <option value="gemini-3.5-flash">gemini-3.5-flash (Google AI Cloud - Connected)</option>
                      <option value="qwen3.5:4b">qwen3.5:4b (Local Ollama - 3.3 GB - Installed)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Google AI Cloud - Deep Reasoning)</option>
                      <option value="llama3:latest">llama3:latest (Local Ollama - 4.7 GB)</option>
                      <option value="gpt-4o-mini">GPT-4o mini (OpenAI Cloud)</option>
                    </select>
                  </div>

                  {/* Skill & Persona Presets */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#7c3aed]" />
                      <span>Skill & Persona Preset</span>
                    </label>
                    <select
                      value={config.skillPreset || 'custom'}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleFieldChange('skillPreset', val);
                        if (val === 'research') {
                          handleFieldChange('instructions', 'Conduct thorough web research on the input topic. Cross-reference citations, extract factual data, and output an executive summary with verified sources.');
                          handleFieldChange('tools', ['web_search', 'fetch_url']);
                        } else if (val === 'quant') {
                          handleFieldChange('instructions', 'Analyze all quantitative numbers in the context. Perform rigorous calculations with the calculator tool and summarize percentage metrics and unit costs.');
                          handleFieldChange('tools', ['calculator', 'code_runner']);
                        } else if (val === 'coder') {
                          handleFieldChange('instructions', 'Write, validate, and execute sandboxed Python transformation scripts for the dataset. Return clean JSON structures and performance stats.');
                          handleFieldChange('tools', ['code_runner', 'calculator']);
                        } else if (val === 'summary') {
                          handleFieldChange('instructions', 'Distill the workflow input into an executive briefing with high-priority key takeaways, actionable recommendations, and risk analysis.');
                          handleFieldChange('tools', ['web_search', 'calculator']);
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    >
                      <option value="custom">Custom Objective</option>
                      <option value="research">Deep Research & Web Synthesis</option>
                      <option value="quant">Quantitative & Statistical Analyst</option>
                      <option value="coder">Code Architect & Sandboxed Runner</option>
                      <option value="summary">Executive Briefing & Digest</option>
                    </select>
                  </div>

                  {/* Instructions / System Prompt */}
                  <div className="space-y-1">
                    <FieldLabelWithExpression
                      label="System Instructions / Workflow Objective"
                      fieldName="instructions"
                    />
                    <textarea
                      rows={3}
                      value={config.instructions || ''}
                      onChange={(e) => handleFieldChange('instructions', e.target.value)}
                      placeholder="Instruct the model on its role, constraints, and desired output format..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d] leading-relaxed resize-none"
                    />
                  </div>

                  {/* Autonomous Tools Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#3d5045] uppercase tracking-wider flex items-center gap-1">
                        <Wrench className="w-3 h-3 text-[#15803d]" />
                        <span>Autonomous Tools</span>
                      </label>
                      <span className="text-[10px] text-[#7c3aed] font-semibold bg-[#f3e8ff] px-2 py-0.5 rounded-full border border-[#d8b4fe]">
                        MCP Enabled
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        { id: 'web_search', label: 'Web Search', desc: 'DuckDuckGo real-time crawling', color: 'orange' },
                        { id: 'calculator', label: 'Calculator', desc: 'Safe math & statistics engine', color: 'blue' },
                        { id: 'fetch_url', label: 'URL Extractor', desc: 'SSRF-protected web reader', color: 'emerald' },
                        { id: 'code_runner', label: 'Code Runner', desc: 'Sandboxed Python runner', color: 'purple' },
                      ].map((tool) => {
                        const currentTools: string[] = config.tools || ['web_search', 'calculator', 'fetch_url', 'code_runner'];
                        const isChecked = currentTools.includes(tool.id);
                        return (
                          <div
                            key={tool.id}
                            onClick={() => {
                              const next = isChecked
                                ? currentTools.filter((t) => t !== tool.id)
                                : [...currentTools, tool.id];
                              handleFieldChange('tools', next);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-white border-[#15803d] shadow-2xs'
                                : 'bg-[#faf8f5] border-[#e2dcd2] opacity-65'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 accent-[#15803d] rounded cursor-pointer"
                              />
                              <div>
                                <span className="text-xs font-bold text-[#19221d] block">
                                  {tool.label}
                                </span>
                                <span className="text-[10px] text-[#78857e]">
                                  {tool.desc}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#f0ede4] text-[#55635b]">
                              builtin
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Autonomous Execution Controls */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#f0ede4]">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5c6861]">
                        Max Tool Turns
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={config.maxIterations || 5}
                        onChange={(e) => handleFieldChange('maxIterations', parseInt(e.target.value) || 5)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] text-[#19221d]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5c6861]">
                        Temperature
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        max={1}
                        value={config.temperature ?? 0.2}
                        onChange={(e) => handleFieldChange('temperature', parseFloat(e.target.value) || 0.2)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] text-[#19221d]"
                      />
                    </div>
                  </div>

                  {/* Error Recovery */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Error Recovery Policy
                    </label>
                    <input
                      type="text"
                      value={config.onError || 'Retry twice, then fallback to local heuristic'}
                      onChange={(e) => handleFieldChange('onError', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>
                </div>
              )}

              {/* 6. CONDITION NODE CONFIGURATION */}
              {isConditionNode && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <FieldLabelWithExpression label="Property to Evaluate" fieldName="property" />
                    <input
                      type="text"
                      value={config.property || '{{$json.status}}'}
                      onChange={(e) => handleFieldChange('property', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">
                      Comparison Operator
                    </label>
                    <select
                      value={config.operator || 'equals'}
                      onChange={(e) => handleFieldChange('operator', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="not_empty">Is Not Empty</option>
                      <option value="greater_than">Is Greater Than</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <FieldLabelWithExpression label="Compare Value" fieldName="compareValue" />
                    <input
                      type="text"
                      value={config.compareValue || 'approved'}
                      onChange={(e) => handleFieldChange('compareValue', e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                    />
                  </div>
                </div>
              )}

              {/* 7. GENERIC / FALLBACK CONFIG FIELDS */}
              {!isEmailNode && !isInfoRetrievalNode && !isTriggerNode && !isDatabaseNode && !isDocReferenceNode && !isAgentNode && !isConditionNode && (
                <div className="space-y-3">
                  {definition?.configFields.map((field) => (
                    <div key={field.name} className="space-y-1">
                      <FieldLabelWithExpression label={field.label} fieldName={field.name} />
                      <input
                        type="text"
                        value={String(config[field.name] ?? field.defaultValue ?? '')}
                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'output' && (
            <div className="space-y-3 text-xs">
              <span className="text-[11px] font-bold text-[#5c6861] uppercase tracking-wider">
                Node Output Data
              </span>

              {isEmailNode && (
                <button
                  type="button"
                  onClick={() => setEmailOutboxOpen(true)}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open Sent Email in Outbox Viewer</span>
                </button>
              )}

              <pre className="p-3 bg-[#f5f2eb] border border-[#ded8cc] rounded-xl text-[11px] font-mono text-[#19221d] overflow-x-auto">
{JSON.stringify(
  isEmailNode
    ? {
        status: 'sent',
        delivery: config.deliveryMode || 'local_outbox',
        recipient: config.toEmail || 'team@company.com',
        sender: config.fromEmail || 'rippika@gmail.com',
        subject: config.subject || 'Executive Brief',
        message: 'Dispatched and saved to AgentOS Outbox',
      }
    : isInfoRetrievalNode
    ? { query: config.query || 'Autonomous AI Workflows', sourcesCount: config.maxResults || 5, results: [{ title: 'Overview', url: 'https://duckduckgo.com' }] }
    : isTriggerNode
    ? { event: 'email_received', sender: 'john@example.com', subject: 'Urgent Q4 review' }
    : isDocReferenceNode
    ? { filesAttached: config.files?.length || 2, extractedTextLength: 4890 }
    : { status: 'success', node: selectedNode.data.label, executedAt: new Date().toISOString() },
  null,
  2
)}
              </pre>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="space-y-2 text-xs text-[#5c6861]">
              <span className="text-[11px] font-bold text-[#5c6861] uppercase tracking-wider">
                Execution Trace
              </span>
              <div className="p-3 bg-[#f5f2eb] rounded-xl font-mono text-[10px] space-y-1">
                <div>[0ms] Resolved node target: {selectedNode.id}</div>
                <div>[14ms] Bound input payload schema: verified</div>
                <div>[32ms] State serialized to workflow store</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action: Save Changes Button */}
      <div className="p-4 border-t border-[#ded8cc]">
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-2.5 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 stroke-[2.5]" /> Changes Applied
            </>
          ) : (
            'Save changes'
          )}
        </button>
      </div>

      {/* Expression Builder Modal */}
      {selectedNode && (
        <ExpressionBuilderModal
          isOpen={isExpressionModalOpen}
          onClose={() => setIsExpressionModalOpen(false)}
          fieldName={activeExpressionField?.name || 'expression'}
          initialValue={activeExpressionField?.value || ''}
          currentNodeId={selectedNode.id}
          onApply={handleApplyExpression}
        />
      )}

      {/* Node Step Testing Modal */}
      {selectedNode && (
        <NodeTestModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          nodeId={selectedNode.id}
          nodeType={selectedNode.data.definitionType}
          nodeLabel={selectedNode.data.label || 'Workflow Node'}
          nodeConfig={config}
        />
      )}
    </aside>
  );
};

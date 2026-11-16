import React, { useState, useEffect } from 'react';
import {
  Mail,
  X,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  Send,
  AlertCircle,
  ShieldCheck,
  Server,
  Key,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';

interface OutboxEmail {
  id: string;
  filename: string;
  subject: string;
  toEmail: string;
  fromEmail: string;
  timestamp: string;
  delivery: string;
  previewSnippet: string;
  sizeBytes: number;
  hasHtml: boolean;
}

export const EmailOutboxModal: React.FC = () => {
  const { isEmailOutboxOpen, setEmailOutboxOpen } = useUIStore();
  const [emails, setEmails] = useState<OutboxEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<OutboxEmail | null>(null);
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'outbox' | 'smtp-test'>('outbox');

  // SMTP Test state
  const [testHost, setTestHost] = useState('smtp.gmail.com');
  const [testPort, setTestPort] = useState(587);
  const [testUser, setTestUser] = useState('');
  const [testPassword, setTestPassword] = useState('');
  const [testToEmail, setTestToEmail] = useState('');
  const [isTestingSMTP, setIsTestingSMTP] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{ success: boolean; message?: string; error?: string; hint?: string } | null>(null);

  const fetchEmails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8005/api/v1/emails');
      if (res.ok) {
        const data: OutboxEmail[] = await res.json();
        setEmails(data);
        if (data.length > 0 && !selectedEmail && data[0]) {
          setSelectedEmail(data[0]);
          loadEmailContent(data[0].filename);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch outbox emails:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmailContent = async (filename: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/emails/${encodeURIComponent(filename)}`);
      if (res.ok) {
        const data = await res.json();
        setEmailHtml(data.html || '');
      }
    } catch (err) {
      console.warn('Failed to load email html:', err);
    }
  };

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://127.0.0.1:8005/api/v1/emails/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      setEmails((prev) => prev.filter((item) => item.filename !== filename));
      if (selectedEmail?.filename === filename) {
        setSelectedEmail(null);
        setEmailHtml('');
      }
    } catch (err) {
      console.warn('Failed to delete email:', err);
    }
  };

  const handleTestSMTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingSMTP(true);
    setSmtpResult(null);

    try {
      const res = await fetch('http://127.0.0.1:8005/api/v1/emails/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: testHost,
          smtpPort: testPort,
          smtpUser: testUser,
          smtpPassword: testPassword,
          toEmail: testToEmail,
          useSSL: testPort === 465,
        }),
      });
      const data = await res.json();
      setSmtpResult(data);
      if (data.success) {
        fetchEmails();
      }
    } catch (err: any) {
      setSmtpResult({ success: false, error: err.message || 'Connection failed' });
    } finally {
      setIsTestingSMTP(false);
    }
  };

  useEffect(() => {
    if (isEmailOutboxOpen) {
      fetchEmails();
    }
  }, [isEmailOutboxOpen]);

  if (!isEmailOutboxOpen) return null;

  const filteredEmails = emails.filter(
    (e) =>
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.toEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.fromEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#ded8cc] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e2d8] bg-[#fbf9f5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-[#19221d]">
                  AgentOS Email Outbox & Dispatcher
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9]">
                  {emails.length} {emails.length === 1 ? 'email' : 'emails'}
                </span>
              </div>
              <p className="text-xs text-[#78857e]">
                View captured agent emails in the simulated local outbox or verify live SMTP dispatch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#ede8df] p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('outbox')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'outbox' ? 'bg-white text-[#19221d] shadow-2xs' : 'text-[#6a7c72] hover:text-[#19221d]'
                }`}
              >
                Dispatched Outbox
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('smtp-test')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'smtp-test' ? 'bg-white text-[#19221d] shadow-2xs' : 'text-[#6a7c72] hover:text-[#19221d]'
                }`}
              >
                SMTP Connection Test
              </button>
            </div>

            <button
              type="button"
              onClick={fetchEmails}
              disabled={isLoading}
              className="p-2 text-[#78857e] hover:text-[#19221d] hover:bg-[#ede8df] rounded-lg transition-colors cursor-pointer"
              title="Refresh outbox"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setEmailOutboxOpen(false)}
              className="p-2 text-[#78857e] hover:text-[#19221d] hover:bg-[#ede8df] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Dispatched Outbox Split View */}
        {activeTab === 'outbox' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar List */}
            <div className="w-80 border-r border-[#e6e2d8] flex flex-col bg-[#fdfcf9]">
              <div className="p-3 border-b border-[#e6e2d8]">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#86948d]" />
                  <input
                    type="text"
                    placeholder="Search subject or recipient..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-[#19221d]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#f0ece2]">
                {filteredEmails.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#86948d] space-y-2">
                    <Mail className="w-8 h-8 text-[#c0b8a8] mx-auto opacity-50" />
                    <div>No dispatched emails found.</div>
                    <p className="text-[11px] text-[#9aa7a0]">
                      Run your workflow with a Send Email node to inspect generated emails here.
                    </p>
                  </div>
                ) : (
                  filteredEmails.map((item) => {
                    const isSelected = selectedEmail?.filename === item.filename;
                    const isSmtp = item.delivery === 'smtp';
                    const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={item.filename}
                        onClick={() => {
                          setSelectedEmail(item);
                          loadEmailContent(item.filename);
                        }}
                        className={`p-3 text-left transition-colors cursor-pointer relative group ${
                          isSelected ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'hover:bg-[#f5f2eb]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#78857e] truncate max-w-[140px]">
                            To: {item.toEmail}
                          </span>
                          <span className="text-[10px] text-[#86948d] shrink-0 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {timeFormatted}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-[#19221d] truncate mb-1">
                          {item.subject}
                        </div>

                        <div className="text-[11px] text-[#6a7c72] line-clamp-2 leading-relaxed mb-2">
                          {item.previewSnippet}
                        </div>

                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              isSmtp ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isSmtp ? 'Live SMTP' : 'Local Outbox'}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(item.filename, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-[#86948d] hover:text-red-600 transition-opacity"
                            title="Delete email"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Selected Email Viewer */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedEmail ? (
                <>
                  {/* Email Meta Header */}
                  <div className="p-4 border-b border-[#e6e2d8] bg-[#faf8f4] flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#19221d]">
                        {selectedEmail.subject}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-[#5c6861] mt-1 font-sans">
                        <span>
                          From: <strong>{selectedEmail.fromEmail}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          To: <strong>{selectedEmail.toEmail}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                          selectedEmail.delivery === 'smtp'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {selectedEmail.delivery === 'smtp' ? 'Sent via Live SMTP' : 'Local Outbox (Captured)'}
                      </span>
                    </div>
                  </div>

                  {/* Rendered Email Body Preview */}
                  <div className="flex-1 p-6 overflow-y-auto bg-[#f8fafc]">
                    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                      <iframe
                        title="Email Preview"
                        srcDoc={emailHtml}
                        className="w-full h-[55vh] border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#86948d]">
                  <Mail className="w-12 h-12 text-[#d4cbba] mb-3 stroke-1" />
                  <h4 className="text-sm font-bold text-[#19221d]">Select an email to view</h4>
                  <p className="text-xs text-[#78857e] max-w-sm mt-1">
                    Emails dispatched by workflow agents are captured here with complete styling, content, and metadata.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SMTP Connection & Test Verification */}
        {activeTab === 'smtp-test' && (
          <div className="flex-1 p-8 overflow-y-auto bg-[#faf8f4]">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#ded8cc] shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-[#19221d] flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Live SMTP Mail Server Configuration & Verification
                </h3>
                <p className="text-xs text-[#6a7c72] mt-1 leading-relaxed">
                  To send real emails to your live inbox (e.g. Gmail, Outlook, or custom company mail server), configure your credentials here. AgentOS uses TLS/SSL authentication to dispatch genuine messages.
                </p>
              </div>

              {/* Gmail Hint Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Using Gmail / Google Workspace?</div>
                  <div className="text-[11px] text-amber-800 leading-relaxed">
                    Google requires a <strong>16-character App Password</strong> rather than your regular account password.
                    Enable 2-Step Verification on your Google Account, then generate an App Password at{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-amber-950 hover:text-black inline-flex items-center gap-0.5"
                    >
                      myaccount.google.com/apppasswords <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    .
                  </div>
                </div>
              </div>

              <form onSubmit={handleTestSMTP} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">SMTP Host *</label>
                    <input
                      type="text"
                      value={testHost}
                      onChange={(e) => setTestHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 text-[#19221d]"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#5c6861]">Port *</label>
                    <input
                      type="number"
                      value={testPort}
                      onChange={(e) => setTestPort(parseInt(e.target.value) || 587)}
                      placeholder="587"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-emerald-600 text-[#19221d]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#5c6861]">SMTP Username / Sender Email *</label>
                  <input
                    type="email"
                    value={testUser}
                    onChange={(e) => setTestUser(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-emerald-600 text-[#19221d]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#5c6861] flex items-center justify-between">
                    <span>SMTP Password / App Password *</span>
                    <span className="text-[10px] text-[#86948d]">Never exposed</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={testPassword}
                      onChange={(e) => setTestPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full pl-3 pr-10 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-emerald-600 text-[#19221d]"
                      required
                    />
                    <Key className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[#86948d]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#5c6861]">Recipient (Send Test Verification To) *</label>
                  <input
                    type="email"
                    value={testToEmail}
                    onChange={(e) => setTestToEmail(e.target.value)}
                    placeholder="yourpersonal@gmail.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-emerald-600 text-[#19221d]"
                    required
                  />
                </div>

                {smtpResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      smtpResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold mb-0.5">
                      {smtpResult.success ? (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          SMTP Authentication Successful!
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-700" />
                          SMTP Connection Failed
                        </>
                      )}
                    </div>
                    <div>{smtpResult.message || smtpResult.error}</div>
                    {smtpResult.hint && <div className="text-[11px] mt-1 text-slate-700">{smtpResult.hint}</div>}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isTestingSMTP}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Send className={`w-3.5 h-3.5 ${isTestingSMTP ? 'animate-pulse' : ''}`} />
                    {isTestingSMTP ? 'Testing Connection...' : 'Verify Connection & Send Test Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

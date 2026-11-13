import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface ExecutionRow {
  id: string;
  workflow: string;
  status: 'Success' | 'Failed';
  duration: string;
  started: string;
  logs: { time: string; msg: string; isError?: boolean }[];
}

const EXECUTION_DATA: ExecutionRow[] = [
  {
    id: 'e-1',
    workflow: 'Research Workflow',
    status: 'Success',
    duration: '42s',
    started: '2m ago',
    logs: [
      { time: '14:32:10', msg: 'Started execution' },
      { time: '14:32:12', msg: 'Gmail trigger received email' },
      { time: '14:32:45', msg: 'Research completed successfully' },
    ],
  },
  {
    id: 'e-2',
    workflow: 'Email Automation',
    status: 'Success',
    duration: '35s',
    started: '5m ago',
    logs: [
      { time: '14:28:00', msg: 'Started execution' },
      { time: '14:28:15', msg: 'Triaged 3 inbox items' },
      { time: '14:28:35', msg: 'Sent replies via Gmail' },
    ],
  },
  {
    id: 'e-3',
    workflow: 'Data Sync',
    status: 'Failed',
    duration: '1m 20s',
    started: '10m ago',
    logs: [
      { time: '14:21:02', msg: 'Started' },
      { time: '14:21:05', msg: 'Fetching rows' },
      { time: '14:22:22', msg: 'Timeout from source API', isError: true },
    ],
  },
  {
    id: 'e-4',
    workflow: 'Report Generator',
    status: 'Success',
    duration: '38s',
    started: '15m ago',
    logs: [
      { time: '14:15:00', msg: 'Started weekly collation' },
      { time: '14:15:38', msg: 'Saved summary to Notion' },
    ],
  },
  {
    id: 'e-5',
    workflow: 'Social Posts',
    status: 'Success',
    duration: '21s',
    started: '32m ago',
    logs: [
      { time: '13:58:10', msg: 'Generated 2 social drafts' },
      { time: '13:58:31', msg: 'Scheduled successfully' },
    ],
  },
];

export const ExecutionsView: React.FC = () => {
  const [selectedExec, setSelectedExec] = useState<ExecutionRow>(EXECUTION_DATA[2]!);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Date/Status Filters */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#19221d] tracking-tight">
              Executions
            </h1>
            <p className="text-xs text-[#6e7d75] mt-1">
              Every run, with status, duration and logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-white border border-[#e4ded3] text-xs font-semibold text-[#19221d] rounded-xl hover:bg-[#f5f2eb] transition-colors"
            >
              Last 24 hours
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-white border border-[#e4ded3] text-xs font-semibold text-[#19221d] rounded-xl hover:bg-[#f5f2eb] transition-colors"
            >
              All status
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-[0_2px_8px_rgba(15,35,25,0.04)]">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Total runs</span>
            <div className="font-display text-3xl font-black text-[#0e2118] mt-2">128</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-[0_2px_8px_rgba(15,35,25,0.04)]">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Success rate</span>
            <div className="font-display text-3xl font-black text-[#15803d] mt-2">99.2%</div>
          </div>
          <div className="bg-white rounded-2xl border border-[#ded8cc] p-5 shadow-[0_2px_8px_rgba(15,35,25,0.04)]">
            <span className="font-sans text-xs font-semibold text-[#6e7f75]">Avg duration</span>
            <div className="font-display text-3xl font-black text-[#0e2118] mt-2">8.2s</div>
          </div>
        </div>

        {/* Table & Inspector Split (Screenshot 4) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Executions Table (2 Cols) */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-[#ded8cc] shadow-[0_2px_8px_rgba(15,35,25,0.04)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#f0ede4] text-[#6e7f75] font-bold">
                <tr>
                  <th className="p-4">Workflow</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2eb]">
                {EXECUTION_DATA.map((row) => {
                  const isSelected = selectedExec.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedExec(row)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#edf7f1]'
                          : 'hover:bg-[#faf8f4]'
                      }`}
                    >
                      <td className="p-4 font-display font-bold text-[#0e2118]">
                        {row.workflow}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] shadow-2xs ${
                            row.status === 'Success'
                              ? 'bg-[#dcfce7] text-[#15803d] border border-[#86efac]/80'
                              : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]/80'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-[#6e7f75]">{row.duration}</td>
                      <td className="p-4 font-medium text-[#6e7f75]">{row.started}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right Log Inspector Card (1 Col, Dark Background, Screenshot 4) */}
          <div className="bg-gradient-to-b from-[#07160e] to-[#0d2319] text-[#e0ece5] rounded-2xl p-5 shadow-[0_12px_36px_rgba(0,0,0,0.22)] border border-[#163d2c] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="font-display text-xs font-bold text-white">
                {selectedExec.workflow}, {selectedExec.status.toLowerCase()}
              </h3>
              <div className="space-y-2 font-mono text-xs text-[#bbf7d0]">
                {selectedExec.logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-[#4ade80]/80">{log.time}</span>
                    <span className={log.isError ? 'text-[#fde047] font-semibold' : ''}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 bg-gradient-to-r from-[#f59e0b] to-[#d97706] hover:from-[#d97706] hover:to-[#b45309] text-white font-black text-xs rounded-xl shadow-[0_2px_12px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Retry run</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


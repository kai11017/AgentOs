import React, { useState } from 'react';
import { Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Profile' | 'API keys' | 'Models' | 'Notifications' | 'Billing'>('Profile');

  const [name, setName] = useState('Rippika N.');
  const [workspace, setWorkspace] = useState('Personal');
  const [model, setModel] = useState('GPT-4o mini');
  const [apiKey, setApiKey] = useState('sk-........................');

  const [failedRunsAlert, setFailedRunsAlert] = useState(true);
  const [weeklySummaryAlert, setWeeklySummaryAlert] = useState(true);
  const [productNewsAlert, setProductNewsAlert] = useState(false);

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: ('Profile' | 'API keys' | 'Models' | 'Notifications' | 'Billing')[] = [
    'Profile',
    'API keys',
    'Models',
    'Notifications',
    'Billing',
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f3ec] p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Save Action */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-black text-[#0e2118] tracking-tight">
              Settings
            </h1>
            <p className="font-sans text-xs text-[#6e7d75] mt-1">
              Manage your workspace, models and alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] text-white font-extrabold text-xs rounded-xl shadow-[0_2px_10px_rgba(21,128,61,0.35)] transition-all cursor-pointer"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save changes</span>
            )}
          </button>
        </div>

        {/* 2-Column Layout: Left Tab Pills + Right Content Cards (Screenshot 8) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* Left Vertical Tab Pills */}
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`w-full py-2.5 px-4 rounded-full text-xs font-semibold text-center transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#19221d] text-white shadow-2xs'
                    : 'bg-white border border-[#ded8cc] text-[#5c6861] hover:bg-[#f5f2eb]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Right Setting Cards */}
          <div className="md:col-span-3 space-y-5">
            {/* 1. Profile Section */}
            <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-[#19221d]">Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#5c6861]">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#5c6861]">
                    Workspace
                  </label>
                  <input
                    type="text"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Default Model Section */}
            <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-4">
              <h2 className="text-xs font-bold text-[#19221d]">Default model</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#5c6861]">
                    Default Model
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#5c6861]">
                    API key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#ded8cc] rounded-xl outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20 text-[#19221d]"
                  />
                </div>
              </div>
            </div>

            {/* 3. Notifications Section with Toggle Switches */}
            <div className="bg-white rounded-2xl border border-[#ded8cc] p-6 shadow-xs space-y-5">
              <h2 className="text-xs font-bold text-[#19221d]">Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#19221d]">
                      Failed runs
                    </h3>
                    <p className="text-[11px] text-[#78857e]">
                      Email me when a workflow fails
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFailedRunsAlert(!failedRunsAlert)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      failedRunsAlert ? 'bg-[#1e4d3a]' : 'bg-[#e4ded3]'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        failedRunsAlert ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#19221d]">
                      Weekly summary
                    </h3>
                    <p className="text-[11px] text-[#78857e]">
                      A digest of runs and success rate
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeeklySummaryAlert(!weeklySummaryAlert)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      weeklySummaryAlert ? 'bg-[#1e4d3a]' : 'bg-[#e4ded3]'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        weeklySummaryAlert ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#19221d]">
                      Product news
                    </h3>
                    <p className="text-[11px] text-[#78857e]">
                      Occasional updates
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductNewsAlert(!productNewsAlert)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      productNewsAlert ? 'bg-[#1e4d3a]' : 'bg-[#e4ded3]'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        productNewsAlert ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


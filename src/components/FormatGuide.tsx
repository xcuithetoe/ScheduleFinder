import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export const FormatGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sampleCsvTemplate = `Math 32,MWF 10:00AM-10:50AM,TuTh 9:30AM-10:45AM
Math 32,Tu 11:00AM-12:00PM,Th 2:00PM-3:00PM,F 9:00AM-9:50AM
CS 61A,MWF 1:00PM-1:50PM,TuTh 2:00PM-3:15PM
CS 61A,Tu 10:00AM-11:15AM,W 10:00AM-11:15AM,F 11:00AM-12:15PM`;

  const copyTemplate = () => {
    navigator.clipboard.writeText(sampleCsvTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden text-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left font-medium text-zinc-800"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-zinc-500" />
          <span>CSV Format Instructions & Time Slot Syntax</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{isOpen ? 'Hide Instructions' : 'View Instructions'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 border-t border-zinc-200 text-zinc-700">
          {/* Row Pairing */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-1.5">1. 0-Indexed Row Pairing Structure</h4>
            <p className="text-xs text-zinc-600 mb-2">
              Each course #n occupies two consecutive rows in the CSV file:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-zinc-100 border border-zinc-200">
                <span className="font-bold text-zinc-900">Row 2n (0, 2, 4...)</span>
                <p className="text-zinc-600 mt-0.5">Lectures for Course #n</p>
              </div>
              <div className="p-2.5 rounded bg-zinc-100 border border-zinc-200">
                <span className="font-bold text-zinc-900">Row 2n + 1 (1, 3, 5...)</span>
                <p className="text-zinc-600 mt-0.5">Discussions for Course #n</p>
              </div>
            </div>
          </div>

          {/* Column Layout */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-1.5">2. Column Layout</h4>
            <ul className="list-disc list-inside text-xs space-y-1 text-zinc-600">
              <li><strong className="text-zinc-800">Column 0:</strong> Course name (e.g. <code className="bg-zinc-100 px-1 py-0.5 rounded">Math 32</code>).</li>
              <li><strong className="text-zinc-800">Columns 1..k:</strong> Available time slots (as many columns as needed).</li>
            </ul>
          </div>

          {/* Standardized Time Slot Syntax */}
          <div>
            <h4 className="font-semibold text-zinc-900 mb-1.5">3. Standardized Time Slot Syntax</h4>
            <div className="p-2.5 bg-zinc-100 border border-zinc-200 rounded font-mono text-xs text-zinc-800">
              &lt;Days&gt; &lt;StartTime&gt;-&lt;EndTime&gt;
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 text-xs">
              <div>
                <p className="font-medium text-zinc-800 mb-1">Acceptable Day Codes:</p>
                <div className="space-y-0.5 text-zinc-600">
                  <p><code className="bg-zinc-100 px-1 rounded">M</code> = Monday, <code className="bg-zinc-100 px-1 rounded">Tu</code> or <code className="bg-zinc-100 px-1 rounded">T</code> = Tuesday</p>
                  <p><code className="bg-zinc-100 px-1 rounded">W</code> = Wednesday, <code className="bg-zinc-100 px-1 rounded">Th</code> or <code className="bg-zinc-100 px-1 rounded">R</code> = Thursday</p>
                  <p><code className="bg-zinc-100 px-1 rounded">F</code> = Friday, <code className="bg-zinc-100 px-1 rounded">Sa</code> = Saturday, <code className="bg-zinc-100 px-1 rounded">Su</code> = Sunday</p>
                  <p>Combinations: <code className="bg-zinc-100 px-1 rounded">MWF</code>, <code className="bg-zinc-100 px-1 rounded">TuTh</code>, <code className="bg-zinc-100 px-1 rounded">MW</code>, <code className="bg-zinc-100 px-1 rounded">TTh</code>, <code className="bg-zinc-100 px-1 rounded">F</code></p>
                </div>
              </div>
              <div>
                <p className="font-medium text-zinc-800 mb-1">Standard Examples:</p>
                <div className="space-y-0.5 font-mono text-zinc-600">
                  <p>MWF 10:00AM-10:50AM</p>
                  <p>TuTh 9:30AM-10:45AM</p>
                  <p>F 1:00PM-2:00PM</p>
                  <p>TuTh 12:30PM-1:45PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sample CSV preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-semibold text-zinc-900">4. Sample CSV Template</h4>
              <button
                onClick={copyTemplate}
                className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 border border-zinc-200 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy CSV'}</span>
              </button>
            </div>
            <pre className="p-3 bg-zinc-900 text-zinc-100 rounded text-xs font-mono overflow-x-auto">
              {sampleCsvTemplate}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

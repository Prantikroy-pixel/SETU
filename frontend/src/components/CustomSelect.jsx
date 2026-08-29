import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options = [] }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-left text-sm font-medium text-slate-900 flex items-center justify-between hover:border-slate-400 transition-colors"
      >
        <span className="flex items-center gap-2">
          {selectedOption?.icon && <span>{selectedOption.icon}</span>}
          <span>{selectedOption?.label || 'Select...'}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-50 max-h-56 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors border-b border-slate-100 last:border-b-0 flex items-center gap-2 ${
                opt.value === value
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {opt.icon && <span>{opt.icon}</span>}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize options into { value, label, icon } shape
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt), icon: null };
    }
    return {
      value: opt.value,
      label: opt.label || String(opt.value),
      icon: opt.icon || null,
    };
  });

  const selectedOption = normalizedOptions.find((o) => String(o.value) === String(value));

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      const currIdx = normalizedOptions.findIndex((o) => String(o.value) === String(value));
      const nextIdx = (currIdx + 1) % normalizedOptions.length;
      handleSelect(normalizedOptions[nextIdx].value);
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      const currIdx = normalizedOptions.findIndex((o) => String(o.value) === String(value));
      const prevIdx = (currIdx - 1 + normalizedOptions.length) % normalizedOptions.length;
      handleSelect(normalizedOptions[prevIdx].value);
    }
  };

  const handleSelect = (optValue) => {
    if (disabled) return;
    if (onChange) {
      onChange({
        target: {
          name: name || '',
          value: optValue,
        },
      });
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative w-full select-none ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-800 transition-all duration-200 cursor-pointer shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
          isOpen ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-sm' : 'border-slate-300'
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && <span className="text-sm shrink-0">{selectedOption.icon}</span>}
          <span className={selectedOption ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-600' : ''
          }`}
        />
      </button>

      {/* Floating Animated Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-xl p-1.5 z-[9999] max-h-60 overflow-y-auto space-y-0.5 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-150 text-left cursor-pointer ${
                  isSelected
                    ? 'bg-primary-50 text-primary-800 font-extrabold border border-primary-200/80 shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="text-sm shrink-0">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

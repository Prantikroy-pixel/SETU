import React from 'react';
import {
  Pill,
  Droplets,
  Utensils,
  Hammer,
  Wheat,
  Package,
  HardHat,
  Boxes,
  HeartPulse,
} from 'lucide-react';

export const STOCK_CATEGORY_CONFIG = {
  medicine: {
    label: 'Medical Supplies',
    icon: Pill,
    bgClass: 'bg-rose-50 border-rose-200/80 text-rose-600',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    color: '#E11D48',
  },
  water: {
    label: 'Drinking Water',
    icon: Droplets,
    bgClass: 'bg-cyan-50 border-cyan-200/80 text-cyan-600',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    color: '#0891B2',
  },
  food: {
    label: 'Food Supplies',
    icon: Utensils,
    bgClass: 'bg-amber-50 border-amber-200/80 text-amber-600',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#D97706',
  },
  construction_material: {
    label: 'Construction & Shelter',
    icon: Hammer,
    bgClass: 'bg-indigo-50 border-indigo-200/80 text-indigo-600',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    color: '#4F46E5',
  },
  agricultural_produce: {
    label: 'Agricultural & Seeds',
    icon: Wheat,
    bgClass: 'bg-emerald-50 border-emerald-200/80 text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#059669',
  },
  other: {
    label: 'Essential Resource',
    icon: Boxes,
    bgClass: 'bg-slate-100 border-slate-200/80 text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    color: '#475569',
  },
};

export default function StockCategoryBadge({ type = 'other', showLabel = true, size = 'md', className = '' }) {
  const normalizedKey = (type || 'other').toLowerCase();
  const config = STOCK_CATEGORY_CONFIG[normalizedKey] || STOCK_CATEGORY_CONFIG.other;
  const IconComponent = config.icon;

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const containerSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className={`${containerSizes[size] || 'w-8 h-8'} rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${config.bgClass}`}
      >
        <IconComponent className={iconSizes[size] || 'w-4 h-4'} />
      </div>
      {showLabel && (
        <span className="font-bold text-slate-800 text-xs truncate">
          {config.label}
        </span>
      )}
    </div>
  );
}

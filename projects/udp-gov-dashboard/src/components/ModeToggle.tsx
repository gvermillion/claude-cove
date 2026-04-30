import React from 'react';
import { Briefcase, Wrench } from 'lucide-react';

export type Mode = 'exec' | 'eng';

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  collapsed?: boolean;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onChange,
  collapsed = false,
}) => {
  const isExec = mode === 'exec';

  if (collapsed) {
    return (
      <div className="mx-3 mb-3 flex flex-col gap-1 rounded-lg border border-white/15 bg-[#0a0a0a] p-1">
        <button
          onClick={() => onChange('exec')}
          aria-label="Switch to Exec mode"
          aria-pressed={isExec}
          className={`flex items-center justify-center rounded-md p-2 transition-colors ${
            isExec
              ? 'bg-red-600 text-white'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <Briefcase size={14} />
        </button>
        <button
          onClick={() => onChange('eng')}
          aria-label="Switch to Engineering mode"
          aria-pressed={!isExec}
          className={`flex items-center justify-center rounded-md p-2 transition-colors ${
            !isExec
              ? 'bg-red-600 text-white'
              : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
        >
          <Wrench size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-3 space-y-1.5">
      <div
        role="group"
        aria-label="Audience mode"
        className="flex h-9 items-center rounded-lg border border-white/15 bg-[#0a0a0a] p-1"
      >
      <button
        onClick={() => onChange('exec')}
        aria-pressed={isExec}
        className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          isExec
            ? 'bg-red-600 text-white shadow-sm shadow-red-900/30'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Briefcase size={12} />
        Exec
      </button>
      <button
        onClick={() => onChange('eng')}
        aria-pressed={!isExec}
        className={`flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          !isExec
            ? 'bg-red-600 text-white shadow-sm shadow-red-900/30'
            : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Wrench size={12} />
        Eng
      </button>
      </div>
      <p className="text-[9px] text-gray-500 text-center leading-tight">
        {isExec
          ? 'Strategic overview for leadership'
          : 'Technical detail for engineers'}
      </p>
    </div>
  );
};

export default ModeToggle;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Square, CheckSquare, Sparkles, Award } from 'lucide-react';

interface InteractiveChecklistProps {
  scanId: string;
  type: 'immediate' | 'prevention';
  items: string[];
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export const InteractiveChecklist: React.FC<InteractiveChecklistProps> = ({
  scanId,
  type,
  items,
  title,
  subtitle,
  icon,
}) => {
  const [checkedState, setCheckedState] = useState<boolean[]>([]);

  // Unique localStorage key for this scan + type combination
  const storageKey = `plant_checklist_${scanId}_${type}`;

  // Initialize checks when scanId, type, or items change
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === items.length) {
          setCheckedState(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse checklist progress:", e);
      }
    }
    // Default to all unchecked
    setCheckedState(new Array(items.length).fill(false));
  }, [scanId, type, items.length]);

  const handleToggle = (index: number) => {
    const updated = [...checkedState];
    updated[index] = !updated[index];
    setCheckedState(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleToggleAll = () => {
    const allChecked = checkedState.every(item => item);
    const updated = new Array(items.length).fill(!allChecked);
    setCheckedState(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const completedCount = checkedState.filter(Boolean).length;
  const isAllCompleted = items.length > 0 && completedCount === items.length;
  const completionPercent = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  if (items.length === 0) {
    return null;
  }

  return (
    <div 
      className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-5 select-none transition-all duration-300" 
      id={`checklist-${type}-panel`}
    >
      {/* Header section with icon, title, progress */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-zinc-900 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-805 flex items-center justify-center text-zinc-400 shrink-0">
            {icon}
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-300">
              {title}
            </h4>
            <span className="text-[10px] text-zinc-500 font-medium">
              {subtitle}
            </span>
          </div>
        </div>

        {/* Circular or pill progress indicator */}
        <div className="flex flex-col items-end shrink-0">
          <span className="text-xs font-mono font-bold text-green-400">
            {completedCount}/{items.length} Done
          </span>
          <span className="text-[9px] font-mono text-zinc-600">
            {Math.round(completionPercent)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden mb-4">
        <motion.div 
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${completionPercent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Checklist list */}
      <div className="space-y-2.5">
        {items.map((item, index) => {
          const isChecked = !!checkedState[index];
          return (
            <div
              key={index}
              onClick={() => handleToggle(index)}
              className={`p-2.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-all duration-150 relative overflow-hidden ${
                isChecked
                  ? 'bg-green-500/5 border-green-500/20 text-zinc-400'
                  : 'bg-zinc-950/50 hover:bg-zinc-900/30 border-zinc-900/80 text-zinc-200'
              }`}
            >
              {/* Ripple hover effect for unfinished items */}
              {!isChecked && (
                <div className="absolute inset-0 bg-white/[0.01] opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              )}

              {/* Checkbox Icon */}
              <div className="mt-0.5 shrink-0 select-none">
                {isChecked ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="text-green-400"
                  >
                    <CheckSquare className="w-4 h-4 fill-green-400/10" />
                  </motion.div>
                ) : (
                  <Square className="w-4 h-4 text-zinc-700 hover:text-zinc-500 transition-colors" />
                )}
              </div>

              {/* Step indicator and Action text */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                  Step 0{index + 1}
                </span>
                <p className={`text-xs leading-relaxed transition-all duration-150 ${
                  isChecked ? 'line-through text-zinc-600 italic' : 'text-zinc-300 font-light'
                }`}>
                  {item}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion feedback banner */}
      <AnimatePresence>
        {isAllCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="mt-4 p-3 bg-green-950/20 border border-green-500/20 rounded-lg flex items-center justify-between gap-3 text-green-400"
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 shrink-0 text-green-400 animate-pulse" />
              <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">
                {type === 'immediate' ? 'RECOVERY REGIMEN OUTLINED' : 'BIOLOGICAL DEFENSES ACTIVE'}
              </span>
            </div>
            <span className="text-[9.5px] font-mono bg-green-500/10 px-2 py-0.5 rounded-md font-bold uppercase truncate">
              Completed
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle All Trigger */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleAll();
          }}
          className="text-[9.5px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors bg-transparent border-0 cursor-pointer uppercase tracking-wider font-semibold"
        >
          {isAllCompleted ? 'Reset All Steps' : 'Mark All As Done'}
        </button>
      </div>
    </div>
  );
};

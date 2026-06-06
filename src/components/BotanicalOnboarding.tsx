import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Camera, 
  Upload, 
  ShieldCheck, 
  HelpCircle, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Activity,
  Layers,
  CheckCircle,
  Eye
} from 'lucide-react';

interface BotanicalOnboardingProps {
  onResetApp: () => void;
  onSelectPresetDemo: () => void;
  onStartCameraDemo: () => void;
  isActive: boolean;
  onClose: () => void;
}

interface Step {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  targetId: string; // DOM element ID to highlight/spotlight
  actionLabel?: string;
  icon: any;
}

export const BotanicalOnboarding: React.FC<BotanicalOnboardingProps> = ({
  onResetApp,
  onSelectPresetDemo,
  onStartCameraDemo,
  isActive,
  onClose
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const steps: Step[] = [
    {
      id: 'welcome',
      title: 'Botanical Diagnostic Guide',
      subtitle: 'Powered by Gemini AI Vision',
      description: 'Welcome to the AI Plant Doctor! This portal analyzes leaf vein structures, necrotic spots, and pigments to discover plant pathogens and provide organic & chemical remedies instantly.',
      targetId: '', // Centered Welcome Modal
      icon: Sparkles
    },
    {
      id: 'upload',
      title: 'Step 1: Upload or Shoot',
      subtitle: 'Gather Leaf Tissue Data',
      description: 'You can tap the "Upload Photo" button or drag-and-drop a file directly into the scanner frame. If you are on a mobile device or have a webcam, click "Use Camera" to capture leaf tissue in real-time!',
      targetId: 'upload-panel-btn',
      icon: Camera
    },
    {
      id: 'presets',
      title: 'Step 2: Instant Test Demos',
      subtitle: 'Simulate with Case Studies',
      description: 'Don\'t have a plant leaf nearby? No problem! Use our Verification Previews to run a mock scan instantly. We have pre-configured diseased and healthy leaf samples ready to demo.',
      targetId: 'preset-card-early_blight',
      icon: Layers
    },
    {
      id: 'hotspots',
      title: 'Step 3: D3 Infrared Hotspots',
      subtitle: 'Analyzing Pathogen Spores',
      description: 'After the high-speed scan completes, a spectacular D3-generated infrared grid overlays directly onto the leaf image showing localized coordinates. Hover over any pulse hotspot to see lesion severity!',
      targetId: 'scan-progress-tracker',
      icon: Eye
    }
  ];

  // Monitor window resize to recalculate spotlight positions dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      window.addEventListener('resize', handleResize);
      handleResize(); // trigger initial size
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Recalculate target spotlight position whenever the step changes
  useEffect(() => {
    if (!isActive) return;

    const currentStep = steps[currentStepIdx];
    
    // Auto-trigger clean states or simulator states based on the step for high-quality interactive UX
    if (currentStep.id === 'welcome' || currentStep.id === 'upload') {
      onResetApp();
    } else if (currentStep.id === 'presets') {
      // Keep it clean
      onResetApp();
    }

    if (!currentStep.targetId) {
      setSpotlightRect(null);
      return;
    }

    // Delay briefly to allow potential UI collapses or renders to settle
    const racyTimeout = setTimeout(() => {
      const element = document.getElementById(currentStep.targetId) || document.querySelector(`#${currentStep.targetId}`);
      if (element) {
        // Scroll the target element into view smoothly if partially out of bounds
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = element.getBoundingClientRect();
        setSpotlightRect(rect);
      } else {
        // Fallback for missing elements (e.g. if specific preset hasn't loaded / was removed)
        if (currentStep.id === 'presets') {
          // spotlight the section header of presets ifTomato preset button is missing
          const fallback = document.querySelector('[class*="Verification Previews"]');
          if (fallback) {
            setSpotlightRect(fallback.getBoundingClientRect());
            return;
          }
        }
        setSpotlightRect(null);
      }
    }, 250);

    return () => clearTimeout(racyTimeout);
  }, [currentStepIdx, isActive, windowSize]);

  if (!isActive) return null;

  const currentStep = steps[currentStepIdx];
  const StepIcon = currentStep.icon;

  const handleNext = () => {
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('plant_onboarding_completed', 'true');
    onClose();
  };

  // SVG parameters for high contrast dark mask overlay with cutout
  const getMaskPath = () => {
    if (!spotlightRect) return '';
    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    
    // Add safety margins to spotlight shape
    const padding = 6;
    const x = spotlightRect.left + scrollX - padding;
    const y = spotlightRect.top + scrollY - padding;
    const w = spotlightRect.width + padding * 2;
    const h = spotlightRect.height + padding * 2;
    const rx = 14;

    // Use absolute body dimensions to capture whole scrolling canvas in the mask
    const pageW = Math.max(document.documentElement.scrollWidth, window.innerWidth);
    const pageH = Math.max(document.documentElement.scrollHeight, window.innerHeight);

    // Compound path syntax: clockwise rect surrounding the whole screen, 
    // counter-clockwise rounded rect for the target cutout hole
    return `M 0,0 
            L ${pageW},0 
            L ${pageW},${pageH} 
            L 0,${pageH} Z 
            M ${x + rx},${y} 
            h ${w - rx * 2} 
            a ${rx},${rx} 0 0 1 ${rx},${rx} 
            v ${h - rx * 2} 
            a ${rx},${rx} 0 0 1 -${rx},${rx} 
            h -${w - rx * 2} 
            a ${rx},${rx} 0 0 1 -${rx},-${rx} 
            v -${h - rx * 2} 
            a ${rx},${rx} 0 0 1 ${rx},-${rx} Z`;
  };

  // Center coordinates of the spotlight
  const getBubblePosition = () => {
    if (!spotlightRect) {
      // Default: Center of viewport
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const
      };
    }

    const scrollX = window.scrollX || 0;
    const scrollY = window.scrollY || 0;
    const padding = 12;

    const elX = spotlightRect.left + scrollX;
    const elY = spotlightRect.top + scrollY;
    const elW = spotlightRect.width;
    const elH = spotlightRect.height;

    // Check if there is enough vertical space above or below
    const spaceBelow = window.innerHeight - (spotlightRect.bottom);
    const spaceAbove = spotlightRect.top;

    if (spaceBelow > 320) {
      // Position below target element
      return {
        top: `${elY + elH + padding}px`,
        left: `${Math.min(window.innerWidth - 380, Math.max(16, elX + elW / 2 - 170))}px`,
        position: 'absolute' as const
      };
    } else if (spaceAbove > 320) {
      // Position above target element
      return {
        top: `${elY - 260 - padding}px`,
        left: `${Math.min(window.innerWidth - 380, Math.max(16, elX + elW / 2 - 170))}px`,
        position: 'absolute' as const
      };
    } else {
      // Side or fallback position
      return {
        top: `${Math.max(16, elY + elH / 2 - 120)}px`,
        left: `${elX > window.innerWidth / 2 ? elX - 360 : elX + elW + padding}px`,
        position: 'absolute' as const
      };
    }
  };

  const maskPathString = getMaskPath();

  return (
    <div 
      className="absolute inset-0 pointer-events-auto"
      style={{ zIndex: 1000 }}
      id="onboarding-guide-portal"
    >
      {/* SVG absolute mask with precise layout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '100vh' }}>
        <path 
          d={maskPathString || `M 0,0 L ${windowSize.width},0 L ${windowSize.width},${windowSize.height} L 0,${windowSize.height} Z`} 
          fill="rgba(5, 5, 5, 0.81)" 
          className="transition-all duration-300 ease-out"
          fillRule="evenodd" 
        />
      </svg>

      {/* Pulse rings around highlighted item if any */}
      {spotlightRect && (
        <div 
          className="absolute border border-green-500 rounded-2xl pointer-events-none animate-pulse-slow shadow-[0_0_24px_rgba(34,197,94,0.3)] transition-all duration-300"
          style={{
            top: `${spotlightRect.top + (window.scrollY || 0) - 8}px`,
            left: `${spotlightRect.left + (window.scrollX || 0) - 8}px`,
            width: `${spotlightRect.width + 16}px`,
            height: `${spotlightRect.height + 16}px`,
            zIndex: 1001
          }}
        >
          <div className="absolute inset-0 border border-green-400/40 rounded-2xl animate-ping opacity-60"></div>
        </div>
      )}

      {/* Onboarding Dialog Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[350px] sm:max-w-[380px] bg-zinc-950 border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-6 rounded-2xl flex flex-col gap-4 text-left z-[1050]"
          style={getBubblePosition()}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 shrink-0">
                <StepIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 font-mono">
                  SYSTEM GUIDE — STEP {currentStepIdx + 1} OF {steps.length}
                </span>
                <h4 className="text-sm font-semibold text-white tracking-tight leading-tight">
                  {currentStep.title}
                </h4>
              </div>
            </div>
            
            <button 
              onClick={handleComplete}
              className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Close System Guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtitle / Category info */}
          <div className="text-[10px] font-mono text-green-500 font-semibold tracking-wider uppercase">
            {currentStep.subtitle}
          </div>

          {/* Body Content */}
          <p className="text-xs text-zinc-300 leading-relaxed font-light">
            {currentStep.description}
          </p>

          {/* Graphical/Illustrative preview content for step 1 & 4 */}
          {currentStep.id === 'welcome' && (
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 text-[10px] text-zinc-400 font-mono flex flex-col gap-1.5 leading-normal">
              <div className="flex items-center gap-2 text-green-400 font-semibold border-b border-zinc-900 pb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DIAGNOSTIC PROCESS INTEGRITY</span>
              </div>
              <div className="flex justify-between">
                <span>ANALYZER METHOD</span>
                <span className="font-bold text-zinc-300">BIO-VISUAL SCANNING</span>
              </div>
              <div className="flex justify-between">
                <span>SENSITIVITY</span>
                <span className="font-bold text-zinc-300">THERMAL GRIDS + SPECTRAL INDEX</span>
              </div>
            </div>
          )}

          {currentStep.id === 'hotspots' && (
            <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-3 text-center">
              <div className="flex gap-2 justify-center mb-2 items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              </div>
              <span className="text-[9px] font-mono text-zinc-400">
                Pulsing infrared circles represent disease core vectors!
              </span>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-zinc-900">
            <button
              onClick={handleComplete}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStepIdx > 0 && (
                <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer rounded-lg flex items-center justify-center"
                  title="Back"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-black font-semibold text-xs transition-all cursor-pointer rounded-lg flex items-center gap-1 overflow-hidden"
              >
                <span>{currentStepIdx === steps.length - 1 ? 'Finish' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

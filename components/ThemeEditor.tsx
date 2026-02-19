import React, { useState, useEffect } from 'react';
import { X, Check, Palette } from 'lucide-react';
import { ThemeConfig } from '../types';

interface ThemeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeConfig;
  onUpdate: (config: ThemeConfig) => void;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
};

// Helper to get current CSS var value
const getCssVar = (name: string) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ isOpen, onClose, config, onUpdate }) => {
  const [color, setColor] = useState('#c084fc'); // Default light purple

  useEffect(() => {
     // Try to init color from current CSS var if open
     if (isOpen) {
         // This is a bit tricky since we store RGB numbers. For now default state is fine.
     }
  }, [isOpen]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setColor(newHex);
    const rgb = hexToRgb(newHex);
    if (rgb) {
        document.documentElement.style.setProperty('--color-primary', rgb);
        // We can also adjust hover slightly darker or lighter
        // For simplicity, just reuse the same or similar
        document.documentElement.style.setProperty('--color-primary-hover', rgb); 
        
        onUpdate({
            ...config,
            primaryColor: rgb
        });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-fade-in">
      <div className="bg-[#0c0c0e] border border-white/10 rounded-t-3xl md:rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative flex flex-col safe-bottom">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Palette size={20} className="text-primary" /> Theme Color
            </h2>
            <p className="text-zinc-500 text-xs mt-1">Pick a color to blend with the void.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center gap-8">
            <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                <div className="w-32 h-32 rounded-full border-4 border-white/10 p-1 bg-black relative overflow-hidden shadow-2xl">
                    <input 
                        type="color" 
                        value={color}
                        onChange={handleColorChange}
                        className="w-[150%] h-[150%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-0 border-0 cursor-pointer bg-transparent"
                    />
                </div>
                <div className="absolute bottom-0 right-0 pointer-events-none">
                     <div className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono text-white">
                         {color.toUpperCase()}
                     </div>
                </div>
            </div>

            <div className="w-full space-y-4">
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                        <Check size={20} />
                    </div>
                    <div className="flex-1">
                        <div className="h-2 w-2/3 bg-zinc-800 rounded-full mb-2"></div>
                        <div className="h-2 w-1/2 bg-zinc-800 rounded-full"></div>
                    </div>
                    <button className="bg-primary text-white text-xs px-3 py-1.5 rounded-lg font-bold">
                        Preview
                    </button>
                </div>
                <p className="text-center text-zinc-600 text-xs">
                    The interface will automatically adapt to your selection.
                </p>
            </div>
        </div>

        <div className="p-4 bg-zinc-950 border-t border-white/5 flex justify-center">
            <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm font-bold">Close</button>
        </div>
      </div>
    </div>
  );
};
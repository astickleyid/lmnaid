import React from 'react';
import { 
  Atom, Swords, Skull, Gamepad2, Ghost, Rocket, Zap, Crown, 
  Diamond, Trophy, Heart, Star, Music, Video, Camera, Code, 
  Terminal, Cpu, Globe, Moon, Sun, Cloud, Anchor, Flame,
  Droplet, Leaf, Snowflake, Eye, Target, Palette
} from 'lucide-react';

export interface PresetIcon {
  id: string;
  icon: React.ReactNode;
  label: string;
  gradient: string;
}

export const PRESET_ICONS: PresetIcon[] = [
  { id: 'fire', icon: <Flame size={24} />, label: 'Inferno', gradient: 'from-orange-500 to-red-600' },
  { id: 'zap', icon: <Zap size={24} />, label: 'Voltage', gradient: 'from-yellow-400 to-orange-500' },
  { id: 'crown', icon: <Crown size={24} />, label: 'Royals', gradient: 'from-yellow-300 to-yellow-600' },
  { id: 'diamond', icon: <Diamond size={24} />, label: 'Premium', gradient: 'from-cyan-400 to-blue-600' },
  { id: 'rocket', icon: <Rocket size={24} />, label: 'Launch', gradient: 'from-blue-500 to-purple-600' },
  { id: 'game', icon: <Gamepad2 size={24} />, label: 'Gaming', gradient: 'from-purple-500 to-pink-500' },
  { id: 'code', icon: <Code size={24} />, label: 'Dev', gradient: 'from-slate-400 to-slate-600' },
  { id: 'terminal', icon: <Terminal size={24} />, label: 'Shell', gradient: 'from-green-400 to-emerald-600' },
  { id: 'swords', icon: <Swords size={24} />, label: 'Combat', gradient: 'from-red-500 to-rose-700' },
  { id: 'ghost', icon: <Ghost size={24} />, label: 'Spirit', gradient: 'from-zinc-400 to-zinc-600' },
  { id: 'skull', icon: <Skull size={24} />, label: 'Danger', gradient: 'from-zinc-500 to-black' },
  { id: 'music', icon: <Music size={24} />, label: 'Vibe', gradient: 'from-pink-400 to-rose-500' },
  { id: 'art', icon: <Palette size={24} />, label: 'Art', gradient: 'from-fuchsia-500 to-purple-600' },
  { id: 'video', icon: <Video size={24} />, label: 'Stream', gradient: 'from-red-500 to-red-600' },
  { id: 'star', icon: <Star size={24} />, label: 'Famous', gradient: 'from-yellow-200 to-yellow-500' },
  { id: 'heart', icon: <Heart size={24} />, label: 'Health', gradient: 'from-pink-500 to-red-500' },
  { id: 'trophy', icon: <Trophy size={24} />, label: 'Winner', gradient: 'from-yellow-400 to-amber-600' },
  { id: 'atom', icon: <Atom size={24} />, label: 'Science', gradient: 'from-blue-400 to-cyan-400' },
  { id: 'globe', icon: <Globe size={24} />, label: 'Global', gradient: 'from-green-400 to-blue-500' },
  { id: 'moon', icon: <Moon size={24} />, label: 'Night', gradient: 'from-indigo-400 to-indigo-900' },
  { id: 'sun', icon: <Sun size={24} />, label: 'Day', gradient: 'from-orange-300 to-yellow-400' },
  { id: 'leaf', icon: <Leaf size={24} />, label: 'Nature', gradient: 'from-green-300 to-green-600' },
  { id: 'water', icon: <Droplet size={24} />, label: 'Hydro', gradient: 'from-blue-400 to-blue-600' },
  { id: 'snow', icon: <Snowflake size={24} />, label: 'Frost', gradient: 'from-cyan-200 to-blue-300' },
  { id: 'eye', icon: <Eye size={24} />, label: 'Vision', gradient: 'from-teal-400 to-emerald-500' },
  { id: 'target', icon: <Target size={24} />, label: 'Focus', gradient: 'from-red-500 to-red-700' },
  { id: 'anchor', icon: <Anchor size={24} />, label: 'Navy', gradient: 'from-blue-700 to-blue-900' },
];
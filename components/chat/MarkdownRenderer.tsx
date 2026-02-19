import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

// Simple markdown parser - no external deps
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Pattern: **bold**, *italic*, `code`, ~~strike~~, [link](url), @mention
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|~~(.+?)~~|\[([^\]]+)\]\(([^)]+)\)|@(\w+))/g;
  let lastIdx = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }
    if (match[2]) nodes.push(<strong key={key++} className="font-bold text-white">{match[2]}</strong>);
    else if (match[3]) nodes.push(<em key={key++} className="italic text-zinc-300">{match[3]}</em>);
    else if (match[4]) nodes.push(<code key={key++} className="bg-[#2b2d31] text-[#e9967a] px-1.5 py-0.5 rounded text-[13px] font-mono">{match[4]}</code>);
    else if (match[5]) nodes.push(<del key={key++} className="text-zinc-500 line-through">{match[5]}</del>);
    else if (match[6] && match[7]) nodes.push(<a key={key++} href={match[7]} target="_blank" rel="noopener" className="text-blue-400 hover:underline">{match[6]}</a>);
    else if (match[8]) nodes.push(<span key={key++} className="bg-[#5865f2]/20 text-[#dee0fc] rounded px-1 font-medium hover:bg-[#5865f2]/30 cursor-pointer">@{match[8]}</span>);
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
  return nodes;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  collapsible?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, collapsible }) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(collapsible);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1e1f22] rounded-lg border border-white/5 my-2 overflow-hidden group/code">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2b2d31] border-b border-white/5">
        <div className="flex items-center gap-2">
          {collapsible && (
            <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-500 hover:text-zinc-300">
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <span className="text-[11px] font-mono text-zinc-500 uppercase">{language || 'text'}</span>
        </div>
        <button onClick={handleCopy} className="text-zinc-500 hover:text-white transition-colors opacity-0 group-hover/code:opacity-100">
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      {!collapsed && (
        <pre className="p-3 overflow-x-auto text-[13px] leading-5 custom-scrollbar">
          <code className="text-[#e2e8f0] font-mono whitespace-pre">{code}</code>
        </pre>
      )}
    </div>
  );
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block ```lang
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(<CodeBlock key={key++} code={codeLines.join('\n')} language={lang} />);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <div key={key++} className="border-l-[3px] border-zinc-500 pl-3 my-1 text-zinc-400 italic">
          {parseInline(line.slice(2))}
        </div>
      );
      i++;
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-white font-bold text-base mt-2 mb-1">{parseInline(line.slice(4))}</h3>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-white font-bold text-lg mt-2 mb-1">{parseInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} className="text-white font-bold text-xl mt-2 mb-1">{parseInline(line.slice(2))}</h1>);
      i++; continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-2">
          <span className="text-zinc-500 mt-0.5">•</span>
          <span>{parseInline(line.slice(2))}</span>
        </div>
      );
      i++; continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\. /);
    if (olMatch) {
      elements.push(
        <div key={key++} className="flex gap-2 ml-2">
          <span className="text-zinc-500 min-w-[1.2em] text-right">{olMatch[1]}.</span>
          <span>{parseInline(line.slice(olMatch[0].length))}</span>
        </div>
      );
      i++; continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={key++} className="border-zinc-700 my-2" />);
      i++; continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
      i++; continue;
    }

    // Normal paragraph
    elements.push(<p key={key++} className="leading-[1.375rem]">{parseInline(line)}</p>);
    i++;
  }

  return <div className={`text-[#dbdee1] text-[15px] whitespace-pre-wrap ${className || ''}`}>{elements}</div>;
};

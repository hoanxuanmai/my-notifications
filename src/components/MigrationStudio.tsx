import React, { useState } from 'react';
import {
  GitBranch,
  ArrowRightLeft,
  Database,
  Radio,
  FileCode,
  Check,
  Copy,
  Sparkles,
  RefreshCw,
  FolderTree,
  ChevronRight,
  ShieldCheck,
  Layers,
  Terminal,
  ExternalLink,
  Zap,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { NESTJS_MIGRATION_FILES } from '../data/mockData';
import { NestJSMigrationItem } from '../types';

export const MigrationStudio: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>(NESTJS_MIGRATION_FILES[0].id);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [customCode, setCustomCode] = useState('');
  const [customType, setCustomType] = useState('controller');
  const [isAiConverting, setIsAiConverting] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'sql' | 'client' | 'edge'>('sql');

  const selectedFile = NESTJS_MIGRATION_FILES.find((f) => f.id === selectedFileId) || NESTJS_MIGRATION_FILES[0];

  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleRunAiConversion = async () => {
    if (!customCode.trim()) return;
    setIsAiConverting(true);
    try {
      const res = await fetch('/api/ai/convert-nestjs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: customCode,
          sourceType: customType,
        }),
      });
      const data = await res.json();
      setAiResult(data);
    } catch (err) {
      console.error('Conversion failed', err);
    } finally {
      setIsAiConverting(false);
    }
  };

  // Pre-load hoanxuanmai/my-notifications repository specific files
  const MY_NOTIFICATIONS_REPO_FILES: { id: string; name: string; path: string; type: string; desc: string }[] = [
    {
      id: 'repo-prisma',
      name: 'schema.prisma',
      path: 'prisma/schema.prisma',
      type: 'Prisma Schema',
      desc: 'PostgreSQL Notification Entity model with recipientId, content, category, readAt, canceledAt',
    },
    {
      id: 'repo-controller',
      name: 'notifications.controller.ts',
      path: 'src/infra/http/controllers/notifications.controller.ts',
      type: 'NestJS Controller',
      desc: 'Endpoints: POST /notifications, GET /from/:recipientId, PATCH /:id/read, PATCH /:id/cancel',
    },
    {
      id: 'repo-send-usecase',
      name: 'send-notification.ts',
      path: 'src/app/use-cases/send-notification.ts',
      type: 'Use Case',
      desc: 'Domain Use Case inserting notification and dispatching to persistence repository',
    },
    {
      id: 'repo-kafka',
      name: 'kafka-consumer.service.ts',
      path: 'src/infra/messaging/kafka/kafka-consumer.service.ts',
      type: 'Kafka Microservice',
      desc: 'Kafka topic listener for distributed notification dispatch -> Supabase Database Webhook',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <GitBranch className="h-3 w-3" />
                hoanxuanmai/my-notifications
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NestJS ➔ Supabase Migration Matrix
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Chuyển đổi NestJS Microservice sang Supabase Architecture
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl">
              Hệ thống hướng dẫn và tự động chuyển đổi toàn bộ kiến trúc (Prisma ORM, NestJS Controllers, Kafka/BullMQ, WebSockets) của repository <strong>my-notifications</strong> sang PostgreSQL RLS, PostgREST và Supabase Realtime.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/hoanxuanmai/my-notifications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>GitHub Repo</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Comparison Grid: What Changes from NestJS to Supabase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Radio className="h-4 w-4" />
            <span>1. WebSockets & Gateway</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-slate-300">
              <strong className="text-rose-400 block mb-0.5">NestJS:</strong>
              @WebSocketGateway + Socket.io Server + Redis Adapter cluster để scale.
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-slate-300">
              <strong className="text-emerald-400 block mb-0.5">Supabase:</strong>
              PostgreSQL Realtime (WAL Replication) qua WebSocket client, tự scale 0-config.
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Database className="h-4 w-4" />
            <span>2. REST API & Controllers</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-slate-300">
              <strong className="text-rose-400 block mb-0.5">NestJS:</strong>
              Controllers + DTOs + JwtAuthGuards + Services + Prisma Client logic.
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-slate-300">
              <strong className="text-emerald-400 block mb-0.5">Supabase:</strong>
              PostgREST tự sinh REST API bảo mật tuyệt đối với Row Level Security (RLS).
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Layers className="h-4 w-4" />
            <span>3. Kafka / Queues & Workers</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-slate-300">
              <strong className="text-rose-400 block mb-0.5">NestJS:</strong>
              Kafka Broker / BullMQ Redis worker chạy server 24/7 tốn RAM & CPU.
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-slate-300">
              <strong className="text-emerald-400 block mb-0.5">Supabase:</strong>
              Database Webhooks + Supabase Edge Functions (Serverless Deno/V8) scale-to-zero.
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Migration Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: File Explorer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <FolderTree className="h-4 w-4 text-emerald-400" />
                <span>Source Files to Convert</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {NESTJS_MIGRATION_FILES.length} modules
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {NESTJS_MIGRATION_FILES.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left p-3 rounded-xl transition border ${
                    selectedFileId === file.id
                      ? 'bg-slate-800 border-emerald-500/40 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      {file.title.split(' ')[0]}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 uppercase font-mono">
                      {file.sourceType}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {file.summary}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* AI Custom File Converter Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-white mb-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>AI NestJS Code Converter</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Paste any custom NestJS file from your repository (Entity, Controller, Guard, Interceptor) to convert it instantly to Supabase SQL and TypeScript SDK.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Component Type</label>
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                >
                  <option value="controller">NestJS Controller (REST/CRUD)</option>
                  <option value="gateway">WebSocket Gateway (Socket.io)</option>
                  <option value="entity">TypeORM / Prisma Entity</option>
                  <option value="service">Service / Repository</option>
                  <option value="queue">BullMQ / Kafka Processor</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">NestJS TypeScript Code</label>
                <textarea
                  rows={4}
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="Paste NestJS class or Prisma schema here..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <button
                onClick={handleRunAiConversion}
                disabled={isAiConverting || !customCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {isAiConverting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Converting with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Convert to Supabase</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Code Viewer & Architectural Comparison */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active File Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedFile.title}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedFile.summary}
                </p>
              </div>
            </div>

            {/* Step-by-Step Migration Guide */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Migration Blueprint (Các bước thực hiện)</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selectedFile.migrationSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-4 w-4 rounded-full bg-slate-800 text-[10px] font-bold text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Architectural Before & After */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs">
                <span className="font-semibold text-rose-400 block mb-1">
                  🔴 NestJS Architecture:
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedFile.architecturalComparison.nestjs}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs">
                <span className="font-semibold text-emerald-400 block mb-1">
                  🟢 Supabase Replacement:
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedFile.architecturalComparison.supabase}
                </p>
              </div>
            </div>
          </div>

          {/* Code Viewer Tab Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              
              {/* Output Type Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
                <button
                  onClick={() => setActiveCodeTab('sql')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    activeCodeTab === 'sql'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                  <span>PostgreSQL DDL & RLS</span>
                </button>
                <button
                  onClick={() => setActiveCodeTab('client')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                    activeCodeTab === 'client'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Supabase JS Client</span>
                </button>
                {selectedFile.edgeFunctionCode && (
                  <button
                    onClick={() => setActiveCodeTab('edge')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                      activeCodeTab === 'edge'
                        ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Edge Function (Deno)</span>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const textToCopy =
                      activeCodeTab === 'sql'
                        ? selectedFile.supabaseSql
                        : activeCodeTab === 'client'
                        ? selectedFile.supabaseClientCode
                        : selectedFile.edgeFunctionCode || '';
                    handleCopy(textToCopy, activeCodeTab);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  {copiedSection === activeCodeTab ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Content Display */}
            <div className="mt-4">
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs overflow-x-auto max-h-[480px]">
                {activeCodeTab === 'sql' && (
                  <pre className="text-emerald-300 leading-relaxed whitespace-pre">
                    {selectedFile.supabaseSql}
                  </pre>
                )}
                {activeCodeTab === 'client' && (
                  <pre className="text-cyan-300 leading-relaxed whitespace-pre">
                    {selectedFile.supabaseClientCode}
                  </pre>
                )}
                {activeCodeTab === 'edge' && selectedFile.edgeFunctionCode && (
                  <pre className="text-amber-300 leading-relaxed whitespace-pre">
                    {selectedFile.edgeFunctionCode}
                  </pre>
                )}
              </div>
            </div>

            {/* Original NestJS Source Code Preview */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">
                  Original NestJS Code for comparison
                </span>
                <button
                  onClick={() => handleCopy(selectedFile.nestCode, 'nest')}
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedSection === 'nest' ? 'Copied' : 'Copy NestJS code'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] text-slate-400 max-h-48 overflow-y-auto whitespace-pre">
                {selectedFile.nestCode}
              </pre>
            </div>
          </div>

          {/* AI Result Card if converted */}
          {aiResult && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    AI Converted Supabase Architecture
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {aiResult.source}
                </span>
              </div>

              {aiResult.sqlSchema && (
                <div>
                  <span className="text-xs font-semibold text-emerald-400 block mb-1">Generated SQL & RLS:</span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                    {aiResult.sqlSchema}
                  </pre>
                </div>
              )}

              {aiResult.supabaseClientCode && (
                <div>
                  <span className="text-xs font-semibold text-cyan-400 block mb-1">Generated Supabase JS Client:</span>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre">
                    {aiResult.supabaseClientCode}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

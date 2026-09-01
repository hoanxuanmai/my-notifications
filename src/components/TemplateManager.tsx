import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Send,
  RefreshCw,
  Tag,
  Radio,
  Layers,
} from 'lucide-react';
import { NotificationTemplate, NotificationCategory, NotificationChannel } from '../types';
import { notificationService } from '../services/notificationService';

interface TemplateManagerProps {
  onUseTemplate?: (template: NotificationTemplate) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ onUseTemplate }) => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>(notificationService.getTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(notificationService.getTemplates()[0] || null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Welcome email and in-app alert for newly invited workspace member');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyCode = (template: NotificationTemplate) => {
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateTemplate = async () => {
    const newTpl: NotificationTemplate = {
      id: `tpl-${Date.now()}`,
      name: 'New Custom Template',
      slug: `custom-event-${Date.now().toString().slice(-4)}`,
      category: 'system',
      defaultChannel: 'in_app',
      titleTemplate: 'Alert: {{event_name}}',
      bodyTemplate: 'Detailed summary for event {{event_name}} on {{environment}}.',
      variables: ['event_name', 'environment'],
      sampleVariables: { event_name: 'Database Backup', environment: 'Production' },
      createdAt: new Date().toISOString(),
    };
    await notificationService.saveTemplate(newTpl);
    setTemplates(notificationService.getTemplates());
    setSelectedTemplate(newTpl);
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationService.deleteTemplate(id);
    const updated = notificationService.getTemplates();
    setTemplates(updated);
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(updated[0] || null);
    }
  };

  const handleGenerateAiTemplate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: aiPrompt,
          category: 'updates',
          channel: 'in_app',
        }),
      });
      const data = await res.json();
      if (data && data.template) {
        const newTpl: NotificationTemplate = {
          id: `tpl-ai-${Date.now()}`,
          name: data.template.name || 'AI Generated Template',
          slug: (data.template.name || 'custom-template').toLowerCase().replace(/\s+/g, '-'),
          category: data.template.category || 'system',
          defaultChannel: data.template.defaultChannel || 'in_app',
          titleTemplate: data.template.titleTemplate || 'Notification: {{event}}',
          bodyTemplate: data.template.bodyTemplate || 'Payload data: {{details}}',
          variables: data.template.variables || ['event', 'details'],
          sampleVariables: data.template.sampleVariables || { event: 'Deploy', details: 'OK' },
          createdAt: new Date().toISOString(),
        };
        await notificationService.saveTemplate(newTpl);
        setTemplates(notificationService.getTemplates());
        setSelectedTemplate(newTpl);
      }
    } catch (err) {
      console.error('Failed to generate template', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <FileText className="h-3 w-3 text-cyan-400" />
                Notification Templates & Variable Interpolation
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Template Registry
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Quản lý các mẫu thông báo (Templates) với các biến động <code>{'{{variable}}'}</code> và tự động sinh bản dịch/mẫu thông báo với Gemini AI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Template Generator Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-white mb-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>AI Template Generator (Gemini Prompt)</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe the notification purpose, variables, and tone..."
            className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={handleGenerateAiTemplate}
            disabled={isAiGenerating || !aiPrompt.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {isAiGenerating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Template</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Templates List & Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Template List */}
        <div className="lg:col-span-5 space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                selectedTemplate?.id === tpl.id
                  ? 'bg-slate-800/90 border-cyan-500/50 shadow-lg'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-2 truncate">
                  <span>{tpl.name}</span>
                </h4>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                    {tpl.defaultChannel || tpl.supportedChannels?.[0] || 'in_app'}
                  </span>
                  <button
                    onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Delete template"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {tpl.bodyTemplate}
              </p>
              <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                {(tpl.variables || []).map((v) => (
                  <span
                    key={v}
                    className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 font-mono border border-slate-800"
                  >
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Template Details & Preview */}
        <div className="lg:col-span-7">
          {selectedTemplate ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectedTemplate.name}
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    Slug: {selectedTemplate.slug}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(selectedTemplate)}
                    className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition"
                    title="Copy Template JSON"
                  >
                    {copiedId === selectedTemplate.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Title Template */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Title Template
                </label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300">
                  {selectedTemplate.titleTemplate}
                </div>
              </div>

              {/* Body Template */}
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Body Template
                </label>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 leading-relaxed">
                  {selectedTemplate.bodyTemplate}
                </div>
              </div>

              {/* Variables List */}
              {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Available Variables
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                    {selectedTemplate.variables.map((v) => (
                      <span
                        key={v}
                        className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered Live Preview with Sample Variables */}
              <div>
                <label className="text-xs font-semibold text-emerald-400 block mb-1">
                  Live Interpolated Render Preview
                </label>
                <div className="p-4 bg-slate-950/90 border border-emerald-500/30 rounded-xl space-y-1.5">
                  <h5 className="text-xs font-bold text-white">
                    {selectedTemplate.titleTemplate?.replace(/\{\{(\w+)\}\}/g, (_, k) => (selectedTemplate.sampleVariables && selectedTemplate.sampleVariables[k]) || `[${k}]`) || 'Untitled'}
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedTemplate.bodyTemplate?.replace(/\{\{(\w+)\}\}/g, (_, k) => (selectedTemplate.sampleVariables && selectedTemplate.sampleVariables[k]) || `[${k}]`) || ''}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {onUseTemplate && (
                <div className="pt-2">
                  <button
                    onClick={() => onUseTemplate(selectedTemplate)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition active:scale-95 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Use in Dispatcher Lab</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-500">
              Select a template to view details or generate one with AI.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

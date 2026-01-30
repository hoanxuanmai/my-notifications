// Utility to parse Slack-like messages or fallback to plain text/JSON

import { Notification } from '@/types';
import React from 'react';
// Simple markdown to JSX for code block and *Key*: Value
function renderMarkdown(text: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let remaining = text;
  let codeBlockRegex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let keyValueRegex = /^\s*\*([\w\s]+)\*:\s*(.+)$/gm;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      // Render key-value lines
      let lastKV = 0;
      let kvMatch;
      while ((kvMatch = keyValueRegex.exec(before)) !== null) {
        if (kvMatch.index > lastKV) {
          elements.push(<span key={elements.length}>{before.slice(lastKV, kvMatch.index)}</span>);
        }
        elements.push(
          <div key={elements.length} className="mb-1">
            <b>{kvMatch[1].trim()}:</b> {kvMatch[2]}
          </div>
        );
        lastKV = kvMatch.index + kvMatch[0].length;
      }
      if (lastKV < before.length) {
        elements.push(<span key={elements.length}>{before.slice(lastKV)}</span>);
      }
    }
    // Code block
    elements.push(
      <pre key={elements.length} className="bg-gray-100 text-xs rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap text-gray-700">
        {match[1]}
      </pre>
    );
    lastIndex = match.index + match[0].length;
  }
  // Text after last code block
  if (lastIndex < text.length) {
    const after = text.slice(lastIndex);
    let lastKV = 0;
    let kvMatch;
    while ((kvMatch = keyValueRegex.exec(after)) !== null) {
      if (kvMatch.index > lastKV) {
        elements.push(<span key={elements.length}>{after.slice(lastKV, kvMatch.index)}</span>);
      }
      elements.push(
        <div key={elements.length} className="mb-1">
          <b>{kvMatch[1].trim()}:</b> {kvMatch[2]}
        </div>
      );
      lastKV = kvMatch.index + kvMatch[0].length;
    }
    if (lastKV < after.length) {
      elements.push(<span key={elements.length}>{after.slice(lastKV)}</span>);
    }
  }
  return elements;
}

export function parseSlackMessage(notification: Notification): string | JSX.Element {
  // Helper to extract traces from message text
  function extractTraces(text: string): { main: string; traces?: string } {
    // Simple heuristic: traces/logs sau dấu xuống dòng đầu tiên hoặc sau "Trace:"/"Stack:"/"Details:"
    const traceMarkers = ["Trace:", "Stack:", "Details:"];
    for (const marker of traceMarkers) {
      const idx = text.indexOf(marker);
      if (idx !== -1) {
        return {
          main: text.slice(0, idx).trim(),
          traces: text.slice(idx).trim(),
        };
      }
    }
    // fallback: tách theo dòng đầu tiên
    const lines = text.split(/\n|\r/);
    if (lines.length > 1) {
      return {
        main: lines[0],
        traces: lines.slice(1).join('\n').trim(),
      };
    }
    return { main: text };
  }


  // Nếu metadata.slack hoặc message là JSON Slack thì parse đẹp
  let slackObj: any = null;
  if (notification.metadata && notification.metadata.slack) {
    slackObj = notification.metadata.slack;
  } else if (typeof notification.message === 'string') {
    try {
      const parsed = JSON.parse(notification.message);
      if (parsed && parsed.attachments && Array.isArray(parsed.attachments)) {
        slackObj = parsed;
      }
    } catch {
      // not JSON
    }
  }

  if (slackObj) {
    const attachment = slackObj.attachments?.[0] || {};
    let message = '';
    if (attachment.text) message += attachment.text + '\n';
    if (attachment.fields && Array.isArray(attachment.fields)) {
      for (const field of attachment.fields) {
        message += `*${field.title || ''}*: ${field.value || ''}\n`;
      }
    }
    if (attachment.fallback && !message) message = attachment.fallback;
    const { main, traces } = extractTraces(message.trim());
    return (
      <>
        {renderMarkdown(main)}
        {traces && renderMarkdown(traces)}
      </>
    );
  }

  // Fallback: plain text, tách traces nếu có
  const { main, traces } = extractTraces(notification.message);
  if (traces) {
    return (
      <>
        {renderMarkdown(main)}
        {renderMarkdown(traces)}
      </>
    );
  }
  return <>{renderMarkdown(notification.message)}</>;
}

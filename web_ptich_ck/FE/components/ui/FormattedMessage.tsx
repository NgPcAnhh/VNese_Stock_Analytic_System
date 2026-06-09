"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

interface TextBlock {
  type: "text";
  content: string;
}

type ContentBlock = TextBlock | TableBlock;

function parseMarkdown(content: string): ContentBlock[] {
  if (!content) return [];
  const lines = content.split("\n");
  const blocks: ContentBlock[] = [];
  let currentTextLines: string[] = [];

  const flushText = () => {
    if (currentTextLines.length > 0) {
      blocks.push({
        type: "text",
        content: currentTextLines.join("\n"),
      });
      currentTextLines = [];
    }
  };

  const isSeparator = (line: string) => {
    const trimmed = line.trim();
    // Must contain at least one pipe and one dash, and only contain pipes, dashes, colons, and spaces
    return trimmed.includes("|") && trimmed.includes("-") && /^[\s|:\-]+$/.test(trimmed);
  };

  const splitCells = (line: string) => {
    const trimmed = line.trim();
    let cells = trimmed.split("|");
    // If the line starts and ends with '|', split('|') will have empty strings at the start and end.
    if (trimmed.startsWith("|")) {
      cells.shift();
    }
    if (trimmed.endsWith("|") && cells.length > 0) {
      cells.pop();
    }
    return cells.map((c) => c.trim());
  };

  let i = 0;
  while (i < lines.length) {
    const currentLine = lines[i];
    // Check if the current line can be a header, and the next line is a separator
    if (i < lines.length - 1 && currentLine.includes("|") && isSeparator(lines[i + 1])) {
      flushText();

      const headerLine = currentLine;
      const headers = splitCells(headerLine);

      const rows: string[][] = [];
      i += 2; // skip header and separator

      // Consume subsequent lines as table rows while they contain pipes
      while (i < lines.length && lines[i].includes("|") && !isSeparator(lines[i])) {
        rows.push(splitCells(lines[i]));
        i++;
      }

      blocks.push({
        type: "table",
        headers,
        rows,
      });
    } else {
      currentTextLines.push(currentLine);
      i++;
    }
  }

  flushText();
  return blocks;
}

function formatInline(line: string) {
  if (!line) return [];
  
  const result: React.ReactNode[] = [];
  let index = 0;
  
  while (index < line.length) {
    const boldIdx = line.indexOf("**", index);
    const codeIdx = line.indexOf("`", index);
    const italicIdx = line.indexOf("*", index);
    
    let minIdx = -1;
    let type: "bold" | "code" | "italic" | null = null;
    let delimLength = 0;
    
    if (boldIdx !== -1 && (minIdx === -1 || boldIdx < minIdx)) {
      minIdx = boldIdx;
      type = "bold";
      delimLength = 2;
    }
    if (codeIdx !== -1 && (minIdx === -1 || codeIdx < minIdx)) {
      minIdx = codeIdx;
      type = "code";
      delimLength = 1;
    }
    if (italicIdx !== -1 && (minIdx === -1 || italicIdx < minIdx)) {
      if (line[italicIdx + 1] !== "*") {
        minIdx = italicIdx;
        type = "italic";
        delimLength = 1;
      }
    }
    
    if (type === null || minIdx === -1) {
      result.push(line.substring(index));
      break;
    }
    
    if (minIdx > index) {
      result.push(line.substring(index, minIdx));
    }
    
    const closingDelim = type === "bold" ? "**" : type === "code" ? "`" : "*";
    const closeIdx = line.indexOf(closingDelim, minIdx + delimLength);
    
    if (closeIdx === -1) {
      result.push(line.substring(minIdx, minIdx + delimLength));
      index = minIdx + delimLength;
    } else {
      const innerText = line.substring(minIdx + delimLength, closeIdx);
      const key = `${minIdx}-${closeIdx}`;
      if (type === "bold") {
        result.push(
          <strong key={key} className="font-semibold text-foreground">
            {innerText}
          </strong>
        );
      } else if (type === "code") {
        result.push(
          <code
            key={key}
            className="rounded bg-neutral-100 dark:bg-neutral-800/80 px-1.5 py-0.5 text-xs font-mono text-rose-500 border border-neutral-200/40 dark:border-neutral-700/30"
          >
            {innerText}
          </code>
        );
      } else if (type === "italic") {
        result.push(
          <em key={key} className="italic text-foreground/90">
            {innerText}
          </em>
        );
      }
      index = closeIdx + delimLength;
    }
  }
  
  return result;
}

export function FormattedMessage({ content, className }: { content: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  const renderTextBlock = (text: string) => {
    const textLines = text.split("\n");
    return textLines.map((line, lineIdx) => {
      const trimmedLine = line.trim();
      
      // Header check (# Header)
      const headerMatch = /^(#{1,6})\s+(.*)/.exec(trimmedLine);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const textContent = headerMatch[2];
        const sizeClass =
          level === 1
            ? "text-lg font-bold mt-4 mb-2"
            : level === 2
            ? "text-base font-semibold mt-3 mb-1.5"
            : "text-sm font-semibold mt-2 mb-1";
        return (
          <div key={lineIdx} className={cn(sizeClass, "text-foreground")}>
            {formatInline(textContent)}
          </div>
        );
      }

      // List item check (- item, * item, 1. item)
      const listMatch = /^([\-\*]|\d+\.)\s+(.*)/.exec(trimmedLine);
      if (listMatch) {
        const marker = listMatch[1];
        const rest = listMatch[2];
        const isNumbered = /^\d/.test(marker);
        return (
          <div key={lineIdx} className={cn(lineIdx > 0 ? "mt-1.5" : "", "pl-5 relative")}>
            <span className="absolute left-1 text-muted-foreground font-medium select-none">
              {isNumbered ? marker : "•"}
            </span>
            <span className="block text-foreground/90">{formatInline(rest)}</span>
          </div>
        );
      }

      // Default line
      return (
        <div key={lineIdx} className={cn(lineIdx > 0 ? "mt-1" : "", "min-h-[1.25rem]")}>
          {line ? formatInline(line) : <br />}
        </div>
      );
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, blockIdx) => {
        if (block.type === "table") {
          return (
            <div
              key={blockIdx}
              className="my-3 overflow-x-auto rounded-xl border border-border/70 bg-card/40 shadow-sm"
            >
              <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-muted/30">
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/10 transition-colors">
                      {block.headers.map((_, hIdx) => (
                        <td
                          key={hIdx}
                          className="px-4 py-2 text-muted-foreground align-top whitespace-pre-line"
                        >
                          {row[hIdx] !== undefined ? row[hIdx] : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        } else {
          return (
            <div key={blockIdx} className="text-foreground/90">
              {renderTextBlock(block.content)}
            </div>
          );
        }
      })}
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Loader2,
  AlertCircle,
  FileText,
  FilePlus,
  FileX,
  FilePen,
  File,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { getElectronAPI, type PRFileChange } from '@/lib/electron';
import { useAppStore } from '@/store/app-store';
import { cn } from '@/lib/utils';

interface FilesTabProps {
  prNumber: number;
}

interface ParsedDiffHunk {
  header: string;
  lines: {
    type: 'context' | 'addition' | 'deletion' | 'header';
    content: string;
    lineNumber?: { old?: number; new?: number };
  }[];
}

interface ParsedFileDiff {
  filePath: string;
  hunks: ParsedDiffHunk[];
  isNew?: boolean;
  isDeleted?: boolean;
  isRenamed?: boolean;
}

function parseDiff(diffText: string): ParsedFileDiff[] {
  if (!diffText) return [];

  const files: ParsedFileDiff[] = [];
  const lines = diffText.split('\n');
  let currentFile: ParsedFileDiff | null = null;
  let currentHunk: ParsedDiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      if (currentFile) {
        if (currentHunk) {
          currentFile.hunks.push(currentHunk);
        }
        files.push(currentFile);
      }
      const match = line.match(/diff --git a\/(.*?) b\/(.*)/);
      currentFile = {
        filePath: match ? match[2] : 'unknown',
        hunks: [],
      };
      currentHunk = null;
      continue;
    }

    if (line.startsWith('new file mode')) {
      if (currentFile) currentFile.isNew = true;
      continue;
    }

    if (line.startsWith('deleted file mode')) {
      if (currentFile) currentFile.isDeleted = true;
      continue;
    }

    if (line.startsWith('rename from') || line.startsWith('rename to')) {
      if (currentFile) currentFile.isRenamed = true;
      continue;
    }

    if (line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
      continue;
    }

    if (line.startsWith('@@')) {
      if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
      }
      const hunkMatch = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      oldLineNum = hunkMatch ? parseInt(hunkMatch[1], 10) : 1;
      newLineNum = hunkMatch ? parseInt(hunkMatch[2], 10) : 1;
      currentHunk = {
        header: line,
        lines: [{ type: 'header', content: line }],
      };
      continue;
    }

    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'addition',
          content: line.substring(1),
          lineNumber: { new: newLineNum },
        });
        newLineNum++;
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'deletion',
          content: line.substring(1),
          lineNumber: { old: oldLineNum },
        });
        oldLineNum++;
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          content: line.substring(1) || '',
          lineNumber: { old: oldLineNum, new: newLineNum },
        });
        oldLineNum++;
        newLineNum++;
      }
    }
  }

  if (currentFile) {
    if (currentHunk) {
      currentFile.hunks.push(currentHunk);
    }
    files.push(currentFile);
  }

  return files;
}

function getFileIcon(changeType: string) {
  switch (changeType?.toUpperCase()) {
    case 'ADDED':
      return <FilePlus className="w-4 h-4 text-green-500" />;
    case 'DELETED':
      return <FileX className="w-4 h-4 text-red-500" />;
    case 'RENAMED':
    case 'COPIED':
      return <File className="w-4 h-4 text-blue-500" />;
    case 'MODIFIED':
    default:
      return <FilePen className="w-4 h-4 text-amber-500" />;
  }
}

export function FilesTab({ prNumber }: FilesTabProps) {
  const [files, setFiles] = useState<PRFileChange[]>([]);
  const [diff, setDiff] = useState<string>('');
  const [additions, setAdditions] = useState(0);
  const [deletions, setDeletions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const { currentProject } = useAppStore();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!currentProject?.path) return;

      setLoading(true);
      setError(null);

      try {
        const api = getElectronAPI();
        if (api.github?.getPRFiles) {
          const result = await api.github.getPRFiles(currentProject.path, prNumber);
          if (isMountedRef.current) {
            if (result.success) {
              setFiles(result.files || []);
              setDiff(result.diff || '');
              setAdditions(result.additions || 0);
              setDeletions(result.deletions || 0);
            } else {
              setError(result.error || 'Failed to fetch files');
            }
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch files');
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchFiles();
  }, [prNumber, currentProject?.path]);

  const parsedDiffs = useMemo(() => parseDiff(diff), [diff]);

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(parsedDiffs.map((d) => d.filePath)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No files changed</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {files.length} {files.length === 1 ? 'file' : 'files'} changed
          </span>
          {additions > 0 && <span className="text-green-500">+{additions}</span>}
          {deletions > 0 && <span className="text-red-500">-{deletions}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Expand all
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* File list with diffs */}
      <div className="space-y-2">
        {parsedDiffs.map((fileDiff) => {
          const file = files.find((f) => f.path === fileDiff.filePath);
          return (
            <FileDiffSection
              key={fileDiff.filePath}
              fileDiff={fileDiff}
              file={file}
              isExpanded={expandedFiles.has(fileDiff.filePath)}
              onToggle={() => toggleFile(fileDiff.filePath)}
            />
          );
        })}

        {/* Files without diff content */}
        {files
          .filter((f) => !parsedDiffs.find((d) => d.filePath === f.path))
          .map((file) => (
            <div key={file.path} className="border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 flex items-center gap-2 bg-card">
                {getFileIcon(file.changeType)}
                <span className="flex-1 text-sm font-mono truncate">{file.path}</span>
                <div className="flex items-center gap-2 text-xs">
                  {file.additions > 0 && <span className="text-green-500">+{file.additions}</span>}
                  {file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

interface FileDiffSectionProps {
  fileDiff: ParsedFileDiff;
  file?: PRFileChange;
  isExpanded: boolean;
  onToggle: () => void;
}

function FileDiffSection({ fileDiff, file, isExpanded, onToggle }: FileDiffSectionProps) {
  const fileAdditions = fileDiff.hunks.reduce(
    (acc, hunk) => acc + hunk.lines.filter((l) => l.type === 'addition').length,
    0
  );
  const fileDeletions = fileDiff.hunks.reduce(
    (acc, hunk) => acc + hunk.lines.filter((l) => l.type === 'deletion').length,
    0
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 text-left bg-card hover:bg-accent/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        {getFileIcon(file?.changeType || 'MODIFIED')}
        <span className="flex-1 text-sm font-mono truncate">{fileDiff.filePath}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {fileDiff.isNew && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
              new
            </span>
          )}
          {fileDiff.isDeleted && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              deleted
            </span>
          )}
          {fileDiff.isRenamed && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
              renamed
            </span>
          )}
          {fileAdditions > 0 && <span className="text-xs text-green-400">+{fileAdditions}</span>}
          {fileDeletions > 0 && <span className="text-xs text-red-400">-{fileDeletions}</span>}
        </div>
      </button>
      {isExpanded && (
        <div className="bg-background border-t border-border max-h-[400px] overflow-y-auto">
          {fileDiff.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex} className="border-b border-border/50 last:border-b-0">
              {hunk.lines.map((line, lineIndex) => (
                <DiffLine
                  key={lineIndex}
                  type={line.type}
                  content={line.content}
                  lineNumber={line.lineNumber}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DiffLineProps {
  type: 'context' | 'addition' | 'deletion' | 'header';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

function DiffLine({ type, content, lineNumber }: DiffLineProps) {
  const bgClass = {
    context: 'bg-transparent',
    addition: 'bg-green-500/10',
    deletion: 'bg-red-500/10',
    header: 'bg-blue-500/10',
  };

  const textClass = {
    context: 'text-foreground/70',
    addition: 'text-green-400',
    deletion: 'text-red-400',
    header: 'text-blue-400',
  };

  const prefix = {
    context: ' ',
    addition: '+',
    deletion: '-',
    header: '',
  };

  if (type === 'header') {
    return (
      <div className={cn('px-2 py-1 font-mono text-xs', bgClass[type], textClass[type])}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn('flex font-mono text-xs', bgClass[type])}>
      <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground select-none border-r border-border/50">
        {lineNumber?.old ?? ''}
      </span>
      <span className="w-12 flex-shrink-0 text-right pr-2 text-muted-foreground select-none border-r border-border/50">
        {lineNumber?.new ?? ''}
      </span>
      <span className={cn('w-4 flex-shrink-0 text-center select-none', textClass[type])}>
        {prefix[type]}
      </span>
      <span className={cn('flex-1 px-2 whitespace-pre-wrap break-all', textClass[type])}>
        {content || '\u00A0'}
      </span>
    </div>
  );
}

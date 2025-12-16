"use client";

import { memo, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KanbanCardDetailLevel } from "@/store/app-store";
import { cn } from "@/lib/utils";
import {
  Search,
  X,
  Minimize2,
  Square,
  Maximize2,
  ImageIcon,
  Archive,
  Loader2,
} from "lucide-react";

interface BoardToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  isCreatingSpec: boolean;
  completedCount: number;
  onShowBoardBackground: () => void;
  onShowCompletedFeatures: () => void;
  kanbanCardDetailLevel: KanbanCardDetailLevel;
  onDetailLevelChange: (level: KanbanCardDetailLevel) => void;
  isMounted: boolean;
}

export const BoardToolbar = memo(function BoardToolbar({
  searchQuery,
  onSearchChange,
  searchInputRef,
  isCreatingSpec,
  completedCount,
  onShowBoardBackground,
  onShowCompletedFeatures,
  kanbanCardDetailLevel,
  onDetailLevelChange,
  isMounted,
}: BoardToolbarProps) {
  return (
    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
      <div className="relative max-w-md flex-1 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search features by keyword..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-12 border-border"
            data-testid="kanban-search-input"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              data-testid="kanban-search-clear"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-brand-500/10 border border-brand-500/30 text-brand-400/70"
              data-testid="kanban-search-hotkey"
            >
              /
            </span>
          )}
        </div>
        {/* Spec Creation Loading Badge */}
        {isCreatingSpec && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-500/10 border border-brand-500/20 shrink-0"
            title="Creating App Specification"
            data-testid="spec-creation-badge"
          >
            <Loader2 className="w-3 h-3 animate-spin text-brand-500 shrink-0" />
            <span className="text-xs font-medium text-brand-500 whitespace-nowrap">
              Creating spec
            </span>
          </div>
        )}
      </div>

      {/* Board Background & Detail Level Controls */}
      {isMounted && (
        <TooltipProvider>
          <div className="flex items-center gap-2 ml-4">
            {/* Board Background Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowBoardBackground}
                  className="h-8 px-2"
                  data-testid="board-background-button"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Board Background Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Completed/Archived Features Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onShowCompletedFeatures}
                  className="h-8 px-2 relative"
                  data-testid="completed-features-button"
                >
                  <Archive className="w-4 h-4" />
                  {completedCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {completedCount > 99 ? "99+" : completedCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Completed Features ({completedCount})</p>
              </TooltipContent>
            </Tooltip>

            {/* Kanban Card Detail Level Toggle */}
            <div
              className="flex items-center rounded-lg bg-secondary border border-border"
              data-testid="kanban-detail-toggle"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDetailLevelChange("minimal")}
                    className={cn(
                      "p-2 rounded-l-lg transition-colors",
                      kanbanCardDetailLevel === "minimal"
                        ? "bg-brand-500/20 text-brand-500"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid="kanban-toggle-minimal"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Minimal - Title & category only</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDetailLevelChange("standard")}
                    className={cn(
                      "p-2 transition-colors",
                      kanbanCardDetailLevel === "standard"
                        ? "bg-brand-500/20 text-brand-500"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid="kanban-toggle-standard"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Standard - Steps & progress</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onDetailLevelChange("detailed")}
                    className={cn(
                      "p-2 rounded-r-lg transition-colors",
                      kanbanCardDetailLevel === "detailed"
                        ? "bg-brand-500/20 text-brand-500"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid="kanban-toggle-detailed"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Detailed - Model, tools & tasks</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      )}
    </div>
  );
});

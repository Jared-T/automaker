"use client";

import { memo, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  pointerWithin,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Feature } from "@/store/app-store";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HotkeyButton } from "@/components/ui/hotkey-button";
import { KanbanColumn } from "../kanban-column";
import { KanbanCard } from "../kanban-card";
import { COLUMNS, ColumnId } from "./constants";
import { Trash2, FastForward, Lightbulb } from "lucide-react";

interface BackgroundSettings {
  imagePath?: string | null;
  imageVersion?: number;
  columnOpacity: number;
  columnBorderEnabled: boolean;
  hideScrollbar: boolean;
  cardOpacity: number;
  cardGlassmorphism: boolean;
  cardBorderEnabled: boolean;
  cardBorderOpacity: number;
}

// Accept either ShortcutKey object or string for flexibility
type ShortcutKeyProp = import("@/store/app-store").ShortcutKey | string;

interface KanbanColumnsProps {
  // Data
  features: Feature[];
  runningAutoTasks: string[];
  featuresWithContext: Set<string>;
  searchQuery: string;
  backgroundSettings: BackgroundSettings;
  projectPath: string;

  // Active drag state
  activeFeature: Feature | null;
  onDragStart: (feature: Feature) => void;
  onDragEnd: () => void;

  // Feature actions - these should be memoized by parent
  onEdit: (feature: Feature) => void;
  onDelete: (featureId: string) => void;
  onViewOutput: (feature: Feature) => void;
  onVerify: (feature: Feature) => void;
  onResume: (feature: Feature) => void;
  onForceStop: (feature: Feature) => void;
  onManualVerify: (feature: Feature) => void;
  onMoveBackToInProgress: (feature: Feature) => void;
  onFollowUp: (feature: Feature) => void;
  onCommit: (feature: Feature) => void;
  onRevert: (feature: Feature) => void;
  onMerge: (feature: Feature) => void;
  onComplete: (feature: Feature) => void;
  onImplement: (feature: Feature) => void;

  // Column actions
  onDeleteAllVerified: () => void;
  onStartNextFeatures: () => void;
  onShowSuggestions: () => void;
  suggestionsCount: number;
  startNextShortcut: ShortcutKeyProp;

  // Drag handler
  onDragEndHandler: (event: DragEndEvent) => void;
}

export const KanbanColumns = memo(function KanbanColumns({
  features,
  runningAutoTasks,
  featuresWithContext,
  searchQuery,
  backgroundSettings,
  projectPath,
  activeFeature,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onViewOutput,
  onVerify,
  onResume,
  onForceStop,
  onManualVerify,
  onMoveBackToInProgress,
  onFollowUp,
  onCommit,
  onRevert,
  onMerge,
  onComplete,
  onImplement,
  onDeleteAllVerified,
  onStartNextFeatures,
  onShowSuggestions,
  suggestionsCount,
  startNextShortcut,
  onDragEndHandler,
}: KanbanColumnsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Custom collision detection that prioritizes columns over cards
  const collisionDetectionStrategy = useCallback((args: Parameters<typeof pointerWithin>[0]) => {
    const pointerCollisions = pointerWithin(args);
    const columnCollisions = pointerCollisions.filter((collision) =>
      COLUMNS.some((col) => col.id === collision.id)
    );

    if (columnCollisions.length > 0) {
      return columnCollisions;
    }

    return rectIntersection(args);
  }, []);

  // Memoize column features map
  const columnFeaturesMap = useMemo(() => {
    const map: Record<ColumnId, Feature[]> = {
      backlog: [],
      in_progress: [],
      waiting_approval: [],
      verified: [],
      completed: [],
    };

    const normalizedQuery = searchQuery.toLowerCase().trim();
    const filteredFeatures = normalizedQuery
      ? features.filter(
          (f) =>
            f.description.toLowerCase().includes(normalizedQuery) ||
            f.category?.toLowerCase().includes(normalizedQuery)
        )
      : features;

    filteredFeatures.forEach((f) => {
      const isRunning = runningAutoTasks.includes(f.id);
      if (isRunning) {
        map.in_progress.push(f);
      } else {
        const status = f.status as ColumnId;
        if (map[status]) {
          map[status].push(f);
        } else {
          map.backlog.push(f);
        }
      }
    });

    // Sort backlog by priority
    map.backlog.sort((a, b) => {
      const aPriority = a.priority ?? 999;
      const bPriority = b.priority ?? 999;
      return aPriority - bPriority;
    });

    return map;
  }, [features, runningAutoTasks, searchQuery]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const feature = features.find((f) => f.id === active.id);
    if (feature) {
      onDragStart(feature);
    }
  }, [features, onDragStart]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    onDragEnd();
    onDragEndHandler(event);
  }, [onDragEnd, onDragEndHandler]);

  // Build background image style if image exists
  const backgroundImageStyle = backgroundSettings.imagePath
    ? {
        backgroundImage: `url(${
          process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3008"
        }/api/fs/image?path=${encodeURIComponent(
          backgroundSettings.imagePath
        )}&projectPath=${encodeURIComponent(projectPath)}${
          backgroundSettings.imageVersion
            ? `&v=${backgroundSettings.imageVersion}`
            : ""
        })`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : {};

  return (
    <div
      className="flex-1 overflow-x-auto px-4 pb-4 relative"
      style={backgroundImageStyle}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 h-full min-w-max py-1">
          {COLUMNS.map((column) => {
            const columnFeatures = columnFeaturesMap[column.id];
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                colorClass={column.colorClass}
                count={columnFeatures.length}
                opacity={backgroundSettings.columnOpacity}
                showBorder={backgroundSettings.columnBorderEnabled}
                hideScrollbar={backgroundSettings.hideScrollbar}
                headerAction={
                  column.id === "verified" && columnFeatures.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={onDeleteAllVerified}
                      data-testid="delete-all-verified-button"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete All
                    </Button>
                  ) : column.id === "backlog" ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 relative"
                        onClick={onShowSuggestions}
                        title="Feature Suggestions"
                        data-testid="feature-suggestions-button"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        {suggestionsCount > 0 && (
                          <span
                            className="absolute -top-1 -right-1 w-4 h-4 text-[9px] font-mono rounded-full bg-yellow-500 text-black flex items-center justify-center"
                            data-testid="suggestions-count"
                          >
                            {suggestionsCount}
                          </span>
                        )}
                      </Button>
                      {columnFeatures.length > 0 && (
                        <HotkeyButton
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          onClick={onStartNextFeatures}
                          hotkey={startNextShortcut}
                          hotkeyActive={false}
                          data-testid="start-next-button"
                        >
                          <FastForward className="w-3 h-3 mr-1" />
                          Make
                        </HotkeyButton>
                      )}
                    </div>
                  ) : undefined
                }
              >
                <SortableContext
                  items={columnFeatures.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnFeatures.map((feature, index) => {
                    // Calculate shortcut key for in-progress cards
                    let shortcutKey: string | undefined;
                    if (column.id === "in_progress" && index < 10) {
                      shortcutKey = index === 9 ? "0" : String(index + 1);
                    }
                    const isRunning = runningAutoTasks.includes(feature.id);
                    return (
                      <KanbanCard
                        key={feature.id}
                        feature={feature}
                        onEdit={() => onEdit(feature)}
                        onDelete={() => onDelete(feature.id)}
                        onViewOutput={() => onViewOutput(feature)}
                        onVerify={() => onVerify(feature)}
                        onResume={() => onResume(feature)}
                        onForceStop={() => onForceStop(feature)}
                        onManualVerify={() => onManualVerify(feature)}
                        onMoveBackToInProgress={() => onMoveBackToInProgress(feature)}
                        onFollowUp={() => onFollowUp(feature)}
                        onCommit={() => onCommit(feature)}
                        onRevert={() => onRevert(feature)}
                        onMerge={() => onMerge(feature)}
                        onComplete={() => onComplete(feature)}
                        onImplement={() => onImplement(feature)}
                        hasContext={featuresWithContext.has(feature.id)}
                        isCurrentAutoTask={isRunning}
                        shortcutKey={shortcutKey}
                        opacity={backgroundSettings.cardOpacity}
                        glassmorphism={backgroundSettings.cardGlassmorphism}
                        cardBorderEnabled={backgroundSettings.cardBorderEnabled}
                        cardBorderOpacity={backgroundSettings.cardBorderOpacity}
                      />
                    );
                  })}
                </SortableContext>
              </KanbanColumn>
            );
          })}
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
          }}
        >
          {activeFeature && (
            <Card className="w-72 rotate-2 shadow-2xl shadow-black/25 border-primary/50 bg-card/95 backdrop-blur-sm transition-transform">
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium line-clamp-2">
                  {activeFeature.description}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {activeFeature.category}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
});

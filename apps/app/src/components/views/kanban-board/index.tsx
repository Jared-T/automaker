"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  useAppStore,
  Feature,
  defaultBackgroundSettings,
} from "@/store/app-store";
import { getElectronAPI } from "@/lib/electron";
import { RefreshCw } from "lucide-react";
import {
  useKeyboardShortcuts,
  useKeyboardShortcutsConfig,
  KeyboardShortcut,
} from "@/hooks/use-keyboard-shortcuts";
import { useWindowState } from "@/hooks/use-window-state";
import { useAutoMode } from "@/hooks/use-auto-mode";
import { toast } from "sonner";

// Components
import { BoardHeader } from "./board-header";
import { BoardToolbar } from "./board-toolbar";
import { KanbanColumns } from "./kanban-columns";
import { AddFeatureDialog } from "./add-feature-dialog";
import { EditFeatureDialog } from "./edit-feature-dialog";
import { FollowUpDialog } from "./follow-up-dialog";
import { CompletedFeaturesModal } from "./completed-features-modal";
import { DeleteAllVerifiedDialog } from "./delete-all-verified-dialog";
import { AgentOutputModal } from "../agent-output-modal";
import { FeatureSuggestionsDialog } from "../feature-suggestions-dialog";
import { BoardBackgroundModal } from "@/components/dialogs/board-background-modal";

// Hooks
import { useBoardActions } from "./use-board-actions";

export function BoardView() {
  const {
    currentProject,
    features,
    setFeatures,
    updateFeature,
    maxConcurrency,
    setMaxConcurrency,
    useWorktrees,
    kanbanCardDetailLevel,
    setKanbanCardDetailLevel,
    boardBackgroundByProject,
    specCreatingForProject,
    setSpecCreatingForProject,
  } = useAppStore();

  const shortcuts = useKeyboardShortcutsConfig();
  const { isMaximized } = useWindowState();
  const autoMode = useAutoMode();
  const runningAutoTasks = autoMode.runningTasks;

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
  const [featuresWithContext, setFeaturesWithContext] = useState<Set<string>>(new Set());
  const [persistedCategories, setPersistedCategories] = useState<string[]>([]);

  // Dialog states - just open/close, no form data
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [followUpFeature, setFollowUpFeature] = useState<Feature | null>(null);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showDeleteAllVerifiedDialog, setShowDeleteAllVerifiedDialog] = useState(false);
  const [showBoardBackgroundModal, setShowBoardBackgroundModal] = useState(false);
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [outputFeature, setOutputFeature] = useState<Feature | null>(null);
  const [showSuggestionsDialog, setShowSuggestionsDialog] = useState(false);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  const [featureSuggestions, setFeatureSuggestions] = useState<
    import("@/lib/electron").FeatureSuggestion[]
  >([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevProjectPathRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Derive spec creation state
  const isCreatingSpec = specCreatingForProject === currentProject?.path;

  // Hydration fix
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Make current project available globally for modal
  useEffect(() => {
    if (currentProject) {
      (window as unknown as { __currentProject: typeof currentProject | null }).__currentProject = currentProject;
    }
    return () => {
      (window as unknown as { __currentProject: typeof currentProject | null }).__currentProject = null;
    };
  }, [currentProject]);

  // Get unique categories for autocomplete
  const categorySuggestions = useMemo(() => {
    const featureCategories = features.map((f) => f.category).filter(Boolean);
    const allCategories = [...featureCategories, ...persistedCategories];
    return [...new Set(allCategories)].sort();
  }, [features, persistedCategories]);

  // Load features
  const loadFeatures = useCallback(async () => {
    if (!currentProject) return;

    const currentPath = currentProject.path;
    const previousPath = prevProjectPathRef.current;
    const isProjectSwitch = previousPath !== null && currentPath !== previousPath;

    if (isProjectSwitch) {
      console.log(`[BoardView] Project switch detected: ${previousPath} -> ${currentPath}`);
      isInitialLoadRef.current = true;
    }

    prevProjectPathRef.current = currentPath;

    if (isInitialLoadRef.current) {
      setIsLoading(true);
    }

    try {
      const api = getElectronAPI();
      if (!api.features) {
        console.error("[BoardView] Features API not available");
        return;
      }

      const result = await api.features.getAll(currentProject.path);

      if (result.success && result.features) {
        const featuresWithIds = (result.features as unknown as Record<string, unknown>[]).map((f, index) => ({
          ...f,
          id: (f.id as string) || `feature-${index}-${Date.now()}`,
          status: (f.status as Feature["status"]) || "backlog",
          startedAt: f.startedAt as string | undefined,
          model: (f.model as Feature["model"]) || "opus",
          thinkingLevel: (f.thinkingLevel as Feature["thinkingLevel"]) || "none",
        })) as Feature[];
        setFeatures(featuresWithIds);

        if (isProjectSwitch) {
          setPersistedCategories([]);
        }
      } else if (!result.success && result.error) {
        console.error("[BoardView] API returned error:", result.error);
        if (isProjectSwitch) {
          setFeatures([]);
          setPersistedCategories([]);
        }
      }
    } catch (error) {
      console.error("Failed to load features:", error);
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [currentProject, setFeatures]);

  // Load persisted categories
  const loadCategories = useCallback(async () => {
    if (!currentProject) return;

    try {
      const api = getElectronAPI();
      const result = await api.readFile(
        `${currentProject.path}/.automaker/categories.json`
      );

      if (result.success && result.content) {
        const parsed = JSON.parse(result.content);
        if (Array.isArray(parsed)) {
          setPersistedCategories(parsed);
        }
      } else {
        setPersistedCategories([]);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      setPersistedCategories([]);
    }
  }, [currentProject]);

  // Save category
  const saveCategory = useCallback(async (category: string) => {
    if (!currentProject || !category.trim()) return;

    try {
      const api = getElectronAPI();
      const categories: string[] = [...persistedCategories];

      if (!categories.includes(category)) {
        categories.push(category);
        categories.sort();

        await api.writeFile(
          `${currentProject.path}/.automaker/categories.json`,
          JSON.stringify(categories, null, 2)
        );

        setPersistedCategories(categories);
      }
    } catch (error) {
      console.error("Failed to save category:", error);
    }
  }, [currentProject, persistedCategories]);

  // Persist feature update
  const persistFeatureUpdate = useCallback(async (featureId: string, updates: Partial<Feature>) => {
    if (!currentProject) return;

    try {
      const api = getElectronAPI();
      if (!api.features) {
        console.error("[BoardView] Features API not available");
        return;
      }

      const result = await api.features.update(currentProject.path, featureId, updates);
      if (result.success && result.feature) {
        updateFeature(result.feature.id, result.feature);
      }
    } catch (error) {
      console.error("Failed to persist feature update:", error);
    }
  }, [currentProject, updateFeature]);

  // Persist feature create
  const persistFeatureCreate = useCallback(async (feature: Feature) => {
    if (!currentProject) return;

    try {
      const api = getElectronAPI();
      if (!api.features) {
        console.error("[BoardView] Features API not available");
        return;
      }

      const result = await api.features.create(currentProject.path, feature);
      if (result.success && result.feature) {
        updateFeature(result.feature.id, result.feature);
      }
    } catch (error) {
      console.error("Failed to persist feature creation:", error);
    }
  }, [currentProject, updateFeature]);

  // Persist feature delete
  const persistFeatureDelete = useCallback(async (featureId: string) => {
    if (!currentProject) return;

    try {
      const api = getElectronAPI();
      if (!api.features) {
        console.error("[BoardView] Features API not available");
        return;
      }

      await api.features.delete(currentProject.path, featureId);
    } catch (error) {
      console.error("Failed to persist feature deletion:", error);
    }
  }, [currentProject]);

  // Board actions hook
  const actions = useBoardActions({
    projectPath: currentProject?.path || "",
    features,
    runningAutoTasks,
    loadFeatures,
    persistFeatureUpdate,
    persistFeatureCreate,
    persistFeatureDelete,
    saveCategory,
    useWorktrees,
  });

  // Check context exists
  const checkContextExists = useCallback(async (featureId: string): Promise<boolean> => {
    if (!currentProject) return false;

    try {
      const api = getElectronAPI();
      if (!api?.autoMode?.contextExists) {
        return false;
      }

      const result = await api.autoMode.contextExists(currentProject.path, featureId);
      return result.success && result.exists === true;
    } catch (error) {
      console.error("[Board] Error checking context:", error);
      return false;
    }
  }, [currentProject]);

  // Load features on mount and project change
  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Subscribe to spec regeneration events
  useEffect(() => {
    const api = getElectronAPI();
    if (!api.specRegeneration) return;

    const unsubscribe = api.specRegeneration.onEvent((event) => {
      if (event.projectPath !== specCreatingForProject) return;

      if (event.type === "spec_regeneration_complete") {
        setSpecCreatingForProject(null);
        if (currentProject && event.projectPath === currentProject.path) {
          loadFeatures();
        }
      } else if (event.type === "spec_regeneration_error") {
        setSpecCreatingForProject(null);
      }
    });

    return () => unsubscribe();
  }, [specCreatingForProject, setSpecCreatingForProject, currentProject, loadFeatures]);

  // Listen for suggestions events
  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.suggestions) return;

    const unsubscribe = api.suggestions.onEvent((event) => {
      if (event.type === "suggestions_complete" && event.suggestions) {
        setSuggestionsCount(event.suggestions.length);
        setFeatureSuggestions(event.suggestions);
        setIsGeneratingSuggestions(false);
      } else if (event.type === "suggestions_error") {
        setIsGeneratingSuggestions(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for auto mode events
  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.autoMode || !currentProject) return;

    const { removeRunningTask } = useAppStore.getState();
    const projectId = currentProject.id;

    const unsubscribe = api.autoMode.onEvent((event) => {
      const eventProjectId = ("projectId" in event && event.projectId) || projectId;

      if (event.type === "auto_mode_feature_complete") {
        console.log("[Board] Feature completed, reloading features...");
        loadFeatures();
        const { muteDoneSound } = useAppStore.getState();
        if (!muteDoneSound) {
          const audio = new Audio("/sounds/ding.mp3");
          audio.play().catch((err) => console.warn("Could not play ding sound:", err));
        }
      } else if (event.type === "auto_mode_error") {
        console.log("[Board] Feature error, reloading features...", event.error);

        if (event.featureId) {
          removeRunningTask(eventProjectId, event.featureId);
        }

        loadFeatures();

        const isAuthError =
          event.errorType === "authentication" ||
          (event.error &&
            (event.error.includes("Authentication failed") ||
              event.error.includes("Invalid API key")));

        if (isAuthError) {
          toast.error("Authentication Failed", {
            description:
              "Your API key is invalid or expired. Please check Settings or run 'claude login' in terminal.",
            duration: 10000,
          });
        } else {
          toast.error("Agent encountered an error", {
            description: event.error || "Check the logs for details",
          });
        }
      }
    });

    return unsubscribe;
  }, [loadFeatures, currentProject]);

  // Sync running tasks on mount
  useEffect(() => {
    if (!currentProject) return;

    const syncRunningTasks = async () => {
      try {
        const api = getElectronAPI();
        if (!api?.autoMode?.status) return;

        const projectId = currentProject.id;
        const { clearRunningTasks, addRunningTask, getAutoModeState, maxConcurrency } =
          useAppStore.getState();

        const persistedState = getAutoModeState(projectId);
        const userWantsAutoModeOn = persistedState.isRunning;

        const status = await api.autoMode.status(currentProject.path);
        if (status.success) {
          if (status.runningFeatures) {
            console.log("[Board] Syncing running tasks from backend:", status.runningFeatures);
            clearRunningTasks(projectId);
            status.runningFeatures.forEach((featureId: string) => {
              addRunningTask(projectId, featureId);
            });
          }

          const isBackendRunning = status.autoLoopRunning ?? status.isRunning ?? false;
          console.log("[Board] Backend auto mode running:", isBackendRunning, "User preference:", userWantsAutoModeOn);

          if (userWantsAutoModeOn && !isBackendRunning) {
            console.log("[Board] Restoring auto mode for project:", currentProject.path);
            const startResult = await api.autoMode.start(currentProject.path, maxConcurrency);
            if (!startResult.success) {
              console.error("[Board] Failed to restore auto mode:", startResult.error);
              useAppStore.getState().setAutoModeRunning(projectId, false);
            }
          }
        }
      } catch (error) {
        console.error("[Board] Failed to sync running tasks:", error);
      }
    };

    syncRunningTasks();
  }, [currentProject]);

  // Check context for features
  useEffect(() => {
    const checkAllContexts = async () => {
      const featuresWithPotentialContext = features.filter(
        (f) =>
          f.status === "in_progress" ||
          f.status === "waiting_approval" ||
          f.status === "verified"
      );
      const contextChecks = await Promise.all(
        featuresWithPotentialContext.map(async (f) => ({
          id: f.id,
          hasContext: await checkContextExists(f.id),
        }))
      );

      const newSet = new Set<string>();
      contextChecks.forEach(({ id, hasContext }) => {
        if (hasContext) {
          newSet.add(id);
        }
      });

      setFeaturesWithContext(newSet);
    };

    if (features.length > 0 && !isLoading) {
      checkAllContexts();
    }
  }, [features, isLoading, checkContextExists]);

  // Completed features
  const completedFeatures = useMemo(() => {
    return features.filter((f) => f.status === "completed");
  }, [features]);

  // In-progress features for shortcuts
  const inProgressFeaturesForShortcuts = useMemo(() => {
    return features.filter((f) => {
      const isRunning = runningAutoTasks.includes(f.id);
      return isRunning || f.status === "in_progress";
    });
  }, [features, runningAutoTasks]);

  // Keyboard shortcuts
  const boardShortcuts: KeyboardShortcut[] = useMemo(() => {
    const shortcutsList: KeyboardShortcut[] = [
      {
        key: shortcuts.addFeature,
        action: () => setShowAddDialog(true),
        description: "Add new feature",
      },
      {
        key: shortcuts.startNext,
        action: () => actions.handleStartNextFeatures(),
        description: "Start next features from backlog",
      },
      {
        key: "/",
        action: () => searchInputRef.current?.focus(),
        description: "Focus search input",
      },
    ];

    inProgressFeaturesForShortcuts.slice(0, 10).forEach((feature, index) => {
      const key = index === 9 ? "0" : String(index + 1);
      shortcutsList.push({
        key,
        action: () => {
          setOutputFeature(feature);
          setShowOutputModal(true);
        },
        description: `View output for in-progress card ${index + 1}`,
      });
    });

    return shortcutsList;
  }, [inProgressFeaturesForShortcuts, shortcuts, actions]);

  useKeyboardShortcuts(boardShortcuts);

  // Handle output modal number key press
  const handleOutputModalNumberKeyPress = useCallback((key: string) => {
    const index = key === "0" ? 9 : parseInt(key, 10) - 1;
    const targetFeature = inProgressFeaturesForShortcuts[index];

    if (!targetFeature) return;

    if (targetFeature.id === outputFeature?.id) {
      setShowOutputModal(false);
    } else {
      setOutputFeature(targetFeature);
    }
  }, [inProgressFeaturesForShortcuts, outputFeature?.id]);

  // Memoized handlers for KanbanColumns
  const handleViewOutput = useCallback((feature: Feature) => {
    setOutputFeature(feature);
    setShowOutputModal(true);
  }, []);

  const handleOpenFollowUp = useCallback((feature: Feature) => {
    setFollowUpFeature(feature);
  }, []);

  const handleSendFollowUp = useCallback((featureId: string, prompt: string, imagePaths: string[]) => {
    actions.handleSendFollowUp(featureId, prompt, imagePaths);
    setFollowUpFeature(null);
  }, [actions]);

  // Background settings
  const backgroundSettings = useMemo(() => {
    return (currentProject && boardBackgroundByProject[currentProject.path]) || defaultBackgroundSettings;
  }, [currentProject, boardBackgroundByProject]);

  // Render states
  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="board-view-no-project">
        <p className="text-muted-foreground">No project selected</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="board-view-loading">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden content-bg relative" data-testid="board-view">
      {/* Header */}
      <BoardHeader
        projectName={currentProject.name}
        maxConcurrency={maxConcurrency}
        onMaxConcurrencyChange={setMaxConcurrency}
        isAutoModeRunning={autoMode.isRunning}
        onStartAutoMode={autoMode.start}
        onStopAutoMode={autoMode.stop}
        onAddFeature={() => setShowAddDialog(true)}
        addFeatureShortcut={shortcuts.addFeature}
        isMounted={isMounted}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <BoardToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
          isCreatingSpec={isCreatingSpec}
          completedCount={completedFeatures.length}
          onShowBoardBackground={() => setShowBoardBackgroundModal(true)}
          onShowCompletedFeatures={() => setShowCompletedModal(true)}
          kanbanCardDetailLevel={kanbanCardDetailLevel}
          onDetailLevelChange={setKanbanCardDetailLevel}
          isMounted={isMounted}
        />

        {/* Kanban Columns */}
        <KanbanColumns
          features={features}
          runningAutoTasks={runningAutoTasks}
          featuresWithContext={featuresWithContext}
          searchQuery={searchQuery}
          backgroundSettings={backgroundSettings}
          projectPath={currentProject.path}
          activeFeature={activeFeature}
          onDragStart={setActiveFeature}
          onDragEnd={() => setActiveFeature(null)}
          onEdit={setEditingFeature}
          onDelete={actions.handleDeleteFeature}
          onViewOutput={handleViewOutput}
          onVerify={actions.handleVerifyFeature}
          onResume={actions.handleResumeFeature}
          onForceStop={actions.handleForceStopFeature}
          onManualVerify={actions.handleManualVerify}
          onMoveBackToInProgress={actions.handleMoveBackToInProgress}
          onFollowUp={handleOpenFollowUp}
          onCommit={actions.handleCommitFeature}
          onRevert={actions.handleRevertFeature}
          onMerge={actions.handleMergeFeature}
          onComplete={actions.handleCompleteFeature}
          onImplement={actions.handleStartImplementation}
          onDeleteAllVerified={() => setShowDeleteAllVerifiedDialog(true)}
          onStartNextFeatures={actions.handleStartNextFeatures}
          onShowSuggestions={() => setShowSuggestionsDialog(true)}
          suggestionsCount={suggestionsCount}
          startNextShortcut={shortcuts.startNext}
          onDragEndHandler={actions.handleDragEnd}
        />
      </div>

      {/* Dialogs - Isolated components with their own state */}
      <AddFeatureDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={actions.handleAddFeature}
        categorySuggestions={categorySuggestions}
        isMaximized={isMaximized}
      />

      <EditFeatureDialog
        feature={editingFeature}
        onClose={() => setEditingFeature(null)}
        onSave={actions.handleUpdateFeature}
        categorySuggestions={categorySuggestions}
        isMaximized={isMaximized}
      />

      <FollowUpDialog
        feature={followUpFeature}
        onClose={() => setFollowUpFeature(null)}
        onSend={handleSendFollowUp}
        isMaximized={isMaximized}
      />

      <CompletedFeaturesModal
        open={showCompletedModal}
        onOpenChange={setShowCompletedModal}
        features={completedFeatures}
        onUnarchive={actions.handleUnarchiveFeature}
        onDelete={actions.handleDeleteFeature}
      />

      <DeleteAllVerifiedDialog
        open={showDeleteAllVerifiedDialog}
        onOpenChange={setShowDeleteAllVerifiedDialog}
        verifiedCount={features.filter((f) => f.status === "verified").length}
        onConfirm={actions.handleDeleteAllVerified}
      />

      <BoardBackgroundModal
        open={showBoardBackgroundModal}
        onOpenChange={setShowBoardBackgroundModal}
      />

      <AgentOutputModal
        open={showOutputModal}
        onClose={() => setShowOutputModal(false)}
        featureDescription={outputFeature?.description || ""}
        featureId={outputFeature?.id || ""}
        featureStatus={outputFeature?.status}
        onNumberKeyPress={handleOutputModalNumberKeyPress}
      />

      <FeatureSuggestionsDialog
        open={showSuggestionsDialog}
        onClose={() => setShowSuggestionsDialog(false)}
        projectPath={currentProject.path}
        suggestions={featureSuggestions}
        setSuggestions={(suggestions) => {
          setFeatureSuggestions(suggestions);
          setSuggestionsCount(suggestions.length);
        }}
        isGenerating={isGeneratingSuggestions}
        setIsGenerating={setIsGeneratingSuggestions}
      />
    </div>
  );
}

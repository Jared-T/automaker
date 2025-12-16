"use client";

import { useCallback } from "react";
import { DragEndEvent } from "@dnd-kit/core";
import { Feature, useAppStore } from "@/store/app-store";
import { getElectronAPI } from "@/lib/electron";
import { useAutoMode } from "@/hooks/use-auto-mode";
import { toast } from "sonner";
import { COLUMNS, ColumnId } from "./constants";

interface UseBoardActionsProps {
  projectPath: string;
  features: Feature[];
  runningAutoTasks: string[];
  loadFeatures: () => Promise<void>;
  persistFeatureUpdate: (featureId: string, updates: Partial<Feature>) => Promise<void>;
  persistFeatureCreate: (feature: Feature) => Promise<void>;
  persistFeatureDelete: (featureId: string) => Promise<void>;
  saveCategory: (category: string) => Promise<void>;
  useWorktrees: boolean;
}

export function useBoardActions({
  projectPath,
  features,
  runningAutoTasks,
  loadFeatures,
  persistFeatureUpdate,
  persistFeatureCreate,
  persistFeatureDelete,
  saveCategory,
  useWorktrees,
}: UseBoardActionsProps) {
  const {
    updateFeature,
    moveFeature,
    addFeature,
    removeFeature,
    maxConcurrency,
  } = useAppStore();
  const autoMode = useAutoMode();

  // Run a feature
  const handleRunFeature = useCallback(async (feature: Feature) => {
    if (!projectPath) return;

    try {
      const api = getElectronAPI();
      if (!api?.autoMode) {
        console.error("Auto mode API not available");
        return;
      }

      const result = await api.autoMode.runFeature(
        projectPath,
        feature.id,
        useWorktrees
      );

      if (result.success) {
        console.log("[Board] Feature run started successfully");
      } else {
        console.error("[Board] Failed to run feature:", result.error);
        await loadFeatures();
      }
    } catch (error) {
      console.error("[Board] Error running feature:", error);
      await loadFeatures();
    }
  }, [projectPath, useWorktrees, loadFeatures]);

  // Start implementing a feature from backlog
  const handleStartImplementation = useCallback(async (feature: Feature) => {
    if (!autoMode.canStartNewTask) {
      toast.error("Concurrency limit reached", {
        description: `You can only have ${autoMode.maxConcurrency} task${
          autoMode.maxConcurrency > 1 ? "s" : ""
        } running at a time. Wait for a task to complete or increase the limit.`,
      });
      return false;
    }

    const updates = {
      status: "in_progress" as const,
      startedAt: new Date().toISOString(),
    };
    updateFeature(feature.id, updates);
    persistFeatureUpdate(feature.id, updates);
    console.log("[Board] Feature moved to in_progress, starting agent...");
    await handleRunFeature(feature);
    return true;
  }, [autoMode.canStartNewTask, autoMode.maxConcurrency, updateFeature, persistFeatureUpdate, handleRunFeature]);

  // Verify a feature (TDD)
  const handleVerifyFeature = useCallback(async (feature: Feature) => {
    if (!projectPath) return;

    console.log("[Board] Verifying feature:", feature.id);

    try {
      const api = getElectronAPI();
      if (!api?.autoMode) {
        console.error("Auto mode API not available");
        return;
      }

      const result = await api.autoMode.verifyFeature(projectPath, feature.id);

      if (result.success) {
        console.log("[Board] Feature verification started successfully");
      } else {
        console.error("[Board] Failed to verify feature:", result.error);
        await loadFeatures();
      }
    } catch (error) {
      console.error("[Board] Error verifying feature:", error);
      await loadFeatures();
    }
  }, [projectPath, loadFeatures]);

  // Resume a feature with context
  const handleResumeFeature = useCallback(async (feature: Feature) => {
    if (!projectPath) return;

    console.log("[Board] Resuming feature:", feature.id);

    try {
      const api = getElectronAPI();
      if (!api?.autoMode) {
        console.error("Auto mode API not available");
        return;
      }

      const result = await api.autoMode.resumeFeature(projectPath, feature.id);

      if (result.success) {
        console.log("[Board] Feature resume started successfully");
      } else {
        console.error("[Board] Failed to resume feature:", result.error);
        await loadFeatures();
      }
    } catch (error) {
      console.error("[Board] Error resuming feature:", error);
      await loadFeatures();
    }
  }, [projectPath, loadFeatures]);

  // Manual verify (for skipTests features)
  const handleManualVerify = useCallback((feature: Feature) => {
    console.log("[Board] Manually verifying feature:", feature.id);
    moveFeature(feature.id, "verified");
    persistFeatureUpdate(feature.id, {
      status: "verified",
      justFinishedAt: undefined,
    });
    toast.success("Feature verified", {
      description: `Marked as verified: ${feature.description.slice(0, 50)}${
        feature.description.length > 50 ? "..." : ""
      }`,
    });
  }, [moveFeature, persistFeatureUpdate]);

  // Move back to in_progress (for skipTests features)
  const handleMoveBackToInProgress = useCallback((feature: Feature) => {
    console.log("[Board] Moving feature back to in_progress:", feature.id);
    const updates = {
      status: "in_progress" as const,
      startedAt: new Date().toISOString(),
    };
    updateFeature(feature.id, updates);
    persistFeatureUpdate(feature.id, updates);
    toast.info("Feature moved back", {
      description: `Moved back to In Progress: ${feature.description.slice(0, 50)}${
        feature.description.length > 50 ? "..." : ""
      }`,
    });
  }, [updateFeature, persistFeatureUpdate]);

  // Commit feature
  const handleCommitFeature = useCallback(async (feature: Feature) => {
    if (!projectPath) return;

    console.log("[Board] Committing feature:", feature.id);

    try {
      const api = getElectronAPI();
      if (!api?.autoMode?.commitFeature) {
        console.error("Commit feature API not available");
        toast.error("Commit not available", {
          description: "This feature is not available in the current version.",
        });
        return;
      }

      const result = await api.autoMode.commitFeature(projectPath, feature.id);

      if (result.success) {
        console.log("[Board] Feature committed successfully");
        moveFeature(feature.id, "verified");
        persistFeatureUpdate(feature.id, { status: "verified" });
        toast.success("Feature committed", {
          description: `Committed and verified: ${feature.description.slice(0, 50)}${
            feature.description.length > 50 ? "..." : ""
          }`,
        });
      } else {
        console.error("[Board] Failed to commit feature:", result.error);
        toast.error("Failed to commit feature", {
          description: result.error || "An error occurred",
        });
        await loadFeatures();
      }
    } catch (error) {
      console.error("[Board] Error committing feature:", error);
      toast.error("Failed to commit feature", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
      await loadFeatures();
    }
  }, [projectPath, moveFeature, persistFeatureUpdate, loadFeatures]);

  // Revert feature
  const handleRevertFeature = useCallback(async (feature: Feature) => {
    if (!projectPath) return;

    console.log("[Board] Reverting feature:", feature.id);

    try {
      const api = getElectronAPI();
      if (!api?.worktree?.revertFeature) {
        console.error("Worktree API not available");
        toast.error("Revert not available", {
          description: "This feature is not available in the current version.",
        });
        return;
      }

      const result = await api.worktree.revertFeature(projectPath, feature.id);

      if (result.success) {
        console.log("[Board] Feature reverted successfully");
        await loadFeatures();
        toast.success("Feature reverted", {
          description: `All changes discarded. Moved back to backlog: ${feature.description.slice(0, 50)}${
            feature.description.length > 50 ? "..." : ""
          }`,
        });
      } else {
        console.error("[Board] Failed to revert feature:", result.error);
        toast.error("Failed to revert feature", {
          description: result.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("[Board] Error reverting feature:", error);
      toast.error("Failed to revert feature", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }, [projectPath, loadFeatures]);

  // Merge feature
  const handleMergeFeature = useCallback(async (feature: Feature) => {
    if (!projectPath) return;

    console.log("[Board] Merging feature:", feature.id);

    try {
      const api = getElectronAPI();
      if (!api?.worktree?.mergeFeature) {
        console.error("Worktree API not available");
        toast.error("Merge not available", {
          description: "This feature is not available in the current version.",
        });
        return;
      }

      const result = await api.worktree.mergeFeature(projectPath, feature.id);

      if (result.success) {
        console.log("[Board] Feature merged successfully");
        await loadFeatures();
        toast.success("Feature merged", {
          description: `Changes merged to main branch: ${feature.description.slice(0, 50)}${
            feature.description.length > 50 ? "..." : ""
          }`,
        });
      } else {
        console.error("[Board] Failed to merge feature:", result.error);
        toast.error("Failed to merge feature", {
          description: result.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("[Board] Error merging feature:", error);
      toast.error("Failed to merge feature", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }, [projectPath, loadFeatures]);

  // Complete feature (archive)
  const handleCompleteFeature = useCallback((feature: Feature) => {
    console.log("[Board] Completing feature:", feature.id);
    const updates = { status: "completed" as const };
    updateFeature(feature.id, updates);
    persistFeatureUpdate(feature.id, updates);
    toast.success("Feature completed", {
      description: `Archived: ${feature.description.slice(0, 50)}${
        feature.description.length > 50 ? "..." : ""
      }`,
    });
  }, [updateFeature, persistFeatureUpdate]);

  // Unarchive feature
  const handleUnarchiveFeature = useCallback((feature: Feature) => {
    console.log("[Board] Unarchiving feature:", feature.id);
    const updates = { status: "verified" as const };
    updateFeature(feature.id, updates);
    persistFeatureUpdate(feature.id, updates);
    toast.success("Feature restored", {
      description: `Moved back to verified: ${feature.description.slice(0, 50)}${
        feature.description.length > 50 ? "..." : ""
      }`,
    });
  }, [updateFeature, persistFeatureUpdate]);

  // Delete feature
  const handleDeleteFeature = useCallback(async (featureId: string) => {
    const feature = features.find((f) => f.id === featureId);
    if (!feature) return;

    const isRunning = runningAutoTasks.includes(featureId);

    if (isRunning) {
      try {
        await autoMode.stopFeature(featureId);
        toast.success("Agent stopped", {
          description: `Stopped and deleted: ${feature.description.slice(0, 50)}${
            feature.description.length > 50 ? "..." : ""
          }`,
        });
      } catch (error) {
        console.error("[Board] Error stopping feature before delete:", error);
        toast.error("Failed to stop agent", {
          description: "The feature will still be deleted.",
        });
      }
    }

    // Delete attached images
    if (feature.imagePaths && feature.imagePaths.length > 0) {
      try {
        const api = getElectronAPI();
        for (const imagePathObj of feature.imagePaths) {
          try {
            await api.deleteFile(imagePathObj.path);
            console.log(`[Board] Deleted image: ${imagePathObj.path}`);
          } catch (error) {
            console.error(`[Board] Failed to delete image ${imagePathObj.path}:`, error);
          }
        }
      } catch (error) {
        console.error(`[Board] Error deleting images for feature ${featureId}:`, error);
      }
    }

    removeFeature(featureId);
    persistFeatureDelete(featureId);
  }, [features, runningAutoTasks, autoMode, removeFeature, persistFeatureDelete]);

  // Force stop feature
  const handleForceStopFeature = useCallback(async (feature: Feature) => {
    try {
      await autoMode.stopFeature(feature.id);

      const targetStatus =
        feature.skipTests && feature.status === "waiting_approval"
          ? "waiting_approval"
          : "backlog";

      if (targetStatus !== feature.status) {
        moveFeature(feature.id, targetStatus);
        persistFeatureUpdate(feature.id, { status: targetStatus });
      }

      toast.success("Agent stopped", {
        description:
          targetStatus === "waiting_approval"
            ? `Stopped commit - returned to waiting approval: ${feature.description.slice(0, 50)}${
                feature.description.length > 50 ? "..." : ""
              }`
            : `Stopped working on: ${feature.description.slice(0, 50)}${
                feature.description.length > 50 ? "..." : ""
              }`,
      });
    } catch (error) {
      console.error("[Board] Error stopping feature:", error);
      toast.error("Failed to stop agent", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  }, [autoMode, moveFeature, persistFeatureUpdate]);

  // Start next features from backlog
  const handleStartNextFeatures = useCallback(async () => {
    const backlogFeatures = features.filter((f) => f.status === "backlog");
    const availableSlots = maxConcurrency - runningAutoTasks.length;

    if (availableSlots <= 0) {
      toast.error("Concurrency limit reached", {
        description: `You can only have ${maxConcurrency} task${
          maxConcurrency > 1 ? "s" : ""
        } running at a time. Wait for a task to complete or increase the limit.`,
      });
      return;
    }

    if (backlogFeatures.length === 0) {
      toast.info("No features in backlog", {
        description: "Add features to the backlog first.",
      });
      return;
    }

    const featuresToStart = backlogFeatures.slice(0, 1);

    for (const feature of featuresToStart) {
      const updates = {
        status: "in_progress" as const,
        startedAt: new Date().toISOString(),
      };
      updateFeature(feature.id, updates);
      persistFeatureUpdate(feature.id, updates);
      await handleRunFeature(feature);
    }

    toast.success(
      `Started ${featuresToStart.length} feature${featuresToStart.length > 1 ? "s" : ""}`,
      {
        description: featuresToStart
          .map((f) => f.description.slice(0, 30) + (f.description.length > 30 ? "..." : ""))
          .join(", "),
      }
    );
  }, [features, maxConcurrency, runningAutoTasks.length, updateFeature, persistFeatureUpdate, handleRunFeature]);

  // Add feature - accepts the form data from AddFeatureDialog
  const handleAddFeature = useCallback((featureData: Omit<Feature, "id" | "status">) => {
    const createdFeature = addFeature({
      ...featureData,
      status: "backlog",
    });
    persistFeatureCreate(createdFeature);
    if (featureData.category) {
      saveCategory(featureData.category);
    }
  }, [addFeature, persistFeatureCreate, saveCategory]);

  // Update feature
  const handleUpdateFeature = useCallback((featureId: string, updates: Partial<Feature>) => {
    updateFeature(featureId, updates);
    persistFeatureUpdate(featureId, updates);
    if (updates.category) {
      saveCategory(updates.category);
    }
  }, [updateFeature, persistFeatureUpdate, saveCategory]);

  // Send follow-up
  const handleSendFollowUp = useCallback(async (
    featureId: string,
    prompt: string,
    imagePaths: string[]
  ) => {
    if (!projectPath) return;

    const feature = features.find((f) => f.id === featureId);
    if (!feature) return;

    console.log("[Board] Sending follow-up prompt for feature:", featureId);

    const api = getElectronAPI();
    if (!api?.autoMode?.followUpFeature) {
      console.error("Follow-up feature API not available");
      toast.error("Follow-up not available", {
        description: "This feature is not available in the current version.",
      });
      return;
    }

    // Move feature back to in_progress
    const updates = {
      status: "in_progress" as const,
      startedAt: new Date().toISOString(),
      justFinishedAt: undefined,
    };
    updateFeature(featureId, updates);
    persistFeatureUpdate(featureId, updates);

    toast.success("Follow-up started", {
      description: `Continuing work on: ${feature.description.slice(0, 50)}${
        feature.description.length > 50 ? "..." : ""
      }`,
    });

    // Call API in background
    api.autoMode
      .followUpFeature(projectPath, featureId, prompt, imagePaths)
      .catch((error) => {
        console.error("[Board] Error sending follow-up:", error);
        toast.error("Failed to send follow-up", {
          description: error instanceof Error ? error.message : "An error occurred",
        });
        loadFeatures();
      });
  }, [projectPath, features, updateFeature, persistFeatureUpdate, loadFeatures]);

  // Delete all verified
  const handleDeleteAllVerified = useCallback(async () => {
    const verifiedFeatures = features.filter((f) => f.status === "verified");

    for (const feature of verifiedFeatures) {
      const isRunning = runningAutoTasks.includes(feature.id);

      if (isRunning) {
        try {
          await autoMode.stopFeature(feature.id);
        } catch (error) {
          console.error("[Board] Error stopping feature before delete:", error);
        }
      }

      removeFeature(feature.id);
      persistFeatureDelete(feature.id);
    }

    toast.success("All verified features deleted", {
      description: `Deleted ${verifiedFeatures.length} feature(s).`,
    });
  }, [features, runningAutoTasks, autoMode, removeFeature, persistFeatureDelete]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const featureId = active.id as string;
    const overId = over.id as string;

    const draggedFeature = features.find((f) => f.id === featureId);
    if (!draggedFeature) return;

    const isRunningTask = runningAutoTasks.includes(featureId);

    // Check if dragging is allowed
    if (
      draggedFeature.status !== "backlog" &&
      draggedFeature.status !== "waiting_approval" &&
      draggedFeature.status !== "verified"
    ) {
      if (!draggedFeature.skipTests || isRunningTask) {
        console.log("[Board] Cannot drag feature - TDD feature or currently running");
        return;
      }
    }

    let targetStatus: ColumnId | null = null;

    const column = COLUMNS.find((c) => c.id === overId);
    if (column) {
      targetStatus = column.id;
    } else {
      const overFeature = features.find((f) => f.id === overId);
      if (overFeature) {
        targetStatus = overFeature.status as ColumnId;
      }
    }

    if (!targetStatus) return;
    if (targetStatus === draggedFeature.status) return;

    // Handle different drag scenarios
    if (draggedFeature.status === "backlog") {
      if (targetStatus === "in_progress") {
        handleStartImplementation(draggedFeature);
      } else {
        moveFeature(featureId, targetStatus);
        persistFeatureUpdate(featureId, { status: targetStatus });
      }
    } else if (draggedFeature.status === "waiting_approval") {
      if (targetStatus === "verified") {
        moveFeature(featureId, "verified");
        persistFeatureUpdate(featureId, { status: "verified", justFinishedAt: undefined });
        toast.success("Feature verified", {
          description: `Manually verified: ${draggedFeature.description.slice(0, 50)}${
            draggedFeature.description.length > 50 ? "..." : ""
          }`,
        });
      } else if (targetStatus === "backlog") {
        moveFeature(featureId, "backlog");
        persistFeatureUpdate(featureId, { status: "backlog", justFinishedAt: undefined });
        toast.info("Feature moved to backlog", {
          description: `Moved to Backlog: ${draggedFeature.description.slice(0, 50)}${
            draggedFeature.description.length > 50 ? "..." : ""
          }`,
        });
      }
    } else if (draggedFeature.skipTests) {
      if (targetStatus === "verified" && draggedFeature.status === "in_progress") {
        moveFeature(featureId, "verified");
        persistFeatureUpdate(featureId, { status: "verified" });
        toast.success("Feature verified", {
          description: `Marked as verified: ${draggedFeature.description.slice(0, 50)}${
            draggedFeature.description.length > 50 ? "..." : ""
          }`,
        });
      } else if (targetStatus === "waiting_approval" && draggedFeature.status === "verified") {
        moveFeature(featureId, "waiting_approval");
        persistFeatureUpdate(featureId, { status: "waiting_approval" });
        toast.info("Feature moved back", {
          description: `Moved back to Waiting Approval: ${draggedFeature.description.slice(0, 50)}${
            draggedFeature.description.length > 50 ? "..." : ""
          }`,
        });
      } else if (targetStatus === "backlog") {
        moveFeature(featureId, "backlog");
        persistFeatureUpdate(featureId, { status: "backlog" });
        toast.info("Feature moved to backlog", {
          description: `Moved to Backlog: ${draggedFeature.description.slice(0, 50)}${
            draggedFeature.description.length > 50 ? "..." : ""
          }`,
        });
      }
    } else if (draggedFeature.status === "verified") {
      if (targetStatus === "waiting_approval") {
        moveFeature(featureId, "waiting_approval");
        persistFeatureUpdate(featureId, { status: "waiting_approval" });
        toast.info("Feature moved back", {
          description: `Moved back to Waiting Approval: ${draggedFeature.description.slice(0, 50)}${
            draggedFeature.description.length > 50 ? "..." : ""
          }`,
        });
      } else if (targetStatus === "backlog") {
        moveFeature(featureId, "backlog");
        persistFeatureUpdate(featureId, { status: "backlog" });
        toast.info("Feature moved to backlog", {
          description: `Moved to Backlog: ${draggedFeature.description.slice(0, 50)}${
            draggedFeature.description.length > 50 ? "..." : ""
          }`,
        });
      }
    }
  }, [features, runningAutoTasks, moveFeature, persistFeatureUpdate, handleStartImplementation]);

  return {
    handleRunFeature,
    handleStartImplementation,
    handleVerifyFeature,
    handleResumeFeature,
    handleManualVerify,
    handleMoveBackToInProgress,
    handleCommitFeature,
    handleRevertFeature,
    handleMergeFeature,
    handleCompleteFeature,
    handleUnarchiveFeature,
    handleDeleteFeature,
    handleForceStopFeature,
    handleStartNextFeatures,
    handleAddFeature,
    handleUpdateFeature,
    handleSendFollowUp,
    handleDeleteAllVerified,
    handleDragEnd,
  };
}

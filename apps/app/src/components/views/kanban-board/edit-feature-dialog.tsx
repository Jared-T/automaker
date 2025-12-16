"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { HotkeyButton } from "@/components/ui/hotkey-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryAutocomplete } from "@/components/ui/category-autocomplete";
import {
  DescriptionImageDropZone,
  FeatureImagePath as DescriptionImagePath,
  ImagePreviewMap,
} from "@/components/ui/description-image-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useAppStore,
  Feature,
  AgentModel,
  ThinkingLevel,
} from "@/store/app-store";
import { cn, modelSupportsThinking } from "@/lib/utils";
import {
  Plus,
  FlaskConical,
  MessageSquare,
  Settings2,
  Brain,
  UserCircle,
} from "lucide-react";
import { CLAUDE_MODELS, PROFILE_ICONS } from "./constants";

interface EditFeatureDialogProps {
  feature: Feature | null;
  onClose: () => void;
  onSave: (featureId: string, updates: Partial<Feature>) => void;
  categorySuggestions: string[];
  isMaximized: boolean;
}

// Inner component that owns the editing state - mounted fresh for each feature via key
interface EditFeatureDialogContentProps {
  feature: Feature;
  onClose: () => void;
  onSave: (featureId: string, updates: Partial<Feature>) => void;
  categorySuggestions: string[];
}

const EditFeatureDialogContent = memo(function EditFeatureDialogContent({
  feature,
  onClose,
  onSave,
  categorySuggestions,
}: EditFeatureDialogContentProps) {
  // Initialize state from feature prop - only runs once on mount
  const [localFeature, setLocalFeature] = useState<Feature>(() => ({ ...feature }));
  const [previewMap, setPreviewMap] = useState<ImagePreviewMap>(() => new Map());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Get store values
  const { showProfilesOnly, aiProfiles } = useAppStore();

  const handleSave = useCallback(() => {
    const selectedModel = (localFeature.model ?? "opus") as AgentModel;
    const normalizedThinking = modelSupportsThinking(selectedModel)
      ? localFeature.thinkingLevel
      : "none";

    onSave(feature.id, {
      category: localFeature.category,
      description: localFeature.description,
      steps: localFeature.steps,
      skipTests: localFeature.skipTests,
      model: selectedModel,
      thinkingLevel: normalizedThinking,
      imagePaths: localFeature.imagePaths,
    });

    onClose();
  }, [localFeature, feature.id, onSave, onClose]);

  // Form field updaters
  const updateDescription = useCallback((value: string) => {
    setLocalFeature((prev) => ({ ...prev, description: value }));
  }, []);

  const updateCategory = useCallback((value: string) => {
    setLocalFeature((prev) => ({ ...prev, category: value }));
  }, []);

  const updateImagePaths = useCallback((images: DescriptionImagePath[]) => {
    setLocalFeature((prev) => ({ ...prev, imagePaths: images }));
  }, []);

  const updateModel = useCallback((model: AgentModel) => {
    setLocalFeature((prev) => ({
      ...prev,
      model,
      thinkingLevel: modelSupportsThinking(model) ? prev.thinkingLevel : "none",
    }));
  }, []);

  const updateThinkingLevel = useCallback((level: ThinkingLevel) => {
    setLocalFeature((prev) => ({ ...prev, thinkingLevel: level }));
  }, []);

  const updateSkipTests = useCallback((skip: boolean) => {
    setLocalFeature((prev) => ({ ...prev, skipTests: skip }));
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setLocalFeature((prev) => {
      const steps = [...prev.steps];
      steps[index] = value;
      return { ...prev, steps };
    });
  }, []);

  const addStep = useCallback(() => {
    setLocalFeature((prev) => ({ ...prev, steps: [...prev.steps, ""] }));
  }, []);

  const selectProfile = useCallback((model: AgentModel, thinkingLevel: ThinkingLevel) => {
    setLocalFeature((prev) => ({ ...prev, model, thinkingLevel }));
  }, []);

  const modelAllowsThinking = modelSupportsThinking(localFeature.model);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Feature</DialogTitle>
        <DialogDescription>Modify the feature details.</DialogDescription>
      </DialogHeader>
      <Tabs
        defaultValue="prompt"
        className="py-4 flex-1 min-h-0 flex flex-col"
      >
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="prompt" data-testid="edit-tab-prompt">
            <MessageSquare className="w-4 h-4 mr-2" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="model" data-testid="edit-tab-model">
            <Settings2 className="w-4 h-4 mr-2" />
            Model
          </TabsTrigger>
          <TabsTrigger value="testing" data-testid="edit-tab-testing">
            <FlaskConical className="w-4 h-4 mr-2" />
            Testing
          </TabsTrigger>
        </TabsList>

        {/* Prompt Tab */}
        <TabsContent value="prompt" className="space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <DescriptionImageDropZone
              value={localFeature.description}
              onChange={updateDescription}
              images={localFeature.imagePaths ?? []}
              onImagesChange={updateImagePaths}
              placeholder="Describe the feature..."
              previewMap={previewMap}
              onPreviewMapChange={setPreviewMap}
              data-testid="edit-feature-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category (optional)</Label>
            <CategoryAutocomplete
              value={localFeature.category}
              onChange={updateCategory}
              suggestions={categorySuggestions}
              placeholder="e.g., Core, UI, API"
              data-testid="edit-feature-category"
            />
          </div>
        </TabsContent>

        {/* Model Tab */}
        <TabsContent value="model" className="space-y-4 overflow-y-auto">
          {/* Show Advanced Options Toggle */}
          {showProfilesOnly && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Simple Mode Active
                </p>
                <p className="text-xs text-muted-foreground">
                  Only showing AI profiles. Advanced model tweaking is
                  hidden.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                data-testid="edit-show-advanced-options-toggle"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                {showAdvancedOptions ? "Hide" : "Show"} Advanced
              </Button>
            </div>
          )}

          {/* Quick Select Profile Section */}
          {aiProfiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-brand-500" />
                  Quick Select Profile
                </Label>
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-brand-500/40 text-brand-500">
                  Presets
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {aiProfiles.slice(0, 6).map((profile) => {
                  const IconComponent = profile.icon
                    ? PROFILE_ICONS[profile.icon]
                    : Brain;
                  const isSelected =
                    localFeature.model === profile.model &&
                    localFeature.thinkingLevel === profile.thinkingLevel;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => selectProfile(profile.model, profile.thinkingLevel)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                        isSelected
                          ? "bg-brand-500/10 border-brand-500 text-foreground"
                          : "bg-background hover:bg-accent border-input"
                      )}
                      data-testid={`edit-profile-quick-select-${profile.id}`}
                    >
                      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-primary/10">
                        {IconComponent && (
                          <IconComponent className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {profile.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {profile.model}
                          {profile.thinkingLevel !== "none" &&
                            ` + ${profile.thinkingLevel}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Or customize below.
              </p>
            </div>
          )}

          {/* Separator */}
          {aiProfiles.length > 0 &&
            (!showProfilesOnly || showAdvancedOptions) && (
              <div className="border-t border-border" />
            )}

          {/* Claude Models Section */}
          {(!showProfilesOnly || showAdvancedOptions) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Claude (SDK)
                </Label>
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-primary/40 text-primary">
                  Native
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {CLAUDE_MODELS.map((option) => {
                  const isSelected = localFeature.model === option.id;
                  const shortName = option.label.replace("Claude ", "");
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => updateModel(option.id)}
                      title={option.description}
                      className={cn(
                        "flex-1 min-w-[80px] px-3 py-2 rounded-md border text-sm font-medium transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent border-input"
                      )}
                      data-testid={`edit-model-select-${option.id}`}
                    >
                      {shortName}
                    </button>
                  );
                })}
              </div>

              {/* Thinking Level */}
              {modelAllowsThinking && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="flex items-center gap-2 text-sm">
                    <Brain className="w-3.5 h-3.5 text-muted-foreground" />
                    Thinking Level
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {(
                      [
                        "none",
                        "low",
                        "medium",
                        "high",
                        "ultrathink",
                      ] as ThinkingLevel[]
                    ).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => updateThinkingLevel(level)}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors min-w-[60px]",
                          (localFeature.thinkingLevel ?? "none") === level
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-accent border-input"
                        )}
                        data-testid={`edit-thinking-level-${level}`}
                      >
                        {level === "none" && "None"}
                        {level === "low" && "Low"}
                        {level === "medium" && "Med"}
                        {level === "high" && "High"}
                        {level === "ultrathink" && "Ultra"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher levels give more time to reason through complex
                    problems.
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent
          value="testing"
          className="space-y-4 overflow-y-auto"
        >
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-skip-tests"
              checked={!(localFeature.skipTests ?? false)}
              onCheckedChange={(checked) => updateSkipTests(checked !== true)}
              data-testid="edit-skip-tests-checkbox"
            />
            <div className="flex items-center gap-2">
              <Label
                htmlFor="edit-skip-tests"
                className="text-sm cursor-pointer"
              >
                Enable automated testing
              </Label>
              <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            When enabled, this feature will use automated TDD. When
            disabled, it will require manual verification.
          </p>

          {/* Verification Steps */}
          {localFeature.skipTests && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label>Verification Steps</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Add manual steps to verify this feature works correctly.
              </p>
              {localFeature.steps.map((step, index) => (
                <Input
                  key={index}
                  value={step}
                  placeholder={`Verification step ${index + 1}`}
                  onChange={(e) => updateStep(index, e.target.value)}
                  data-testid={`edit-feature-step-${index}`}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addStep}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Verification Step
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <HotkeyButton
          onClick={handleSave}
          hotkey={{ key: "Enter", cmdCtrl: true }}
          hotkeyActive={true}
          data-testid="confirm-edit-feature"
        >
          Save Changes
        </HotkeyButton>
      </DialogFooter>
    </>
  );
});

export const EditFeatureDialog = memo(function EditFeatureDialog({
  feature,
  onClose,
  onSave,
  categorySuggestions,
  isMaximized,
}: EditFeatureDialogProps) {
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);

  return (
    <Dialog open={!!feature} onOpenChange={handleOpenChange}>
      <DialogContent
        compact={!isMaximized}
        data-testid="edit-feature-dialog"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-testid="category-autocomplete-list"]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-testid="category-autocomplete-list"]')) {
            e.preventDefault();
          }
        }}
      >
        {feature && (
          <EditFeatureDialogContent
            key={feature.id}
            feature={feature}
            onClose={onClose}
            onSave={onSave}
            categorySuggestions={categorySuggestions}
          />
        )}
      </DialogContent>
    </Dialog>
  );
});

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
  AgentModel,
  ThinkingLevel,
  FeatureImage,
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

interface AddFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (feature: {
    category: string;
    description: string;
    steps: string[];
    images: FeatureImage[];
    imagePaths: DescriptionImagePath[];
    skipTests: boolean;
    model: AgentModel;
    thinkingLevel: ThinkingLevel;
  }) => void;
  categorySuggestions: string[];
  isMaximized: boolean;
}

// Isolated form state - not shared with parent
interface FormState {
  category: string;
  description: string;
  steps: string[];
  images: FeatureImage[];
  imagePaths: DescriptionImagePath[];
  skipTests: boolean;
  model: AgentModel;
  thinkingLevel: ThinkingLevel;
}

const DEFAULT_FORM_STATE: FormState = {
  category: "",
  description: "",
  steps: [""],
  images: [],
  imagePaths: [],
  skipTests: false,
  model: "opus",
  thinkingLevel: "none",
};

export const AddFeatureDialog = memo(function AddFeatureDialog({
  open,
  onOpenChange,
  onAdd,
  categorySuggestions,
  isMaximized,
}: AddFeatureDialogProps) {
  // Isolated form state - changes here don't affect parent
  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE);
  const [previewMap, setPreviewMap] = useState<ImagePreviewMap>(() => new Map());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);

  // Get store values
  const { showProfilesOnly, aiProfiles } = useAppStore();

  // Reset form when dialog opens - use the callback form to read fresh state
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      // Opening - reset form with current defaults
      setForm({
        ...DEFAULT_FORM_STATE,
        skipTests: useAppStore.getState().defaultSkipTests,
      });
    } else {
      // Closing - reset everything
      setForm(DEFAULT_FORM_STATE);
      setPreviewMap(new Map());
      setShowAdvancedOptions(false);
      setDescriptionError(false);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  const handleAdd = useCallback(() => {
    if (!form.description.trim()) {
      setDescriptionError(true);
      return;
    }

    const normalizedThinking = modelSupportsThinking(form.model)
      ? form.thinkingLevel
      : "none";

    onAdd({
      ...form,
      category: form.category || "Uncategorized",
      steps: form.steps.filter((s) => s.trim()),
      thinkingLevel: normalizedThinking,
    });

    // Reset and close
    setForm(DEFAULT_FORM_STATE);
    setPreviewMap(new Map());
    setDescriptionError(false);
    onOpenChange(false);
  }, [form, onAdd, onOpenChange]);

  // Form field updaters - these are isolated and fast
  const updateDescription = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, description: value }));
    if (value.trim()) {
      setDescriptionError(false);
    }
  }, []);

  const updateCategory = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, category: value }));
  }, []);

  const updateImagePaths = useCallback((images: DescriptionImagePath[]) => {
    setForm((prev) => ({ ...prev, imagePaths: images }));
  }, []);

  const updateModel = useCallback((model: AgentModel) => {
    setForm((prev) => ({
      ...prev,
      model,
      thinkingLevel: modelSupportsThinking(model) ? prev.thinkingLevel : "none",
    }));
  }, []);

  const updateThinkingLevel = useCallback((level: ThinkingLevel) => {
    setForm((prev) => ({ ...prev, thinkingLevel: level }));
  }, []);

  const updateSkipTests = useCallback((skip: boolean) => {
    setForm((prev) => ({ ...prev, skipTests: skip }));
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setForm((prev) => {
      const steps = [...prev.steps];
      steps[index] = value;
      return { ...prev, steps };
    });
  }, []);

  const addStep = useCallback(() => {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, ""] }));
  }, []);

  const selectProfile = useCallback((model: AgentModel, thinkingLevel: ThinkingLevel) => {
    setForm((prev) => ({ ...prev, model, thinkingLevel }));
  }, []);

  const modelAllowsThinking = modelSupportsThinking(form.model);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        compact={!isMaximized}
        data-testid="add-feature-dialog"
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
        <DialogHeader>
          <DialogTitle>Add New Feature</DialogTitle>
          <DialogDescription>
            Create a new feature card for the Kanban board.
          </DialogDescription>
        </DialogHeader>
        <Tabs
          defaultValue="prompt"
          className="py-4 flex-1 min-h-0 flex flex-col"
        >
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="prompt" data-testid="tab-prompt">
              <MessageSquare className="w-4 h-4 mr-2" />
              Prompt
            </TabsTrigger>
            <TabsTrigger value="model" data-testid="tab-model">
              <Settings2 className="w-4 h-4 mr-2" />
              Model
            </TabsTrigger>
            <TabsTrigger value="testing" data-testid="tab-testing">
              <FlaskConical className="w-4 h-4 mr-2" />
              Testing
            </TabsTrigger>
          </TabsList>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <DescriptionImageDropZone
                value={form.description}
                onChange={updateDescription}
                images={form.imagePaths}
                onImagesChange={updateImagePaths}
                placeholder="Describe the feature..."
                previewMap={previewMap}
                onPreviewMapChange={setPreviewMap}
                autoFocus
                error={descriptionError}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category (optional)</Label>
              <CategoryAutocomplete
                value={form.category}
                onChange={updateCategory}
                suggestions={categorySuggestions}
                placeholder="e.g., Core, UI, API"
                data-testid="feature-category-input"
              />
            </div>
          </TabsContent>

          {/* Model Tab */}
          <TabsContent value="model" className="space-y-4 overflow-y-auto">
            {/* Show Advanced Options Toggle - only when profiles-only mode is enabled */}
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
                  data-testid="show-advanced-options-toggle"
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
                      form.model === profile.model &&
                      form.thinkingLevel === profile.thinkingLevel;
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
                        data-testid={`profile-quick-select-${profile.id}`}
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
                  Or customize below. Manage profiles in{" "}
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      useAppStore.getState().setCurrentView("profiles");
                    }}
                    className="text-brand-500 hover:underline"
                  >
                    AI Profiles
                  </button>
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
                    const isSelected = form.model === option.id;
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
                        data-testid={`model-select-${option.id}`}
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
                            form.thinkingLevel === level
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-accent border-input"
                          )}
                          data-testid={`thinking-level-${level}`}
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
          <TabsContent value="testing" className="space-y-4 overflow-y-auto">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-tests"
                checked={!form.skipTests}
                onCheckedChange={(checked) => updateSkipTests(checked !== true)}
                data-testid="skip-tests-checkbox"
              />
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="skip-tests"
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

            {/* Verification Steps - Only shown when skipTests is enabled */}
            {form.skipTests && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Verification Steps</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add manual steps to verify this feature works correctly.
                </p>
                {form.steps.map((step, index) => (
                  <Input
                    key={index}
                    placeholder={`Verification step ${index + 1}`}
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    data-testid={`feature-step-${index}-input`}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  data-testid="add-step-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Verification Step
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <HotkeyButton
            onClick={handleAdd}
            hotkey={{ key: "Enter", cmdCtrl: true }}
            hotkeyActive={open}
            data-testid="confirm-add-feature"
          >
            Add Feature
          </HotkeyButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

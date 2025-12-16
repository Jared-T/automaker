"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { HotkeyButton } from "@/components/ui/hotkey-button";
import { Label } from "@/components/ui/label";
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
import { Feature } from "@/store/app-store";
import { MessageSquare } from "lucide-react";

interface FollowUpDialogProps {
  feature: Feature | null;
  onClose: () => void;
  onSend: (featureId: string, prompt: string, imagePaths: string[]) => void;
  isMaximized: boolean;
}

// Inner component that owns the form state - mounted fresh for each feature
interface FollowUpDialogContentProps {
  feature: Feature;
  onClose: () => void;
  onSend: (featureId: string, prompt: string, imagePaths: string[]) => void;
}

const FollowUpDialogContent = memo(function FollowUpDialogContent({
  feature,
  onClose,
  onSend,
}: FollowUpDialogContentProps) {
  // Initialize state fresh on mount
  const [prompt, setPrompt] = useState("");
  const [imagePaths, setImagePaths] = useState<DescriptionImagePath[]>([]);
  const [previewMap, setPreviewMap] = useState<ImagePreviewMap>(() => new Map());

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSend = useCallback(() => {
    if (!prompt.trim()) return;

    onSend(
      feature.id,
      prompt,
      imagePaths.map((img) => img.path)
    );
  }, [feature.id, prompt, imagePaths, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && prompt.trim()) {
      e.preventDefault();
      handleSend();
    }
  }, [prompt, handleSend]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Follow-Up Prompt</DialogTitle>
        <DialogDescription>
          Send additional instructions to continue working on this feature.
          <span className="block mt-2 text-primary">
            Feature: {feature.description.slice(0, 100)}
            {feature.description.length > 100 ? "..." : ""}
          </span>
        </DialogDescription>
      </DialogHeader>
      <div
        className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0"
        onKeyDown={handleKeyDown}
      >
        <div className="space-y-2">
          <Label htmlFor="follow-up-prompt">Instructions</Label>
          <DescriptionImageDropZone
            value={prompt}
            onChange={setPrompt}
            images={imagePaths}
            onImagesChange={setImagePaths}
            placeholder="Describe what needs to be fixed or changed..."
            previewMap={previewMap}
            onPreviewMapChange={setPreviewMap}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The agent will continue from where it left off, using the existing
          context. You can attach screenshots to help explain the issue.
        </p>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <HotkeyButton
          onClick={handleSend}
          disabled={!prompt.trim()}
          hotkey={{ key: "Enter", cmdCtrl: true }}
          hotkeyActive={true}
          data-testid="confirm-follow-up"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Send Follow-Up
        </HotkeyButton>
      </DialogFooter>
    </>
  );
});

export const FollowUpDialog = memo(function FollowUpDialog({
  feature,
  onClose,
  onSend,
  isMaximized,
}: FollowUpDialogProps) {
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      onClose();
    }
  }, [onClose]);

  return (
    <Dialog open={!!feature} onOpenChange={handleOpenChange}>
      <DialogContent
        compact={!isMaximized}
        data-testid="follow-up-dialog"
      >
        {feature && (
          <FollowUpDialogContent
            key={feature.id}
            feature={feature}
            onClose={onClose}
            onSend={onSend}
          />
        )}
      </DialogContent>
    </Dialog>
  );
});

"use client";

import { useState, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Feature } from "@/store/app-store";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

interface CompletedFeaturesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  features: Feature[];
  onUnarchive: (feature: Feature) => void;
  onDelete: (featureId: string) => void;
}

export const CompletedFeaturesModal = memo(function CompletedFeaturesModal({
  open,
  onOpenChange,
  features,
  onUnarchive,
  onDelete,
}: CompletedFeaturesModalProps) {
  const [deleteFeature, setDeleteFeature] = useState<Feature | null>(null);

  const handleConfirmDelete = useCallback(() => {
    if (deleteFeature) {
      onDelete(deleteFeature.id);
      setDeleteFeature(null);
    }
  }, [deleteFeature, onDelete]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-brand-500" />
              Completed Features
            </DialogTitle>
            <DialogDescription>
              {features.length === 0
                ? "No completed features yet. Features you complete will appear here."
                : `${features.length} completed feature${
                    features.length === 1 ? "" : "s"
                  }`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {features.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Archive className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No completed features</p>
                <p className="text-sm">
                  Complete features from the Verified column to archive them
                  here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {features.map((feature) => (
                  <Card
                    key={feature.id}
                    className="flex flex-col"
                    data-testid={`completed-card-${feature.id}`}
                  >
                    <CardHeader className="p-3 pb-2 flex-1">
                      <CardTitle className="text-sm leading-tight line-clamp-3">
                        {feature.description || feature.summary || feature.id}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1 truncate">
                        {feature.category || "Uncategorized"}
                      </CardDescription>
                    </CardHeader>
                    <div className="p-3 pt-0 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => onUnarchive(feature)}
                        data-testid={`unarchive-${feature.id}`}
                      >
                        <ArchiveRestore className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteFeature(feature)}
                        data-testid={`delete-completed-${feature.id}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Completed Feature Confirmation Dialog */}
      <Dialog
        open={!!deleteFeature}
        onOpenChange={(open) => !open && setDeleteFeature(null)}
      >
        <DialogContent data-testid="delete-completed-confirmation-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Feature
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this feature?
              <span className="block mt-2 font-medium text-foreground">
                &quot;{deleteFeature?.description?.slice(0, 100)}
                {(deleteFeature?.description?.length ?? 0) > 100
                  ? "..."
                  : ""}
                &quot;
              </span>
              <span className="block mt-2 text-destructive font-medium">
                This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteFeature(null)}
              data-testid="cancel-delete-completed-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              data-testid="confirm-delete-completed-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

import { HotkeyButton } from '@/components/ui/hotkey-button';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Bot, Wand2, Repeat } from 'lucide-react';
import { KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';
import { ClaudeUsagePopover } from '@/components/claude-usage-popover';
import { useAppStore } from '@/store/app-store';

interface BoardHeaderProps {
  projectName: string;
  maxConcurrency: number;
  runningAgentsCount: number;
  onConcurrencyChange: (value: number) => void;
  isAutoModeRunning: boolean;
  onAutoModeToggle: (enabled: boolean) => void;
  isAutoLoopRunning: boolean;
  onAutoLoopToggle: (enabled: boolean) => void;
  onAddFeature: () => void;
  onOpenPlanDialog: () => void;
  addFeatureShortcut: KeyboardShortcut;
  isMounted: boolean;
}

export function BoardHeader({
  projectName,
  maxConcurrency,
  runningAgentsCount,
  onConcurrencyChange,
  isAutoModeRunning,
  onAutoModeToggle,
  isAutoLoopRunning,
  onAutoLoopToggle,
  onAddFeature,
  onOpenPlanDialog,
  addFeatureShortcut,
  isMounted,
}: BoardHeaderProps) {
  const apiKeys = useAppStore((state) => state.apiKeys);

  // Hide usage tracking when using API key (only show for Claude Code CLI users)
  // Also hide on Windows for now (CLI usage command not supported)
  const isWindows =
    typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('win');
  const showUsageTracking = !apiKeys.anthropic && !isWindows;

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-glass backdrop-blur-md">
      <div>
        <h1 className="text-xl font-bold">Kanban Board</h1>
        <p className="text-sm text-muted-foreground">{projectName}</p>
      </div>
      <div className="flex gap-2 items-center">
        {/* Usage Popover - only show for CLI users (not API key users) */}
        {isMounted && showUsageTracking && <ClaudeUsagePopover />}

        {/* Concurrency Slider - only show after mount to prevent hydration issues */}
        {isMounted && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border"
            data-testid="concurrency-slider-container"
          >
            <Bot className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Agents</span>
            <Slider
              value={[maxConcurrency]}
              onValueChange={(value) => onConcurrencyChange(value[0])}
              min={1}
              max={10}
              step={1}
              className="w-20"
              data-testid="concurrency-slider"
            />
            <span
              className="text-sm text-muted-foreground min-w-[5ch] text-center"
              data-testid="concurrency-value"
            >
              {runningAgentsCount} / {maxConcurrency}
            </span>
          </div>
        )}

        {/* Auto Mode Toggle - only show after mount to prevent hydration issues */}
        {isMounted && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border">
            <Label htmlFor="auto-mode-toggle" className="text-sm font-medium cursor-pointer">
              Auto Mode
            </Label>
            <Switch
              id="auto-mode-toggle"
              checked={isAutoModeRunning}
              onCheckedChange={onAutoModeToggle}
              data-testid="auto-mode-toggle"
            />
          </div>
        )}

        {/* Full Auto Loop Toggle - runs until backlog is empty */}
        {isMounted && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              isAutoLoopRunning
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-secondary border-border'
            }`}
          >
            <Repeat
              className={`w-4 h-4 ${isAutoLoopRunning ? 'text-green-500 animate-spin' : 'text-muted-foreground'}`}
              style={{ animationDuration: '3s' }}
            />
            <Label htmlFor="auto-loop-toggle" className="text-sm font-medium cursor-pointer">
              Full Auto
            </Label>
            <Switch
              id="auto-loop-toggle"
              checked={isAutoLoopRunning}
              onCheckedChange={onAutoLoopToggle}
              data-testid="auto-loop-toggle"
            />
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onOpenPlanDialog}
          data-testid="plan-backlog-button"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Plan
        </Button>

        <HotkeyButton
          size="sm"
          onClick={onAddFeature}
          hotkey={addFeatureShortcut}
          hotkeyActive={false}
          data-testid="add-feature-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Feature
        </HotkeyButton>
      </div>
    </div>
  );
}

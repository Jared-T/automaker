The navigation now shows only:
- **Project** section: Kanban Board, Agent Runner
- **Tools** section: Spec Editor, Context, AI Profiles

The "Agent Tools" item has been successfully removed from the side navigation.

## Summary

I've successfully removed "Agent Tools" from the side navigation by making the following changes:

### Files Modified:

1. **`apps/app/src/components/layout/sidebar.tsx`**
   - Removed the navigation item for "Agent Tools" (id: "tools")
   - Removed the unused `Wrench` icon import from lucide-react

2. **`apps/app/src/components/ui/keyboard-map.tsx`**
   - Removed `tools: "Agent Tools"` from `SHORTCUT_LABELS`
   - Removed `tools: "navigation"` from `SHORTCUT_CATEGORIES`

3. **`apps/app/src/store/app-store.ts`**
   - Removed `"tools"` from the `ViewMode` type union
   - Removed `tools: string` from the `KeyboardShortcuts` interface
   - Removed `tools: "T"` from `DEFAULT_KEYBOARD_SHORTCUTS`

4. **`apps/app/src/app/page.tsx`**
   - Removed the import for `AgentToolsView`
   - Removed the `case "tools": return <AgentToolsView />` from the view switch statement

### Notes:
- The `agent-tools-view.tsx` component file was **not** deleted, as the user only requested to remove it from the navigation. The component remains in the codebase in case it's needed later.
- The keyboard shortcut "T" is now available for other features if needed.
- All lint errors found are pre-existing in the codebase and not related to these changes.
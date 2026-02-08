

## Move "ConfessAI" Title to the Top of the Page

**What will change:**
The "ConfessAI" title will be pinned to the top of the screen (with a small adaptive top margin), while the form content (inputs, buttons) stays centered in the remaining space below it.

**How (single file change: `src/pages/Auth.tsx`):**

- Keep the outer container as `h-[100dvh] flex flex-col overflow-hidden` but remove `justify-center` and `items-center` from it.
- Re-add an adaptive top spacer before the title (like before, e.g. `clamp(12px, 3.5vh, 48px)`), so the title sits near the top with safe-area breathing room.
- The title stays `shrink-0` and centered horizontally via `text-center`.
- The form container below gets `flex-1 flex flex-col items-center justify-center` so the form block itself remains vertically centered in the remaining space.
- No other files touched. No text, translations, copy, or design changes.

**Current layout:**
```text
+---------------------------+
|                           |
|        (empty)            |
|       ConfessAI           |
|       [form block]        |
|        (empty)            |
|                           |
+---------------------------+
  (everything centered as a group)
```

**Updated layout:**
```text
+---------------------------+
|    (small top margin)     |
|       ConfessAI           |
|                           |
|       [form block]        |
|     (centered in rest)    |
|                           |
+---------------------------+
  (title at top, form centered in remaining space)
```

**Technical detail:**

```tsx
const AuthLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[100dvh] bg-background flex flex-col px-6 overflow-hidden">
    {/* Adaptive top spacing */}
    <div className="shrink-0" style={{ height: 'clamp(12px, 3.5vh, 48px)' }} />

    {/* Title pinned near top */}
    <h1 className="text-3xl font-bold text-center shrink-0" style={{ marginBottom: 'clamp(8px, 2vh, 24px)' }}>
      <span className="text-foreground">Confess</span>
      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">AI</span>
    </h1>

    {/* Form content - centered in remaining space */}
    <div className="max-w-sm mx-auto w-full flex-1 flex flex-col justify-center min-h-0">
      {children}
    </div>
  </div>
);
```

- Title stays at top with small breathing room.
- Form block is vertically centered in whatever space remains below the title.
- No scroll, no layout jump, no other changes.


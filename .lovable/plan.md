

## Center Auth Content Vertically on the Page

**What will change:**
The Login and Sign Up screens will have their content (title, form fields, buttons) perfectly centered in the middle of the screen instead of being anchored near the top.

**How:**
- Update the `AuthLayout` wrapper to use `justify-center` and `items-center` instead of the current top-spacer approach.
- Remove the fixed top spacer `div` that pushes content down from the top.
- The title ("ConfessAI") and the form block will be grouped together and centered as a unit in the viewport.
- Keep `h-[100dvh]`, `overflow-hidden`, and `px-6` so nothing scrolls and safe areas are respected.
- All responsive `clamp()` sizing on inputs, buttons, and gaps stays exactly as-is.

**Technical detail (single file change: `src/pages/Auth.tsx`):**

Current `AuthLayout`:
```
<div className="h-[100dvh] bg-background flex flex-col px-6 overflow-hidden">
  <div className="shrink-0" style={{ height: 'clamp(12px, 3.5vh, 48px)' }} />  <!-- top spacer -->
  <h1 ...>ConfessAI</h1>
  <div className="max-w-sm mx-auto w-full flex-1 flex flex-col min-h-0">
    {children}
  </div>
</div>
```

Updated `AuthLayout`:
```
<div className="h-[100dvh] bg-background flex flex-col items-center justify-center px-6 overflow-hidden">
  <h1 ...>ConfessAI</h1>
  <div className="max-w-sm w-full flex flex-col min-h-0">
    {children}
  </div>
</div>
```

Key differences:
- Add `justify-center` and `items-center` to vertically and horizontally center everything.
- Remove the top spacer `div` entirely — no longer needed since flexbox centering handles it.
- Remove `flex-1` from the form container (it no longer needs to grow; centering handles positioning).
- Keep `mx-auto` or use parent's `items-center` for horizontal centering.
- No other files touched. No text, translations, or design changes.


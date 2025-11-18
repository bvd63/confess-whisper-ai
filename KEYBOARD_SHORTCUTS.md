# Keyboard Shortcuts Guide

## 🎹 Built-in Shortcuts

### Global Navigation

| Shortcut      | Action             | Context                  |
| ------------- | ------------------ | ------------------------ |
| `Esc`         | Close dialog/modal | Any open modal or dialog |
| `Enter`       | Submit form        | Forms (not in textarea)  |
| `Tab`         | Navigate forward   | Any interactive element  |
| `Shift + Tab` | Navigate backward  | Any interactive element  |

### Dialog Management

- **Escape Key**: Automatically closes:
  - New Confession Dialog
  - Deep Insight Dialog
  - Report Dialog
  - Share Dialog
  - Any AlertDialog
  - Modals with close buttons

### Form Submission

- **Enter Key**: Submits forms when:
  - In text input fields
  - In select dropdowns
  - In checkboxes/radio buttons
  - NOT in textarea (allows multi-line)

---

## 🔧 Custom Shortcuts Implementation

### Basic Usage

```tsx
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  useKeyboardNavigation({
    onEscape: () => setIsOpen(false),
    onEnter: () => handleSubmit(),
    enabled: isOpen,
  });

  return <Dialog open={isOpen}>...</Dialog>;
}
```

### Advanced Custom Shortcuts

For complex shortcuts with modifiers:

```tsx
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function MyComponent() {
  useKeyboardShortcuts([
    // Ctrl/Cmd + S to save
    {
      key: "s",
      ctrl: true,
      callback: handleSave,
    },

    // Ctrl/Cmd + K to open search
    {
      key: "k",
      ctrl: true,
      callback: openSearch,
    },

    // Ctrl/Cmd + Shift + P for command palette
    {
      key: "p",
      ctrl: true,
      shift: true,
      callback: openCommandPalette,
    },

    // Alt + N for new confession
    {
      key: "n",
      alt: true,
      callback: createNewConfession,
    },
  ]);

  return <YourComponent />;
}
```

---

## 📋 Recommended Shortcuts

### Content Creation

```tsx
// Ctrl/Cmd + N - New confession
{
  key: 'n',
  ctrl: true,
  callback: () => navigate('/compose')
}

// Ctrl/Cmd + Enter - Submit confession
{
  key: 'Enter',
  ctrl: true,
  callback: handleSubmit
}

// Ctrl/Cmd + S - Save draft
{
  key: 's',
  ctrl: true,
  callback: saveDraft
}
```

### Navigation

```tsx
// Ctrl/Cmd + H - Go home
{
  key: 'h',
  ctrl: true,
  callback: () => navigate('/')
}

// Ctrl/Cmd + P - Profile
{
  key: 'p',
  ctrl: true,
  callback: () => navigate('/profile')
}

// Ctrl/Cmd + E - Explore
{
  key: 'e',
  ctrl: true,
  callback: () => navigate('/explore')
}

// Ctrl/Cmd + M - Messages
{
  key: 'm',
  ctrl: true,
  callback: () => navigate('/messages')
}
```

### Search & Filter

```tsx
// Ctrl/Cmd + K - Quick search
{
  key: 'k',
  ctrl: true,
  callback: focusSearchBar
}

// Ctrl/Cmd + F - Advanced filter
{
  key: 'f',
  ctrl: true,
  callback: openFilterDialog
}
```

### UI Controls

```tsx
// Ctrl/Cmd + B - Toggle sidebar
{
  key: 'b',
  ctrl: true,
  callback: toggleSidebar
}

// Ctrl/Cmd + \ - Toggle theme
{
  key: '\\',
  ctrl: true,
  callback: toggleTheme
}

// Ctrl/Cmd + , - Settings
{
  key: ',',
  ctrl: true,
  callback: () => navigate('/settings')
}
```

---

## 🎮 Implementation Examples

### Dialog with Escape

```tsx
function ConfessionDialog({ open, onClose }) {
  useKeyboardNavigation({
    onEscape: onClose,
    enabled: open,
  });

  return <Dialog open={open}>{/* Dialog content */}</Dialog>;
}
```

### Form with Enter Submit

```tsx
function ConfessionForm({ onSubmit }) {
  const [content, setContent] = useState("");

  useKeyboardNavigation({
    onEnter: () => onSubmit(content),
    enabled: content.length >= 10,
  });

  return (
    <form>
      <Input value={content} onChange={(e) => setContent(e.target.value)} />
    </form>
  );
}
```

### Command Palette

```tsx
function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      callback: () => setOpen(true),
    },
  ]);

  useKeyboardNavigation({
    onEscape: () => setOpen(false),
    enabled: open,
  });

  return (
    <Dialog open={open}>
      <DialogContent>{/* Command palette UI */}</DialogContent>
    </Dialog>
  );
}
```

---

## ♿ Accessibility Best Practices

### 1. Always Show Visual Feedback

```tsx
// ✅ Good - Shows focus outline
<button className="focus-ring">
  Click me
</button>

// ❌ Bad - Hidden focus
<button className="outline-none">
  Click me
</button>
```

### 2. Provide Keyboard Hints

```tsx
<Button>
  Save
  <span className="text-xs text-muted-foreground ml-2">⌘S</span>
</Button>
```

### 3. Don't Trap Focus

```tsx
// ✅ Good - Allow escape
useKeyboardNavigation({
  onEscape: closeModal,
  enabled: isOpen,
});

// ❌ Bad - No way out
// (no escape handler)
```

### 4. Support Tab Navigation

```tsx
// ✅ Good - Tabbable elements
<button>Action 1</button>
<button>Action 2</button>

// ❌ Bad - No tab order
<div onClick={action1}>Action 1</div>
<div onClick={action2}>Action 2</div>
```

---

## 🔍 Debugging Shortcuts

Enable keyboard shortcut logging in development:

```tsx
// In your hook or component
useKeyboardShortcuts([
  {
    key: "d",
    ctrl: true,
    shift: true,
    callback: () => {
      console.log("Debug mode enabled");
      // Show keyboard shortcut overlay
    },
  },
]);
```

---

## 📱 Mobile Considerations

Keyboard shortcuts don't apply on mobile/touch devices. Instead:

- Use gestures (swipe, long-press)
- Provide touch-optimized buttons
- Consider haptic feedback
- Use pull-to-refresh

```tsx
// Desktop: Keyboard shortcut
if (!isMobile) {
  useKeyboardShortcuts([{ key: "r", ctrl: true, callback: refresh }]);
}

// Mobile: Pull-to-refresh
if (isMobile) {
  usePullToRefresh({
    onRefresh: refresh,
  });
}
```

---

## 🎯 Shortcut Cheat Sheet

### For Users (Display in Help Menu)

```tsx
const shortcuts = [
  { keys: ["Esc"], description: "Close dialog" },
  { keys: ["Enter"], description: "Submit form" },
  { keys: ["Ctrl", "K"], description: "Search" },
  { keys: ["Ctrl", "N"], description: "New confession" },
  { keys: ["Ctrl", "S"], description: "Save draft" },
  { keys: ["Ctrl", "H"], description: "Go home" },
  { keys: ["Ctrl", "P"], description: "Profile" },
  { keys: ["Ctrl", ","], description: "Settings" },
];

function ShortcutHelp() {
  return (
    <div className="space-y-2">
      {shortcuts.map((shortcut) => (
        <div key={shortcut.keys.join("-")} className="flex justify-between">
          <span>{shortcut.description}</span>
          <kbd className="px-2 py-1 bg-muted rounded">
            {shortcut.keys.join(" + ")}
          </kbd>
        </div>
      ))}
    </div>
  );
}
```

---

## 🚀 Performance Tips

1. **Cleanup Listeners**: Hooks automatically cleanup, but verify:

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    // ...
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, []);
```

2. **Debounce Rapid Keys**: For search or filter:

```tsx
const debouncedCallback = useDebouncedCallback(handleSearch, 300);

useKeyboardShortcuts([
  {
    key: "k",
    ctrl: true,
    callback: debouncedCallback,
  },
]);
```

3. **Conditional Shortcuts**: Only enable when needed:

```tsx
useKeyboardNavigation({
  onEnter: handleSubmit,
  enabled: isFormValid && isDialogOpen,
});
```

---

**Remember**: Good keyboard support makes your app accessible and power-user friendly! 🎹

# Component Usage Guide

## 🎯 New Polish Components

### LoadingStates

Professional loading indicators that replace generic spinners.

#### PageLoading
Full-page skeleton for initial loads:
```tsx
import { PageLoading } from '@/components/LoadingStates';

<PageLoading className="min-h-screen" />
```

#### ButtonLoading
Inline spinner for buttons:
```tsx
import { ButtonLoading } from '@/components/LoadingStates';

<Button disabled={isLoading}>
  {isLoading ? <ButtonLoading size="sm" /> : 'Submit'}
</Button>
```

#### ContentLoading
Skeleton text lines:
```tsx
import { ContentLoading } from '@/components/LoadingStates';

{loading ? <ContentLoading lines={3} /> : <p>{content}</p>}
```

#### CardLoading
Card skeleton for lists:
```tsx
import { CardLoading } from '@/components/LoadingStates';

{loading ? <CardLoading count={5} /> : <ConfessionList />}
```

---

### EmptyState

Beautiful empty states with icons:
```tsx
import EmptyState from '@/components/EmptyState';
import { MessageCircle } from 'lucide-react';

<EmptyState
  icon={MessageCircle}
  title={t.empty_confessions_title}
  description={t.empty_confessions_description}
  actionLabel="Create First Confession"
  onAction={() => navigate('/compose')}
/>
```

**Props:**
- `icon`: Lucide icon component
- `title`: Main heading
- `description`: Supporting text
- `actionLabel?`: Button text (optional)
- `onAction?`: Button click handler (optional)
- `className?`: Additional styles

---

### ErrorMessage

User-friendly error display:
```tsx
import ErrorMessage from '@/components/ErrorMessage';

<ErrorMessage
  title="Connection Failed"
  message={t.error_network}
  onRetry={refetch}
  onGoHome={() => navigate('/')}
/>
```

**Props:**
- `title?`: Error heading (defaults to generic)
- `message`: Error description
- `onRetry?`: Retry button handler (optional)
- `onGoHome?`: Home button handler (optional)
- `className?`: Additional styles

---

### EnhancedButton

Button with haptic feedback and animations:
```tsx
import { EnhancedButton } from '@/components/EnhancedButton';

<EnhancedButton
  lift
  haptic
  onClick={handleSubmit}
>
  Submit Confession
</EnhancedButton>
```

**Props:**
- `glow?`: Add glow effect on hover
- `shine?`: Add shimmer animation
- `lift?`: Lift on hover
- `ripple?`: Ripple effect on click (default: true)
- `haptic?`: Haptic feedback on mobile (default: true)
- All standard Button props

---

### AnimatedCard

Cards with hover effects:
```tsx
import { AnimatedCard } from '@/components/AnimatedCard';

<AnimatedCard 
  hover="lift"
  gradient
  delay={100}
>
  <CardContent />
</AnimatedCard>
```

**Props:**
- `hover?`: 'lift' | 'glow' | 'scale' | 'none'
- `glass?`: Glass morphism effect
- `gradient?`: Gradient background
- `delay?`: Animation delay in ms

---

### OptimizedImage

High-performance image component:
```tsx
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  src={imageUrl}
  alt="Confession image"
  aspectRatio="video"
  priority
  width={800}
  height={450}
/>
```

**Props:**
- `src`: Image URL
- `alt`: Alt text for accessibility
- `aspectRatio?`: 'square' | 'video' | 'portrait' | 'auto'
- `priority?`: Load immediately without lazy loading
- `blur?`: Show blur placeholder (default: true)
- `width?`: Target width for optimization
- `height?`: Target height
- `onError?`: Error callback

---

### Toast Messages

Standardized notifications:
```tsx
import { showToast } from '@/lib/toast-messages';
import { useLanguage } from '@/contexts/LanguageContext';

const { language } = useLanguage();

// Success
showToast.success('confessionCreated', language);

// Error
showToast.error('networkError', language);

// Info
showToast.info('updateAvailable', language);

// Loading (returns ID for dismissal)
const loadingId = showToast.loading('uploading', language);
// Later: toast.dismiss(loadingId);
```

**Available Messages:**
- **Success**: confessionCreated, confessionDeleted, vipActivated, profileUpdated
- **Error**: networkError, unauthorized, rateLimited, serverError, invalidInput
- **Info**: streakLost, maintenance, updateAvailable, offlineMode
- **Loading**: creating, uploading, processing, loading

---

## 🎨 Utility Hooks

### useKeyboardNavigation

Handle keyboard shortcuts:
```tsx
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';

const [isOpen, setIsOpen] = useState(false);

useKeyboardNavigation({
  onEscape: () => setIsOpen(false),
  onEnter: () => handleSubmit(),
  enabled: isOpen
});
```

---

### useDebounce

Debounce values or callbacks:
```tsx
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';

// Debounce value
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

// Debounce callback
const debouncedSearch = useDebouncedCallback(
  (value: string) => performSearch(value),
  300
);
```

---

### useHaptic

Haptic feedback (existing):
```tsx
import { useHaptic } from '@/hooks/useHaptic';

const { vibrate, vibratePattern } = useHaptic();

// Simple vibration
vibrate('light'); // or 'medium', 'heavy'

// Pattern
vibratePattern([10, 50, 10]); // vibrate-pause-vibrate
```

**Or use utility functions:**
```tsx
import { hapticClick, hapticSuccess, hapticError } from '@/lib/haptics';

hapticClick(); // Light click
hapticSuccess(); // Success pattern
hapticError(); // Error pattern
```

---

### usePullToRefresh

Pull-to-refresh (existing):
```tsx
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const { containerRef, isRefreshing } = usePullToRefresh({
  onRefresh: async () => {
    await refetchData();
  },
  threshold: 80,
  disabled: false
});

<div ref={containerRef}>
  {/* Your scrollable content */}
</div>
```

---

## 🌍 Accessibility

### ARIA Labels

Use translation keys for ARIA labels:
```tsx
import { getAriaLabel } from '@/lib/aria-labels';
import { useLanguage } from '@/contexts/LanguageContext';

const { language } = useLanguage();

<button aria-label={getAriaLabel('close', language)}>
  <X />
</button>

<input 
  aria-label={getAriaLabel('searchInput', language)}
  placeholder={t.search}
/>
```

**Available Labels:**
- Actions: close, open, menu, search, like, share, report
- Navigation: home, profile, settings, back, next
- Inputs: searchInput, messageInput, confessionInput
- Media: uploadImage, removeImage, playVideo
- Theme: toggleTheme, darkMode, lightMode

---

## 🎬 Animations & CSS Classes

### Hover Effects
```tsx
// Lift effect
<div className="hover-lift">...</div>

// Glow effect
<div className="hover-glow">...</div>

// Scale effect
<div className="hover-scale">...</div>
```

### Animations
```tsx
// Fade in
<div className="animate-fade-in">...</div>

// Slide down
<div className="animate-slide-down">...</div>

// Bounce subtle
<div className="animate-bounce-subtle">...</div>

// Pulse glow
<div className="animate-pulse-glow">...</div>
```

### Safe Areas (Mobile)
```tsx
// iOS safe area support
<div className="safe-area-inset-top">...</div>
<div className="safe-area-inset-bottom">...</div>
<div className="safe-area-inset-left">...</div>
<div className="safe-area-inset-right">...</div>
```

---

## 📱 System Components

### OfflineIndicator
Auto-displays when offline (already integrated in App.tsx):
```tsx
import { OfflineIndicator } from '@/components/OfflineIndicator';

// In root app
<OfflineIndicator />
```

### UpdatePrompt
Auto-displays when new version available (already integrated):
```tsx
import { UpdatePrompt } from '@/components/UpdatePrompt';

// In root app
<UpdatePrompt />
```

### CookieConsent
Auto-displays on first visit (already integrated):
```tsx
import { CookieConsent } from '@/components/CookieConsent';

// In root app
<CookieConsent />
```

---

## 🚀 Performance

### Lazy Components
```tsx
import { lazy, Suspense } from 'react';
import { PageLoading } from '@/components/LoadingStates';

// From lazy-components.ts
import { 
  AdvancedAnalytics,
  ModerationPanel,
  DeepInsightDialog 
} from '@/lib/lazy-components';

// Usage
<Suspense fallback={<PageLoading />}>
  <AdvancedAnalytics />
</Suspense>
```

---

## 💡 Best Practices

### Loading States
✅ **DO**: Use specific loading states
```tsx
{loading ? <ContentLoading lines={3} /> : <Content />}
```

❌ **DON'T**: Use generic spinners
```tsx
{loading ? <Loader2 className="animate-spin" /> : <Content />}
```

### Empty States
✅ **DO**: Provide context and actions
```tsx
<EmptyState
  icon={MessageCircle}
  title="No messages yet"
  description="Start a conversation"
  actionLabel="New Message"
  onAction={openCompose}
/>
```

❌ **DON'T**: Show plain text
```tsx
<p>No messages</p>
```

### Error Handling
✅ **DO**: Provide recovery options
```tsx
<ErrorMessage
  message={error.message}
  onRetry={refetch}
  onGoHome={() => navigate('/')}
/>
```

❌ **DON'T**: Just display error text
```tsx
<p className="text-red-500">{error.message}</p>
```

### Buttons
✅ **DO**: Use EnhancedButton for primary actions
```tsx
<EnhancedButton lift haptic onClick={submit}>
  Submit
</EnhancedButton>
```

✅ **ALSO GOOD**: Use standard Button for secondary actions
```tsx
<Button variant="outline" onClick={cancel}>
  Cancel
</Button>
```

### Images
✅ **DO**: Use OptimizedImage
```tsx
<OptimizedImage
  src={url}
  alt="Description"
  aspectRatio="video"
  width={800}
/>
```

❌ **DON'T**: Use raw img tags
```tsx
<img src={url} alt="Description" />
```

---

## 🔑 Keyboard Shortcuts

Implemented via `useKeyboardNavigation`:
- **Escape**: Close dialogs/modals
- **Enter**: Submit forms (except in textareas)
- **Tab**: Navigate between elements

To add custom shortcuts:
```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

useKeyboardShortcuts([
  {
    key: 's',
    ctrl: true,
    callback: handleSave
  },
  {
    key: 'k',
    ctrl: true,
    callback: openSearch
  }
]);
```

---

## 📊 Analytics Integration

Toast events are automatically tracked. Custom tracking:
```tsx
import { useAnalyticsTracking } from '@/hooks/useAnalyticsTracking';

useAnalyticsTracking('page_view', {
  page: 'profile',
  user_id: user?.id
});
```

---

## 🎯 Quick Reference

**When to use what:**

| Need | Component | Location |
|------|-----------|----------|
| Full page loading | `<PageLoading />` | LoadingStates.tsx |
| Button loading | `<ButtonLoading />` | LoadingStates.tsx |
| Content skeleton | `<ContentLoading />` | LoadingStates.tsx |
| Empty list | `<EmptyState />` | EmptyState.tsx |
| Error display | `<ErrorMessage />` | ErrorMessage.tsx |
| Success toast | `showToast.success()` | toast-messages.ts |
| Image display | `<OptimizedImage />` | OptimizedImage.tsx |
| Primary button | `<EnhancedButton />` | EnhancedButton.tsx |
| Hover card | `<AnimatedCard />` | AnimatedCard.tsx |
| Keyboard nav | `useKeyboardNavigation()` | hooks/useKeyboardNavigation.ts |
| Debounce search | `useDebounce()` | hooks/useDebounce.ts |
| Haptic feedback | `hapticClick()` | lib/haptics.ts |

---

**Happy coding! 🚀**

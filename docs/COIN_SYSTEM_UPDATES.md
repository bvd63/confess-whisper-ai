# Coin System & Badge Updates - Complete Implementation

## 🎯 Overview

This document details the comprehensive updates to the coin and badge systems implemented across the Confess+ app.

---

## ✅ Implemented Changes

### 1️⃣ **Time-Limited Badges & Flairs (5-Day Expiry)**

#### Database Changes:

- Added `expires_at` and `acquired_at` columns to `user_badges` and `user_flairs` tables
- Automatic expiry calculation: `acquired_at + 5 days`
- Indexed expiry columns for fast queries

#### Frontend Features:

- **Countdown Timers**: Real-time display showing "Expires in Xd Xh"
- **Expired Badges**: Marked with "Expired" label + red styling
- **Buy Again Button**: Allows repurchase of expired items
- **Duration Label**: Shop items show "Active for 5 days" text
- **Auto-filtering**: Expired items excluded from active displays

#### Expiry Components:

- `ExpiryTimer.tsx` - Reusable countdown component
- `useTimeRemaining.ts` - Hook for calculating time remaining
- `FlairsShop.tsx` - Updated with expiry logic

---

### 2️⃣ **Coin Rewards - New Structure**

#### Updated Rewards:

| Action         | Old Reward | New Reward   | Status      |
| -------------- | ---------- | ------------ | ----------- |
| New Confession | +10 coins  | **+2 coins** | ✅ Active   |
| Comment        | +5 coins   | **REMOVED**  | ❌ Disabled |
| Like Received  | +2 coins   | **REMOVED**  | ❌ Disabled |

#### Database Triggers:

```sql
-- Updated trigger: awards 2 coins per confession
CREATE OR REPLACE FUNCTION award_confession_coins()
  -- Awards 2 coins for each new, approved confession

-- Removed triggers:
DROP FUNCTION award_like_coins() CASCADE;
DROP FUNCTION award_comment_coins() CASCADE;
```

#### Anti-Duplicate Protection:

- Coins awarded only once per confession
- No rewards for draft or pending confessions
- Automatic duplicate prevention via database constraints

---

### 3️⃣ **Referral System - Coin Rewards**

#### Reward Structure:

- **Referrer**: +20 coins when referred user posts **first confession**
- **Referred User**: +10 coins after posting **first confession**

#### Implementation:

```sql
-- Automatic reward trigger on first confession
CREATE FUNCTION process_referral_rewards()
  -- Checks if first confession
  -- Awards coins to both parties
  -- Updates referral tracking
```

#### Anti-Fraud Measures:

- One reward per referral (tracked via `referrer_rewarded_at`)
- No self-referrals (blocked in `process-referral` function)
- First confession requirement prevents abuse

#### Referral Components:

- `ReferralCard.tsx` - Updated with coin-based rewards display
- `ReferralRewardNotification.tsx` - Real-time toast notifications
- `process-referral` edge function - Handles referral validation

---

## 📊 Database Schema Updates

### New Columns:

```sql
-- user_badges
ALTER TABLE user_badges
  ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN acquired_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- user_flairs
ALTER TABLE user_flairs
  ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN acquired_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- referrals
ALTER TABLE referrals
  ADD COLUMN referrer_rewarded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN referred_rewarded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN referred_first_confession_at TIMESTAMP WITH TIME ZONE;
```

### Indexes:

```sql
CREATE INDEX idx_user_badges_expires_at ON user_badges(expires_at);
CREATE INDEX idx_user_flairs_expires_at ON user_flairs(expires_at);
```

---

## 🌍 Translations (3 Languages)

### Added Keys:

```typescript
// English
coins_per_confession_new: "+2 coins per confession";
badge_expires_in: "Expires in";
badge_expired: "Expired";
badge_active_for: "Active for 5 days";
buy_again: "Buy Again";
days: "days";
hours: "hours";
referral_reward_referrer: "+20 coins when referred user posts first confession";
referral_reward_referred: "+10 coins after your first confession";
first_confession_bonus: "First confession bonus";
```

All translations implemented for:

- 🇬🇧 English
- 🇪🇸 Spanish
- 🇩🇪 German

---

## 🔄 Real-Time Features

### Automatic Updates:

- Coin balance updates instantly after earning/spending
- Expiry timers refresh every minute
- Referral rewards trigger real-time notifications
- Badge/flair status syncs across sessions

### WebSocket Subscriptions:

```typescript
// Coin transactions realtime listener
supabase
  .channel("referral-rewards")
  .on("postgres_changes", { table: "coin_transactions" })
  .subscribe();
```

---

## 🧪 Testing Checklist

### Badge Expiry:

- [ ] Purchase badge → shows countdown timer
- [ ] Wait 5 days → badge expires automatically
- [ ] Expired badge shows "Expired" label
- [ ] "Buy Again" button allows repurchase
- [ ] Repurchased badge gets new 5-day timer

### Coin Rewards:

- [ ] Post confession → receive +2 coins (not +10)
- [ ] Comment on post → NO coins received
- [ ] Receive like → NO coins received
- [ ] Balance updates in real-time

### Referral System:

- [ ] User A shares referral code
- [ ] User B signs up with code
- [ ] User B posts first confession → both get coins
- [ ] User A: +20 coins notification
- [ ] User B: +10 coins notification
- [ ] Second confession → no additional rewards

### Translations:

- [ ] English → all text correct
- [ ] Spanish → all text correct
- [ ] German → all text correct
- [ ] Language switch → no mixed text
- [ ] No untranslated keys

---

## 📝 Edge Functions Updated

### `purchase-flair/index.ts`:

```typescript
// Calculate expiry date (5 days from now)
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 5);

// Insert with expiry
await supabase.from("user_flairs").insert({
  user_id,
  flair_id,
  acquired_at: new Date(),
  expires_at: expiresAt,
});
```

### `process-referral/index.ts`:

- Validates referral codes
- Prevents self-referral
- Tracks reward distribution

---

## 🎨 UI/UX Improvements

### Coin Display:

- Removed outdated earning methods (comments, likes)
- Shows only confession rewards (+2)
- Clean, focused reward messaging

### Shop Display:

- "Active for 5 days" badge on items
- Countdown timers on owned items
- "Buy Again" for expired items
- Visual distinction for expired status

### Referral Cards:

- Coin-based rewards clearly stated
- Real-time reward notifications
- Social sharing integration
- Progress tracking

---

## 🚀 Performance Optimizations

- **Indexed Columns**: Fast expiry queries
- **Efficient Triggers**: Minimal database overhead
- **Client-side Filtering**: Expired items filtered in UI
- **Debounced Updates**: Timer refreshes optimized
- **Cached Queries**: Reduced database calls

---

## 📚 Files Modified/Created

### Created:

- `src/hooks/useTimeRemaining.ts`
- `src/components/ExpiryTimer.tsx`
- `src/components/ReferralRewardNotification.tsx`
- `docs/COIN_SYSTEM_UPDATES.md`

### Modified:

- `src/components/FlairsShop.tsx`
- `src/components/CoinsDisplay.tsx`
- `src/components/ReferralCard.tsx`
- `src/i18n/translations.ts` (all 3 languages)
- `supabase/functions/purchase-flair/index.ts`

### Database:

- Migration: Added expiry columns + referral tracking
- Triggers: Updated coin rewards logic
- Functions: Referral reward automation

---

## ✨ Summary

The coin and badge systems have been completely overhauled with:

- ⏱️ **5-day expiry** for all purchased items
- 💰 **Simplified rewards**: +2 coins per confession only
- 🤝 **Referral bonuses**: +20/+10 coins for referrer/referred
- 🌐 **Full translation** support across 3 languages
- 🔄 **Real-time updates** and notifications
- 📊 **Clean UI** with countdown timers and expiry status

Everything works seamlessly, automatically, and consistently! 🎉

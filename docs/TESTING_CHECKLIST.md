# 🧪 Coin & Badge System - Testing Checklist

## ✅ Quick Test Scenarios

### 1. Confession Rewards (+2 Coins)

- [ ] Post a new confession
- [ ] Check coin balance increases by +2 instantly
- [ ] Open coin history → see "New confession" entry
- [ ] Verify amount shows "+2" in green
- [ ] Test in all 3 languages (EN, ES, DE)

### 2. Time-Limited Badges (5 Days)

- [ ] Go to System Monitor → Coin System tab
- [ ] Run the test suite
- [ ] Navigate to Profile → Badges section
- [ ] Verify countdown timer shows for earned badges
- [ ] Check timer updates (wait 1+ minute)
- [ ] Test expired badge display (if any exist)
- [ ] Verify translations in all languages

### 3. Time-Limited Flairs (5 Days)

- [ ] Purchase a flair with coins
- [ ] See "Active for 5 days" label in shop
- [ ] Check owned flair shows countdown timer
- [ ] View flair in profile header
- [ ] Wait for expiry (or manually set in DB)
- [ ] Verify "Expired" label and "Buy Again" button
- [ ] Test in all languages

### 4. Referral System

- [ ] Get referral code from Profile → Referral System
- [ ] Share link with test user
- [ ] New user registers with referral code
- [ ] New user posts their first confession
- [ ] Verify referrer gets +20 coins (real-time toast)
- [ ] Verify new user gets +10 coins (real-time toast)
- [ ] Check both coin histories show correct entries
- [ ] Test notifications in all languages

### 5. Real-Time Updates

- [ ] Open app in two browser tabs (same user)
- [ ] Post confession in Tab 1
- [ ] See coin balance update in Tab 2 (no refresh)
- [ ] Purchase flair in Tab 1
- [ ] See balance decrease in Tab 2 instantly
- [ ] Verify countdown timers sync across tabs

### 6. Transaction History

- [ ] Click coins in header → opens history
- [ ] Verify all transactions show correct types:
  - "New confession" (+2)
  - "Referral reward" (+20)
  - "First confession bonus" (+10)
  - Flair/badge purchases (negative amounts in red)
- [ ] Check timestamps are readable
- [ ] Test in all languages

### 7. No More Rewards for Comments/Likes

- [ ] Like a confession → coin balance unchanged
- [ ] Comment on a confession → coin balance unchanged
- [ ] Verify no transactions logged for these actions

### 8. Multi-Language Consistency

- [ ] Switch language to Spanish → all text updates
- [ ] Check countdown timers show Spanish text
- [ ] Verify coin transaction descriptions are in Spanish
- [ ] Switch to German → repeat checks
- [ ] Switch back to English → verify no mixed text

---

## 🐛 Edge Cases to Test

### Expiry Logic

- [ ] Badge expires while user is viewing profile → updates automatically
- [ ] User tries to buy expired flair → purchase works
- [ ] Multiple badges expire on same day → all handled correctly

### Referral Fraud Prevention

- [ ] Same user can't refer themselves
- [ ] Referral reward only given once per referral
- [ ] Referred user must post confession (not just register)

### Coin Balance Edge Cases

- [ ] User with 0 coins can still view shop
- [ ] Insufficient coins → error message shown
- [ ] Coin deduction is atomic (no race conditions)

### Database Consistency

- [ ] All transactions logged in coin_transactions table
- [ ] Expired badges filtered from queries
- [ ] Real-time subscriptions don't duplicate data

---

## 📊 Performance Checks

- [ ] Badge expiry queries are fast (< 100ms)
- [ ] Real-time updates don't cause lag
- [ ] Countdown timers don't cause high CPU usage
- [ ] Large transaction history loads smoothly

---

## 🔐 Security Verification

- [ ] User can only see their own coins
- [ ] User can only see their own transactions
- [ ] RLS policies block unauthorized access
- [ ] Edge functions validate user authentication

---

## ✅ Final Acceptance

All tests passing? Check these final items:

- [ ] No console errors in browser
- [ ] No database errors in logs
- [ ] All translations are correct and complete
- [ ] Real-time updates work without refresh
- [ ] Mobile responsive (test on phone)
- [ ] System Monitor tests all pass

---

## 🚀 Production Ready Criteria

✅ All 8 test scenarios pass  
✅ All edge cases handled  
✅ Performance is acceptable  
✅ Security checks pass  
✅ Multi-language works perfectly  
✅ Real-time features work  
✅ No console errors

**Status: READY FOR PRODUCTION** 🎉

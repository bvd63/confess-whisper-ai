# 🔐 Cloudflare Turnstile CAPTCHA Setup Guide

Guide for enabling CAPTCHA protection using Cloudflare Turnstile in Confess+.

---

## 🌟 **Why Cloudflare Turnstile?**

- ✅ **Free** - Unlimited requests
- ✅ **Privacy-focused** - No personal data collection
- ✅ **User-friendly** - Better UX than traditional CAPTCHA
- ✅ **No tracking** - No cookies or fingerprinting
- ✅ **Fast** - Minimal impact on page load

---

## 📋 **Prerequisites**

1. ✅ Cloudflare Account (free tier works)
2. ✅ Domain (optional for testing)

---

## 🔑 **Step 1: Get Turnstile API Keys**

### Create Turnstile Site:

1. **Login to Cloudflare Dashboard**: [dash.cloudflare.com](https://dash.cloudflare.com)

2. **Navigate to Turnstile**:
   - Click "Turnstile" in left sidebar
   - OR go to: `https://dash.cloudflare.com/?to=/:account/turnstile`

3. **Add a Site**:
   - Click **"Add site"**
   - **Site name**: `Confess+ App`
   - **Domain**: `localhost` (for development) or your production domain
   - **Widget mode**: 
     - ✅ **Managed** (Recommended - auto-solves most challenges)
     - ⚠️ Non-interactive (Always invisible)
     - ⚠️ Invisible (Requires manual solve)
   
4. **Click "Create"**

5. **Copy your keys**:
   - **Site Key** (public, starts with `0x...`)
   - **Secret Key** (private, keep secure!)

---

## ⚙️ **Step 2: Configure Environment Variables**

### A. Frontend (.env):

```bash
# Cloudflare Turnstile CAPTCHA
VITE_TURNSTILE_SITE_KEY=0x4AAAAAAxxxxxxxxxxxx  # Your Site Key (public)
```

### B. Supabase Edge Functions:

Add to **Project Settings → Edge Functions → Secrets**:

```bash
TURNSTILE_SECRET_KEY=0x4BBBBBxxxxxxxxxxxx  # Your Secret Key (private)
```

---

## 🛠️ **Step 3: Enable CAPTCHA in Code**

### Already implemented! Just uncomment in `src/pages/Auth.tsx`:

**Current (DISABLED):**
```typescript
// CAPTCHA not required for now
// if (!captchaToken) {
//   newErrors.captcha = t.auth_captcha_failed;
// }
```

**Enabled:**
```typescript
// CAPTCHA validation for signup
if (!captchaToken) {
  newErrors.captcha = t.auth_captcha_failed;
}
```

---

## 🎯 **Current CAPTCHA Behavior**

The app already has Turnstile integrated with smart triggers:

### For **Signup**:
- ✅ CAPTCHA always shown
- Prevents automated bot registrations

### For **Login**:
- 🟢 First 3 attempts: No CAPTCHA (smooth UX)
- 🔴 After 3 failed attempts: CAPTCHA required
- Prevents brute-force attacks

---

## 🧪 **Step 4: Test the Integration**

### Development (Localhost):

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Sign Up:**
   `http://localhost:3000/auth`

3. **Turnstile should appear automatically**

4. **Use Test Keys (if needed):**
   - **Always passes:** `1x00000000000000000000AA` (already configured as fallback)
   - **Always fails:** `2x00000000000000000000AB`
   - **Interactive:** `3x00000000000000000000FF`

### Production:

1. **Update Turnstile domain** in Cloudflare Dashboard:
   - Add your production domain
   - OR use `*` for all domains (less secure)

2. **Deploy with production keys**

3. **Test signup flow** on live site

---

## 🔄 **Step 5: Verify Server-Side (Edge Function)**

Turnstile tokens must be validated on the server to prevent bypass.

### Check if validation exists:

Look for Edge Function: `enhanced-auth` or similar that validates captcha:

```typescript
// Server-side validation example
const verifyTurnstile = async (token: string) => {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      response: token,
    }),
  });
  
  const data = await response.json();
  return data.success;
};
```

If not implemented, CAPTCHA is currently **client-side only** (less secure).

---

## 📊 **Monitor CAPTCHA Analytics**

### View Turnstile Stats:

1. Go to **Cloudflare Dashboard → Turnstile**
2. Select your site
3. View metrics:
   - ✅ Solved challenges
   - ❌ Failed challenges
   - 📊 Challenge rate
   - 🕒 Response time

---

## 🚀 **Production Checklist**

Before enabling in production:

- [ ] Test mode disabled in Turnstile Dashboard
- [ ] Production domain added to allowed domains
- [ ] `VITE_TURNSTILE_SITE_KEY` configured in `.env`
- [ ] `TURNSTILE_SECRET_KEY` added to Supabase secrets
- [ ] Server-side validation implemented (recommended)
- [ ] CAPTCHA uncommented in `Auth.tsx` (line 81-83)
- [ ] Tested signup flow with real users
- [ ] Tested failed login → CAPTCHA trigger (3 attempts)
- [ ] Analytics monitored for abuse

---

## 🔍 **Troubleshooting**

### Issue: "Turnstile widget not loading"
**Solution:**
1. Check browser console for errors
2. Verify site key is correct
3. Ensure domain matches Cloudflare config
4. Check ad blockers aren't blocking Cloudflare

### Issue: "Invalid site key"
**Solution:**
1. Verify `VITE_TURNSTILE_SITE_KEY` in .env
2. Check key starts with `0x`
3. Ensure no spaces in key

### Issue: "CAPTCHA validation always fails"
**Solution:**
1. Check `TURNSTILE_SECRET_KEY` in Supabase
2. Verify server-side validation function exists
3. Test with browser network tab to see API response

### Issue: "Widget appears in wrong language"
**Solution:**
Add `language` prop to Turnstile component:
```typescript
<Turnstile
  siteKey={siteKey}
  language="auto" // or "en", "es", "de", etc.
  ...
/>
```

---

## 📚 **Additional Resources**

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Turnstile Widget Configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
- [Server-side Validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [React Turnstile Package](https://github.com/marsidev/react-turnstile)

---

## ⚡ **Quick Enable Commands**

```bash
# 1. Add to .env
echo "VITE_TURNSTILE_SITE_KEY=your_site_key_here" >> .env

# 2. Uncomment validation in Auth.tsx (manual step)

# 3. Test locally
npm run dev

# 4. Build for production
npm run build
```

---

## 🔒 **Security Best Practices**

1. **Always validate server-side** - Client-side can be bypassed
2. **Keep Secret Key secure** - Never commit to git
3. **Use managed mode** - Better UX than interactive
4. **Monitor analytics** - Watch for unusual patterns
5. **Rate limit endpoints** - Additional protection layer
6. **Log failed attempts** - Track potential attacks

---

**Status**: ✅ READY TO ENABLE
**Implementation**: ⚠️ Currently DISABLED (line 81-83 in Auth.tsx)
**Server Validation**: 🔍 Verify in `enhanced-auth` Edge Function

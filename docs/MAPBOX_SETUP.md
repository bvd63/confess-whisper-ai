# Mapbox Setup Guide

## Overview
The app uses Mapbox for location-based features including:
- Reverse geocoding (converting coordinates to city/country names)
- Nearby confessions discovery
- Future map view functionality

## Getting Your Mapbox Token

1. Go to [https://mapbox.com](https://mapbox.com)
2. Sign up for a free account or log in
3. Navigate to your Account Dashboard → Tokens
4. Copy your **Default public token** (starts with `pk.`)

## Configuration

### For Development (Client-Side)
The LocationPicker component uses the Mapbox Geocoding API from the client side.

**Option 1: Add via Lovable Settings**
1. Go to your project settings
2. Add environment variable: `VITE_MAPBOX_TOKEN`
3. Paste your Mapbox public token

**Option 2: Local Development**
Create a `.env` file in your project root:
```bash
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

### For Edge Functions (Server-Side)
If you create edge functions that need Mapbox:
1. The `MAPBOX_TOKEN` secret is already configured in Supabase
2. Access it in edge functions using:
```typescript
const mapboxToken = Deno.env.get('MAPBOX_TOKEN');
```

## Features Using Mapbox

### Location Picker
- Used in confession creation
- Converts GPS coordinates to readable location (city, country)
- Completely optional for users

### Nearby Confessions
- Finds confessions within a specified radius
- Shows distance from user's current location
- Requires location permissions

## Free Tier Limits
Mapbox free tier includes:
- 100,000 free requests per month for geocoding
- More than enough for most applications
- Monitor usage at [https://account.mapbox.com](https://account.mapbox.com)

## Security Note
The Mapbox **public token** is safe to use in client-side code. It's designed to be publicly visible and has domain restrictions you can configure in your Mapbox dashboard.

---

**Last Updated:** 2025-10-18

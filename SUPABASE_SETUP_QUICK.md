# Supabase Setup Quick Guide

## Problema Curentă
Aplicația nu poate face login/signup pentru că baza de date nouă (`maurqhwkhmmfigzdatsm`) nu are configurarea necesară.

## Soluție Rapidă - Configurare Supabase Dashboard

### 1. Dezactivează Email Confirmation (pentru testare)

1. Du-te la: https://supabase.com/dashboard/project/maurqhwkhmmfigzdatsm
2. Click pe **Authentication** în sidebar
3. Click pe **Providers** 
4. Scroll jos la **Email**
5. **Dezactivează** "Confirm email" (toggle OFF)
6. Click **Save**

### 2. Verifică dacă Auth funcționează

Acum poți testa:
- **Sign Up**: Creează cont cu email + parolă
- **Login**: Loghează-te direct (fără verificare email)

### 3. Următorii Pași (Opțional - Pentru Funcționalități Complete)

#### A. Instalează Supabase CLI

```bash
# Install Supabase CLI
curl -fsSL https://supabase.com/install.sh | sh

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref maurqhwkhmmfigzdatsm
```

#### B. Push Migrațiile

```bash
# Push all migrations to remote database
supabase db push

# Sau manual, rulează fiecare migrație în SQL Editor
```

#### C. Deploy Edge Functions

```bash
# Deploy enhanced-auth function
supabase functions deploy enhanced-auth

# Deploy alte functions
supabase functions deploy
```

## Alternative - SQL Manual Setup

Dacă nu vrei să instalezi CLI, poți rula manual migrațiile în **SQL Editor**:

1. Du-te la: https://supabase.com/dashboard/project/maurqhwkhmmfigzdatsm/sql
2. Copiază conținutul fișierelor din `supabase/migrations/` (în ordine cronologică)
3. Rulează fiecare query în SQL Editor

**⚠️ Atenție**: Sunt 180+ fișiere de migrare. Pentru testare rapidă, recomand doar dezactivarea email confirmation.

## Status Actual

✅ Credențiale Supabase configurate în `.env`:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY  
- VITE_SUPABASE_ANON_KEY

✅ Auth simplificat (fără enhanced functions) activat în cod

⏳ Email confirmation: **Trebuie dezactivat în Dashboard pentru testare**

## Test Rapid

După ce dezactivezi email confirmation:

1. Du-te la http://localhost:8080/auth
2. Click pe "Sign Up"
3. Introdu email și parolă
4. Ar trebui să te logheze automat

## Troubleshooting

### "Invalid login credentials"
- Verifică că ai dezactivat email confirmation
- Asigură-te că parola are min 8 caractere

### "User already registered"  
- Încearcă să te loghezi în loc de sign up
- Sau folosește alt email

### Console errors
- Deschide Developer Tools (F12)
- Verifică tab-ul Console pentru erori detaliate
- Verifică tab-ul Network pentru request-uri failed

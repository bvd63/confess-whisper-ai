

## Centrare perfecta a logo-ului ConfessAI in header

**Problema:** Logo-ul "ConfessAI" nu este centrat vizual perfect in header deoarece butoanele din dreapta (Crown, Coins, Notifications) ocupa mai mult spatiu decat cele din stanga, impingand textul spre stanga.

**Solutia:** Folosim pozitionare absoluta pentru logo, astfel incat sa fie mereu centrat indiferent de continutul din stanga/dreapta.

### Modificari in `src/components/AppHeader.tsx`

- Logo-ul (`<h1>` cu `<AppLogo />`) va primi `absolute left-1/2 -translate-x-1/2` pentru a fi centrat perfect in header
- Se elimina `flex-1 text-center` de pe logo si se adauga pozitionarea absoluta
- Containerul flex pastreaza `justify-between` cu un spacer in stanga pentru a mentine butoanele din dreapta pe pozitie

### Detalii tehnice

```
Container (flex, items-center, justify-between)
  ├── Left spacer (div gol sau back button)
  ├── Logo (absolute, left-1/2, -translate-x-1/2) -- centrat perfect
  └── Right buttons (Crown, Coins, Notifications)
```

Aceasta abordare garanteaza ca logo-ul ramane vizual la mijlocul header-ului pe orice dimensiune de ecran.




## Banner de Upgrade pentru utilizatorii Free

**Ce se schimba:** In loc sa aratam banner-ul doar in ultimele 3 zile de trial, vom afisa un banner persistent pentru toti utilizatorii FREE care nu au subscriptie VIP activa. Acesta ii va incuraja sa faca upgrade.

### Modificari necesare:

**1. Componenta `TrialBanner.tsx` -> redenumita/adaptata ca `UpgradeBanner`**
- Se va transforma intr-un banner generic care:
  - Pentru utilizatori cu trial activ: arata zilele ramase (comportamentul actual)
  - Pentru utilizatori FREE fara trial: arata un mesaj de upgrade ("Upgrade to VIP for premium features")
- Butonul de dismiss va folosi `sessionStorage` in loc de state simplu, ca sa nu apara la fiecare navigare in aceeasi sesiune, dar sa revina la urmatoarea deschidere a aplicatiei

**2. `App.tsx` - Conditia de afisare**
- Se va inlocui conditia actuala:
  ```
  trialStatus.isActive && daysRemaining <= 3
  ```
  cu o logica noua:
  - Daca utilizatorul este FREE (nu VIP, nu trial activ) -> arata banner de upgrade
  - Daca utilizatorul are trial activ -> arata banner cu zilele ramase (ca acum)
- Se va folosi `useVipStatus` pentru a verifica daca utilizatorul este free

**3. Detalii tehnice**
- Se importa `useVipStatus` in `AppContent` (deja disponibil in proiect)
- Banner-ul nu se afiseaza pentru utilizatori neautentificati (nu are sens)
- Dismiss-ul per sesiune se face cu `sessionStorage.setItem('upgrade_banner_dismissed', 'true')`
- La fiecare deschidere noua a aplicatiei, banner-ul reapare


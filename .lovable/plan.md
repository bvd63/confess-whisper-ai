

## Eliminare umbra decorativa din cardul "Current plan – FREE"

Voi sterge div-ul decorativ (shimmer/gradient vertical) pozitionat absolut pe partea stanga a cardului "Current plan – FREE" din `src/components/UnifiedShopDialog.tsx` (liniile ~281-293).

### Detalii tehnice
- **Fisier:** `src/components/UnifiedShopDialog.tsx`
- **Actiune:** Stergerea div-ului cu gradient vertical (`from violet-400 via blue-400 to violet-400`) care are `position: absolute`, `left: 0`, `width: 3px` si `filter: blur(3px)`
- Nicio alta modificare nu va fi facuta — layout, spatiere, text si butoane raman neschimbate.


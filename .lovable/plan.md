

## Relaxare limite rate-limiting

Valorile actuale sunt destul de restrictive. Iata propunerea de noi valori mai relaxate:

| Actiune | Actual | Propus |
|---------|--------|--------|
| login | 8 / 1 min | 20 / 1 min |
| auth_login | 8 / 1 min | 20 / 1 min |
| auth_signup | 5 / 5 min | 10 / 5 min |
| auth_password_reset | 5 / 5 min | 10 / 5 min |
| auth_refresh | 30 / 1 min | 60 / 1 min |
| confession_create | 10 / 1 min | 20 / 1 min |
| comment_create | 20 / 1 min | 40 / 1 min |
| message_send | 30 / 1 min | 60 / 1 min |
| ai_request | 5 / 1 min | 15 / 1 min |
| ai_response_free | 3 / 1 min | 10 / 1 min |
| ai_response_vip | 10 / 1 min | 30 / 1 min |
| report_confession | 3 / 5 min | 5 / 5 min |
| default | 50 / 1 min | 100 / 1 min |

### Modificare

Un singur fisier: `supabase/functions/rate-limit/utils.ts` -- se actualizeaza valorile `maxAttempts` din obiectul `RATE_LIMIT_CONFIGS`.

Cele mai importante relaxari sunt pe `login` si `auth_login` (de la 8 la 20 incercari pe minut), care au cauzat eroarea 429 pe care ai primit-o.


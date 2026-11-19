# Generator ofert ATRIA

CRM obsługuje OpenAI, Claude i Gemini przez osobny Cloudflare Worker. Każdy dostawca ma własny klucz i rozliczenia API. Możesz uruchomić jednego dostawcę albo wszystkich trzech.

## Wdrożenie

W katalogu tego Workera:

```sh
npx wrangler login
npx wrangler deploy
npx wrangler secret put ATRIA_AI_TOKEN
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GEMINI_API_KEY
```

Ustaw tylko klucze dostawców, z których chcesz korzystać. Kod ATRIA_AI_TOKEN to osobny losowy kod dostępu do generatora, od 32 do 128 znaków (litery, cyfry, myślnik lub podkreślenie). Ustaw go w Cloudflare i wpisz ten sam kod na swoich urządzeniach. Klucze dostawców wpisuj wyłącznie jako sekrety w Cloudflare. Zmiana kodu w Cloudflare odłącza urządzenia używające dawnego kodu.

Adres HTTPS Workera z polecenia deploy wklej w Agencie ATRIA w CRM → Oferty → edycja oferty → Stwórz ofertę z AI → Połączenie z generatorem. Wpisz kod i kliknij Połącz. Kod dostępu do generatora jest zapisywany w przeglądarce na tym urządzeniu. Kliknięcie Usuń połączenie usuwa lokalny zapis.

Modele można zmienić w zmiennych Workera OPENAI_MODEL, ANTHROPIC_MODEL i GEMINI_MODEL. Generator wysyła tylko wskazane pola nieruchomości i cechy wpisane ręcznie. Zwraca tytuł, opis, skrót i listę brakujących informacji. Zapis oferty wymaga osobnego zatwierdzenia w formularzu CRM.

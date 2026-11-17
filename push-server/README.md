# Prywatny serwer Web Push dla obu aplikacji

Frontend obu aplikacji i service workery obsługują Web Push. Ten katalog zawiera wspólną usługę Cloudflare Workers + KV. Nie została wdrożona automatycznie: potrzebny jest dostęp do konta Cloudflare, KV i sekretów. Sam GitHub Pages nie uruchamia kodu serwera.

## Co przechowuje

Losowy identyfikator urządzenia, subskrypcję Web Push (endpoint i klucze urządzenia), wybraną aplikację i harmonogram. Dla ADHD również datę osiągnięcia celu wody, aby powstrzymać przypomnienia tego dnia. Bez nazw kontaktów, zadań, notatek i prowizji. Wysyłane treści są ogólne.

Subskrypcje wygasają po 180 dniach bez odświeżenia. Dostęp do endpointów wymaga prywatnego tokenu min. 24 znaki. Token i prywatny klucz VAPID są sekretami środowiska, nigdy plikami repozytorium.

## Wdrożenie na własnym koncie

Z katalogu push-server:

~~~sh
npm install
npx wrangler login
npx wrangler kv namespace create SUBSCRIPTIONS
~~~

Wpisz zwrócony identyfikator KV do wrangler.jsonc. Wygeneruj klucze VAPID jednorazowo lokalnie:

~~~sh
npx web-push generate-vapid-keys --json
~~~

Ustaw sekrety przez interaktywne polecenia (bez dopisywania wartości do plików ani historii powłoki):

~~~sh
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
npx wrangler secret put PUSH_ACCESS_TOKEN
~~~

VAPID_SUBJECT to kontakt administratora w formacie mailto: lub własny adres HTTPS. PUSH_ACCESS_TOKEN powinien mieć co najmniej 32 losowe znaki; używasz go tylko w ustawieniach własnych aplikacji. Nie publikuj go w konfiguracji frontendu.

~~~sh
npx wrangler deploy
~~~

Po wdrożeniu: w każdej aplikacji Ustawienia → Powiadomienia i przypomnienia → Push przy zamkniętej aplikacji. Wpisz adres workera i prywatny token. Kliknij Połącz push, zezwól w systemie, ustaw harmonogram i naciśnij Włącz / zapisz. Wyślij test.

Na iPhonie używaj wersji dodanej do ekranu początkowego iOS z obsługą Web Push. Zgoda na powiadomienia jest zawsze decyzją użytkownika.

## Sprawdzenie po wdrożeniu

1. Wyślij test z obu aplikacji.
2. Zamknij aplikację i sprawdź zaplanowaną godzinę.
3. Dla ADHD zapisz 10 porcji wody; przypomnienia o wodzie tego dnia powinny ustać po synchronizacji.
4. Wyłącz przypomnienia, następnie sprawdź brak kolejnych wiadomości.
5. Odłącz push i sprawdź usunięcie subskrypcji.

Cron pracuje co 5 minut. Przypomnienia mają okno dostarczenia 5 minut i TTL 5 minut. KV ma spójność eventual, więc pojedyncza opóźniona lub powtórzona wiadomość jest możliwa przy równoległych wywołaniach lub opóźnionym rozchodzeniu zapisu. To przypomnienia pomocnicze, bez gwarancji terminu doręczenia.

Aplikacja musi być otwarta do synchronizacji zmienionego harmonogramu i osiągnięcia celu wody. Po skutecznym zapisie serwer zna aktualny stan również po zamknięciu aplikacji. Jeśli urządzenie było offline przy osiągnięciu celu, push o wodzie może przyjść do czasu kolejnej udanej synchronizacji.

## Źródła implementacji

- https://github.com/web-push-libs/web-push
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/

Użyta wersja web-push: 4.0.0, API generateRequestDetails. Worker korzysta z nodejs_compat i wysyła wygenerowane żądania przez fetch. Serwer wymaga testu integracyjnego na koncie docelowym; testy aplikacji nie potwierdzają rzeczywistego dostarczenia push.

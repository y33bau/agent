# Synchronizacja obu aplikacji

Worker `wellbeing-sync` używa SQLite Durable Objects do atomowego zapisu wersji. Każda aplikacja i kod parowania mają oddzielny skarbiec. Dane są szyfrowane AES-GCM w przeglądarce, serwer przechowuje tylko szyfrogramy i numer rewizji. Zapis ze starą rewizją zwraca 409. Klucz usługi jest sprawdzany przed utworzeniem jakiegokolwiek obiektu.

Wdrożenie: `npx wrangler deploy` z tego katalogu, następnie `npx wrangler secret put SYNC_ACCESS_TOKEN`. Użyj prywatnego klucza usługi powiadomień, bez wpisywania go do repozytorium. Konto i uprawnienia Cloudflare wymagają autoryzacji operatora. Do testowania lokalnego ustaw sekret w ignorowanym `.dev.vars`.

Parowanie: po podłączeniu powiadomień wybierz w ustawieniach aplikacji „Utwórz kod parowania”. Na drugim urządzeniu wybierz „Wpisz kod z drugiego urządzenia”. Kod zawiera klucz dostępu do prywatnej usługi i losowy klucz szyfrowania. Nie udostępniaj go publicznie. Zmiany z chmury wymagają wyboru wersji, a klient zachowuje trzy lokalne kopie sprzed zastąpienia. Zdjęcia IndexedDB i pobrane nagrania nie są synchronizowane.

Każdy kolejny zapis jest automatycznie wysyłany po krótkiej przerwie, o ile kod jest skonfigurowany i nie ma konfliktu. Synchronizacja nie jest edycją zespołową ani automatycznym scalaniem rekordów.

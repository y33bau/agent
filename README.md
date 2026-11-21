# ATRIA CRM

CRM dla biura nieruchomości: klienci, sprawy, oferty, prezentacje, umowy pośrednictwa i dokumenty w jednym miejscu. Działa offline jako PWA na telefonie i komputerze.

## Funkcje

- **Dziś**: zaległe i dzisiejsze kontakty, prezentacje, umowy kończące się w ciągu 14 dni, dokumenty do zebrania i liczby biura.
- **Klienci**: lejek spraw (etap, rola, rejon, nieruchomość, budżet), wyszukiwarka i filtry.
- **Karta klienta 360°**: Zadzwoń, SMS, WhatsApp i e-mail jednym przyciskiem; po telefonie od razu zapis wyniku. Jedna oś czasu z rozmowami, notatkami, wiadomościami, ofertami, dokumentami, prezentacjami i umową.
- **Oferty**: statusy, szkic opisu z AI, eksport oferty do HTML.
- **Prezentacje**: termin łączy oglądającego z ofertą; po prezentacji zapisujesz zainteresowanie, ocenę i opinię. Z opinii powstaje raport dla sprzedającego. Termin zapiszesz do kalendarza (.ics).
- **Kojarzenie**: oferty „Gotowa” i „Opublikowana” dobierane do kryteriów kupującego (rodzaj, rejon, budżet, metraż) i pasujący kupujący przy ofercie. Listę ofert wysyłasz jednym przyciskiem.
- **Umowa i transakcja**: umowa pośrednictwa (wyłączność, numer, okres, prowizja w %) i checklista transakcji od księgi wieczystej do protokołu zdawczo-odbiorczego.
- **Szablony wiadomości** z polami {imię}, {agent}, {biuro}, {oferta}, {lokalizacja}, {cena}, {data}, {dokumenty}, {telefon}. Wysłana wiadomość trafia do historii klienta.
- **RODO**: daty zgód i ich podstawa, usunięcie klienta razem z jego sprawami, ofertami, dokumentami, plikami i prezentacjami.
- **Import leadów** z CSV albo wierszy wklejonych z Excela (np. z bazy leadów z ogłoszeń). Telefony są normalizowane, duplikaty pomijane.
- **Raporty**: lejek leadów z okresu, źródła leadów, tempo pracy, prezentacje i prowizje z 6 miesięcy.
- **Tryb gry** (domyślnie wyłączony, w ustawieniach): XP, żetony, misje, nagrody, Imperium i Teren. Wyłączenie niczego nie usuwa z zapisanych danych.
- Powiadomienia, szyfrowana synchronizacja, kopia danych i ochrona przed wyczyszczeniem pamięci przeglądarki.
- Brak zewnętrznych bibliotek/CDN.

## Publikacja

Statyczna strona GitHub Pages z katalogu głównego. Nie wymaga budowania.
Adres: https://y33bau.github.io/agent/

Dane są zapisane lokalnie w przeglądarce pod kluczem agent_empire_v2. Nie są wysyłane do repozytorium. Eksport zawiera kontakty, więc traktuj plik jako prywatny. Kopię wykonujesz w ustawieniach.

Stare klucze realestate_agent i realestate_quests pozostają nienaruszone. Dawne gold stają się żetonami gry; nie są migrowane jako rzeczywista prowizja. Ukończone stare misje nie przyznają nagrody ponownie.

## Reguły trybu gry

| Działanie | XP | Żetony | Wpływ |
| --- | ---: | ---: | ---: |
| Telefon, niezależnie od wyniku | 15 | 10 | 1 |
| Follow-up | 20 | 15 | 1 |
| Spotkanie | 60 | 40 | 3 |
| Pozyskana umowa | 120 | 90 | 5 |
| Publikacja oferty | 70 | 50 | 3 |
| Transakcja | 250 | 180 | 10 |

Żetony nie są pieniędzmi. Kwoty transakcji wpisujesz samodzielnie; aplikacja nie łączy się z bankiem ani CRM. Zmiana etapu lejka nie daje punktów. Umowa, oferta i sprzedaż mogą być nagrodzone raz na kontakt. Kolejną nieruchomość prowadź jako osobny kontakt/sprawę.

Własne misje mają stały budżet podzielony pomiędzy kroki. Po rozpoczęciu nie zmienisz budżetu, cyklu ani kroków. Podstawowe potrzeby i odpoczynek nie wymagają żetonów. Nie ma kar za przerwę lub brak aktywności.

Cofnięcie wpisu odwraca nagrodę i prowizję. Nie zmienia automatycznie etapu kontaktu. Cofanie jest blokowane, jeśli spowoduje ujemne saldo albo unieważni odebrany bonus dzienny. Cel odebranego bonusu jest utrwalony i nie zmienia się przy późniejszej edycji ustawień.

Timer nie blokuje aplikacji i nie nalicza punktów za sam upływ czasu. Działania zapisuj osobno.

## Uruchomienie i testy

Node.js 22+, bez zależności:

~~~sh
npm run check
npm test
~~~

Testy obejmują rozdzielenie walut, idempotencję zapisów, cofanie, dzienne bonusy, misje, migrację, timer, walidację importu oraz generowanie widoków z atrapą DOM. Nie zastępują testów wizualnych i urządzeń.

PWA offline działa po pierwszym pełnym załadowaniu przez HTTPS. Aktualizacja service workera aktywuje się po zamknięciu starych kart. Przy zmianach zwiększ CACHE w sw.js. Dane między urządzeniami przenosi się plikiem; synchronizacji kont nie ma.


## Powiadomienia (v2.1)

Ustawienia → Powiadomienia i przypomnienia. Zgoda systemowa jest pytana dopiero po naciśnięciu przycisku. Przypomnienia lokalne działają przy otwartej aplikacji, w wybranych godzinach; nie są push po jej zamknięciu. iPhone wymaga aplikacji dodanej do ekranu początkowego.

Prawdziwy Web Push jest obsługiwany przez service worker i panel połączenia. Wymaga uruchomienia prywatnej usługi z katalogu push-server w repozytorium agent, kluczy VAPID i wpisania jej adresu oraz klucza dostępu. Bez tego aplikacja uczciwie pokazuje, że działa tylko tryb lokalny. Serwer otrzymuje subskrypcję urządzenia i harmonogram, bez treści zadań, kontaktów i prowizji.

## Ochrona danych

Plik `storage-guard.js` (identyczny w agent i RPG-ADHD) przy pierwszym zapisie prosi przeglądarkę o trwałe przechowywanie (`navigator.storage.persist()`). W Ustawieniach pokazuje, czy dane są chronione i kiedy pobrano ostatnią kopię. Gdy kopia jest starsza niż 7 dni, raz dziennie przypomina o niej krótkim komunikatem. Synchronizacja zapamiętuje skrót SHA-256 ostatniego stanu zamiast jego pełnej kopii, więc nie zajmuje drugi raz miejsca w localStorage.

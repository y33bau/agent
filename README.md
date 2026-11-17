# AGENT EMPIRE

Centrum dowodzenia dla agenta nieruchomości. Ciemna zieleń, szampańskie złoto i warstwa RPG powiązana z rzeczywistą pracą.

## Funkcje

- Pulpit z dziennymi telefonami, rozmowami, spotkaniami i umowami z ostatnich 7 dni.
- Rejestr działań: telefon z wynikiem, follow-up, spotkanie, umowa, publikacja oferty, transakcja.
- Lokalny lejek kontaktów: etap, telefon, rejon, nieruchomość, notatki i następny krok z datą.
- Prowizje zapisane przy transakcjach, osobno od żetonów gry; cel miesiąca w ustawieniach.
- Dzienny kontrakt: trzy cele, każdy bonus raz na dzień; ustawiane limity.
- Własne misje i małe kroki, codzienne powtarzanie oraz gotowe szablony.
- Imperium: siedziba, studio ofert i sieć kontaktów, po trzy poziomy za wpływ.
- Poziomy agenta, odznaki, historia aktywności, zakupy nagród i wykres 7 dni.
- Timer akwizycji 5/15/25/45 minut, pauza i odtwarzanie po odświeżeniu.
- Własne nagrody, import/eksport, automatyczna migracja starego zapisu.
- PWA, offline, obsługa telefonu i desktopu, ograniczony ruch i opcjonalne dźwięki.
- Brak backendu i zewnętrznych bibliotek/CDN.

## Publikacja

Statyczna strona GitHub Pages z katalogu głównego. Nie wymaga budowania.
Adres: https://y33bau.github.io/agent/

Dane są zapisane lokalnie w przeglądarce pod kluczem agent_empire_v2. Nie są wysyłane do repozytorium. Eksport zawiera kontakty, więc traktuj plik jako prywatny. Kopię wykonujesz w ustawieniach.

Stare klucze realestate_agent i realestate_quests pozostają nienaruszone. Dawne gold stają się żetonami gry; nie są migrowane jako rzeczywista prowizja. Ukończone stare misje nie przyznają nagrody ponownie.

## Reguły

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

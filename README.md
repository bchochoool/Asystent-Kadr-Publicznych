# Asystent Kadr Publicznych

Cyfrowy asystent ocen okresowych dla służby cywilnej. Przełożony ustala z pracownikiem kryteria, dokumentuje konkretne działania, przygotowuje rozmowę i sporządza ocenę. Pracownik ma własny widok i osobno potwierdza zapoznanie się z kryteriami oraz wynikiem. Kadry koordynują terminy i obieg arkuszy.

**HackNation 2026 · wyzwanie KPRM „Cyfrowy Asystent Ocen Okresowych”.**

## Demo dla jury

**[Pobierz interaktywne demo HTML](https://github.com/bchochoool/Asystent-Kadr-Publicznych/raw/refs/heads/main/docs/index.html)** i otwórz pobrany plik w aktualnym Chrome, Edge lub Firefox. Demo jest samodzielne, zawiera fikcyjne dane i działa bez internetu. Zmiany dotyczą bieżącej karty przeglądarki. W razie podglądu kodu na GitHubie wybierz **Download raw file**.

| Materiał | Co można sprawdzić |
| --- | --- |
| [Prezentacja PDF](docs/prezentacja.pdf) | Problem, proces, przykład działania reguł i sposób wdrożenia. |
| [Film demonstracyjny](docs/demonstracja.webm) | Rzeczywisty przebieg oceny z polskimi napisami. |
| [Treść do HackTribe i scenariusz pokazu](docs/zgloszenie.md) | Opis projektu i kolejność działań podczas prezentacji. |

**Pierwsza sprawa.** Na pulpicie Marty wybierz **Otwórz sprawę** przy Lenie Nowak. Partner HR powiąże pytania i propozycje działań z trzema obserwacjami. W zakładce **Przebieg oceny** wskaż punkty, uzupełnij wnioski rozwojowe i zatwierdź ocenę. Przejdź do widoku Leny, potwierdź zapoznanie, a następnie otwórz **Arkusz i historia**.

**Pełny cykl od zera.** Wróć do roli Marty i wybierz **Nowy arkusz → Olga Kania**. Wprowadź dane stanowiska, ustal oczekiwania i przekaż kryteria. Potwierdź je jako Olga, wróć jako Marta i dodaj obserwację. Dalsze kroki są takie same jak w sprawie Leny. W widoku Ewy Maj można obsłużyć zdarzenia kadrowe i zarejestrować rozstrzygnięcie sprzeciwu.

## Wersja serwerowa

Wymaga Node.js 24 lub nowszego z modułem `node:sqlite`. Kod korzysta z biblioteki standardowej Node.js i API przeglądarki. Uruchom polecenia w katalogu repozytorium.

```sh
npm start
```

Otwórz **[127.0.0.1:4173](http://127.0.0.1:4173)**. Domyślnie przeglądarka otrzymuje osobny zestaw danych demonstracyjnych. Serwer zapisuje zmiany w SQLite, a wygasłe przestrzenie demonstracyjne usuwa podczas sprzątania sesji. Po uruchomieniu serwer obsługuje aplikację lokalnie, z tego samego źródła co API.

### Imienne konta i współdzielona baza urzędu

Najpierw utwórz przełożonego, potem podległe mu konto. Narzędzie wypisuje jednorazowo wygenerowane hasło. Przykład w PowerShell:

```powershell
$env:AKP_MODE = "office"
npm run account -- manager marta "Marta Wolska"
npm run account -- employee lena "Lena Nowak" marta
npm run account -- hr ewa "Ewa Maj"
npm start
```

Na Linuxie i macOS ustaw tryb przez `export AKP_MODE=office`. W trybie urzędu aplikacja oczekuje na logowanie. Każdy pracownik widzi własne arkusze, przełożony przypisane sprawy, a kadry dokumentację i zdarzenia. Prywatne obserwacje oraz robocze treści oceny są dostępne przełożonemu. Pracownik i kadry otrzymują treść po jej zatwierdzeniu. Przełączenie kont w demonstracji nie przyznaje dostępu do bazy urzędu.

| Zmienna | Znaczenie |
| --- | --- |
| `AKP_MODE` | `demo` (domyślnie) lub `office`. |
| `AKP_DB` | Plik SQLite, domyślnie `data/asystent.sqlite`. Przy tworzeniu kont i uruchomieniu serwera użyj tej samej ścieżki. |
| `HOST`, `PORT` | Domyślnie `127.0.0.1` i `4173`. |
| `AKP_HTTPS=1` | Flaga Secure dla ciasteczek po skonfigurowaniu HTTPS na reverse proxy urzędu. Proxy powinno zachować oryginalny nagłówek Host. |

## Proces i reguły

| Etap | Co robi aplikacja |
| --- | --- |
| Część I | Dobiera A dla kierownika urzędu, B dla osoby bezpośrednio kierującej pracownikami, C dla pozostałych stanowisk. Ładuje kryteria obowiązkowe i dopuszcza do trzech różnych dodatkowych. Rejestruje rozmowę, oczekiwania, termin i potwierdzenie pracownika. |
| Obserwacja i rozmowy | Zachowuje datę, kryterium, opis działania i skutek. Przygotowuje scenariusz rozmowy rozpoczynającej, bieżącej i oceniającej. Pokazuje kryteria, dla których brakuje jeszcze przykładów. |
| Partner HR | Dla oznaczonego przez przełożonego przykładu podpowiada pytanie i działanie. Pozwala przenieść fakty do edytowalnego uzasadnienia lub propozycję ćwiczenia do IPRZ. Działa lokalnie na jawnych regułach. Punktację wybiera człowiek. |
| Część II | Wylicza średnią oraz poziom z ocen 1, 3, 5, 7, 9. Pojedyncza jedynka oznacza wynik negatywny. Waliduje kompletność punktacji, uzasadnienie oceny negatywnej i wnioski do IPRZ. |
| Część III | Umożliwia umotywowany wniosek przy pozytywnej ocenie urzędnika mianowanego, z rokiem mianowania, dotychczasowym stopniem i datą jego przyznania. Dziewiąty stopień zamyka możliwość wniosku o kolejny. |
| Zdarzenia i terminy | Obsługuje zmianę przełożonego i istotną zmianę stanowiska, okresy usprawiedliwionej nieobecności, wniosek o zmianę terminu i zawiadomienie. Przy obliczeniach uwzględnia weekendy, święta i koniec miesiąca. |
| Po ocenie | Rejestruje zapoznanie, sprzeciw i decyzję dyrektora wprowadzoną przez kadry. Zachowuje wcześniejszy arkusz przy uwzględnieniu sprzeciwu. Kolejny cykl może pobrać wynik poprzedniego. |
| Dokumenty | Eksportuje formalną treść arkusza jako HTML i przez okno drukowania do PDF. Generuje zdarzenie kalendarzowe ICS z przypomnieniem. Zawiadomienia o zmianie terminu dołącza do wydruku. |

## Pilotaż w urzędzie

Prototyp przewiduje pojedynczą instancję urzędu. Serwer sprawdza tożsamość, podległość, wersję sprawy i dopuszczalną kolejność czynności. Zapis wraz z historią odbywa się w transakcji SQLite. Hasła są przechowywane jako skróty z solą (scrypt), a identyfikatory sesji w bazie jako skróty SHA-256. Baza i kopie zapasowe wymagają ochrony przez administratora hosta.

Przed użyciem danych pracowniczych urząd ustala retencję i podstawy przetwarzania, weryfikuje reguły z kadrami, konfiguruje HTTPS, kopie zapasowe i ich odtwarzanie. Potwierdzenia w prototypie rejestrują czynność użytkownika. Podpis właściwy dla urzędu, doręczenie i złożenie dokumentu do akt odbywają się w jego obiegu. Integracja z EZD ma obecnie formę przekazania wyeksportowanego dokumentu. Produkcyjne SSO, podpis elektroniczny i automatyczna wysyłka poczty to zakres dalszej integracji. Dane demo w pliku HTML są jawne i przeznaczone wyłącznie do demonstracji.

**Pomiar pilotażu.** Na porównywalnych fikcyjnych sprawach można zmierzyć czas przygotowania arkusza, liczbę korekt formalnych i odsetek ustaleń rozwojowych powiązanych z obserwacją. Repozytorium zawiera działający prototyp. Wyniki badań w urzędach pozostają do zebrania.

## Weryfikacja i modyfikacje

```sh
npm test
npm run demo
```

Pierwsze polecenie uruchamia testy procesu i API z tymczasową bazą. Drugie odtwarza `docs/index.html` z tego samego kodu interfejsu i reguł procesu co serwer. Gotowy plik można również serwować ze zwykłego hostingu statycznego.

- [Reguły oceny i kalendarz](public/rules.mjs) oraz [przejścia między etapami](lib/process.mjs).
- [Wybór osób, uprawnienia widoków i kolejne cykle](lib/registry.mjs).
- [Reguły Partnera HR](public/partner.mjs) i [wydruk](public/print.mjs).
- [Serwer HTTP](server.mjs), [baza danych](lib/db.mjs) i [testy](test).

Aktualizacja zasad wymaga przeglądu ich źródeł, testów brzegowych i migracji otwartych spraw, jeśli przepisy przejściowe tego wymagają. Arkusze przechowują identyfikator zestawu reguł. Automatyczna migracja między przyszłymi wersjami prawa pozostaje zadaniem wdrożeniowym.

## Źródła merytoryczne

- [Zadanie KPRM, przypadki użycia, schemat procesu, wzory arkuszy i przykłady](https://drive.google.com/drive/folders/11ktukNIJQlsKBVGV7rmUNSUYOd2_M9cK).
- [Ustawa o służbie cywilnej, tekst jednolity wskazany w zadaniu](https://eli.gov.pl/eli/DU/2026/590/ogl), w szczególności art. 81–83, 89 i 108.
- [Rozporządzenie Prezesa Rady Ministrów z 4 kwietnia 2016 r. i załączniki](https://eli.gov.pl/eli/DU/2016/470/ogl).
- [Przewodnik uczestnika HackNation 2026](https://hacknation.pl/przewodnik-uczestnika).

Fikcyjne osoby i obserwacje przygotowano na potrzeby pokazu. Przy implementacji i opracowaniu materiałów korzystano z asysty AI.

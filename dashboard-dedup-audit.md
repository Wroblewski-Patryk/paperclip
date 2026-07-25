# Audyt dashboardu: deduplikacja i styl Paperclip

Data: 2026-07-25
Widok: `http://127.0.0.1:3200/LUC/dashboard`

## Materiał dowodowy

- Stan początkowy: `report/dashboard-dedup-before-1920x878.png`
- Stan finalny: `report/dashboard-dedup-final-a11y-1920x878.png`
- Porównanie przed/po: `report/dashboard-dedup-comparison-final-1920x878.png`
- Niższa część dashboardu: `report/dashboard-orientation-final-1920x878.png`
- Sprawdzone rozmiary: `1920 x 878` oraz `1440 x 900`

## Mapa odpowiedzialności

| Sekcja | Jedyna odpowiedzialność | Dane |
| --- | --- | --- |
| Innovation portfolio | prawda techniczna i granica komercyjna produktów w innowacjach | runtime, mapa projektu, kontrakt sprzedażowy, następna bramka |
| Operational pulse | bieżąca zdolność wykonawcza firmy | agenci, praca w toku, koszt API, aktywne uruchomienia |
| Owner queue | sprawy wymagające uwagi lub decyzji właściciela | akceptacje, incydenty budżetowe, blokady, limit dostawcy, decyzje |
| Control freshness | wiarygodność i granice autonomii | czas obserwacji, lokalna praca, chroniony push/deploy |
| Recent autonomous work | co agenci faktycznie ostatnio wykonywali | agent, zadanie, profil modelu, wynik uruchomienia |
| Company orientation | kierunek firmy oraz dodatkowe sygnały | cele, projekty, targety, przeglądy i sygnały nieobecne w Owner queue |

## Usunięte duplikacje

1. Usunięto górny alert powtarzający `Pending approvals` i `Budget incidents`.
2. `Provider quota used` pozostawiono wyłącznie w `Owner queue`; w pulsie zastąpiły go `Live runs`.
3. `Live runs` usunięto z `Control freshness`.
4. Szczegół `Blocked` usunięto z `Work in progress`; blokady pozostają w `Owner queue`.
5. `Company orientation` nie powtarza już liczby blokad, dostępnych agentów, akceptacji ani incydentów budżetowych.

## Styl

- Nowe główne powierzchnie korzystają z tego samego zestawu co karty pracy agentów: `border-border`, `bg-background/70`, `shadow-sm`, `rounded-xl`.
- Kolor firmy pozostał ornamentem i sygnałem stanu: gradienty nagłówków, ikony, aktywny etap cyklu życia i aktywne uruchomienie agenta.
- Usunięto dominujące szare wypełnienie nowych kart bez tworzenia osobnego motywu dashboardu.
- Aktywne uruchomienia używają koloru firmy zamiast stałego cyjanu.

## Dostępność i hierarchia

- Usunięto zduplikowany region dostępności `Innovation portfolio`.
- `Innovation portfolio`, `Operational pulse`, `Owner queue`, `Recent autonomous work` i `Company orientation` mają jednoznaczne nagłówki.
- Zachowano opisowe etykiety linków oraz wartości tekstowe niezależne od koloru.
- Nie wykonano pełnego audytu czytnikiem ekranu ani testu kontrastu narzędziem pomiarowym; sprawdzono strukturę dostępności przeglądarki i widoczny stan.

## Wynik kroków

1. Centrum innowacji — zdrowe; prawda techniczna i komercyjna pozostają rozdzielone.
2. Puls operacyjny — zdrowy; zawiera wyłącznie dane wykonawcze.
3. Kolejka właściciela — zdrowa; jest jedynym miejscem dla danych wymagających uwagi.
4. Praca agentów — zdrowa; zachowuje oryginalny charakter Paperclipa i lepiej wykorzystuje akcent firmy.
5. Orientacja firmy — zdrowa; pokazuje kierunek i dodatkowe, nieduplikowane sygnały.

final result: passed

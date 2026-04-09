# Feature Ideas

Ideeën voor toekomstige uitbreidingen van de Home Inventory app.

## Snel te bouwen

### 1. Verloopdata / houdbaarheidsdatum
Optioneel `expires_at` veld op producten. Waarschuwing op het dashboard als iets bijna verloopt. Helpt voedselverspilling voorkomen.

**Status:** Migratie aanwezig (`006_expires_at.sql`), UI nog niet gebouwd.

### 2. Favorieten / veelgebruikte producten
Pin je meest gebruikte producten bovenaan het dashboard voor snelle +/- acties.

### 3. Notities op de boodschappenlijst
Extra context bij shopping items, bijv. "Albert Heijn heeft aanbieding" of "het grote pak".

---

## Medium effort

### 4. Recepten & ingrediënten
Voeg recepten toe met benodigde producten. Eén klik om alle ontbrekende ingrediënten aan de boodschappenlijst toe te voegen. Bonus: automatisch voorraad aftrekken als je een recept "kookt".

### 5. Verbruiksstatistieken
Grafieken op basis van `stock_changes`: hoeveel melk gebruik je per week? Wanneer moet je waarschijnlijk opnieuw kopen? Simpele voorspelling op basis van gemiddeld verbruik.

### 6. Meerdere opslaglocaties
Koelkast, vriezer, kelder, badkamer. Filter per locatie, zie in één oogopslag wat waar staat.

### 7. Gedeeld huishouden
Meerdere PINs/gebruikers zodat je kunt zien wie wat heeft toegevoegd of opgegeten. Handig voor huisgenoten.

---

## Ambitieus

### 8. Slimme boodschappenlijst met aanbiedingen
Koppel met een supermarkt-API (bijv. Albert Heijn, Jumbo) om te tonen welke producten op je lijst nu in de aanbieding zijn.

### 9. AI-suggesties
"Je hebt kip, rijst en paprika op voorraad — wat dacht je van een roerbak?" Receptsuggesties op basis van wat je in huis hebt.

### 10. Bon scannen
Foto van je kassabon → automatisch voorraad bijwerken via OCR. Scheelt handmatig invoeren na het boodschappen doen.

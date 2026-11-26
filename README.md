# Zahnputz-Tanz 🦷💃

Eine ruhige, gezeichnete Zahnputz-App für Kinder – gedacht als flüssige Alternative zur Sonicare-for-Kids-App auf älteren iPads (getestet für iPad 5. Generation, iOS 16).

- **Putzen nach KAI** (Kauflächen → Außenflächen → Innenflächen), 2 Minuten. Standard: **6 Schritte à 20 s** (jede Fläche erst unten, dann oben); alternativ **3 Schritte à 40 s** (unten und oben zusammen, die Bürste wechselt zur Hälfte nach oben). Einstellbar im Eltern-Menü. Hinweis: Die Sonicare summt weiterhin alle 30 s – die App signalisiert ihre Wechsel mit einem Glockenton. Beim „Los!“ gleichzeitig den Knopf an der Zahnbürste drücken.
- **Animation**: gezeichneter Mund; die aktive Fläche leuchtet, die Bürste zeigt die Bewegung (Kauflächen: hin und her, Außenflächen: kleine Kreise, Innenflächen: von Rot nach Weiß). Ein Zahn-Querschnitt zeigt, welche Fläche dran ist. Zuckerpunkte verschwinden; beim Wechsel Glockenton und „Wechseln! Jetzt …“.
- **Geschenke**: Sticker-Album (30 Sticker, jeder 4. glitzert), Kleider für die Tänzerin (alle 5 Putzrunden), Tanzschritte (3/7/14/21/30 Tage in Folge), Kalender mit Sonne (morgens) und Mond (abends). Höchstens 2 Geschenke pro Tag.
- **Wende-Pailletten**: Pailletten-Rock und -Top lassen sich beim Anziehen mit dem Finger umstreichen (runter = andere Farbe, hoch = zurück).
- **Musik**: ruhige, langsame Instrumentalmusik, live im Browser erzeugt (keine Audiodateien, keine Lizenzfragen). Abschaltbar.
- **Mini-Spiele** (nur nach dem Zähneputzen, Standard 5 Minuten, im Eltern-Menü 0–15 Min. einstellbar, 0 = aus; keine Geschenke, nur ein Rekord):
  - **Tanzschritte merken** – die Tänzerin zeigt Posen vor, das Kind tippt sie nach (2 bis 8 Schritte, kein „Verloren“).
  - **Klavier** – Töne gleiten auf 8 große Tasten (C–C); im richtigen Moment tippen oder über die Tasten streichen. Tempo: Langsam (Übungstempo, ca. 60–70 %), Mittel (85 % des Originaltempos), Normal (Originaltempo). Lieder: Alle meine Entchen, Ode an die Freude, Morgen kommt der Weihnachtsmann, Hänschen klein, Wiegenlied (Brahms) – plus „Frei spielen“.
  - **Zuckerjagd** – Zuckermonster auf den Zähnen wegtippen, 45 Sekunden pro Runde.
- **Malen** (immer verfügbar): 6 Bilder (freies Blatt, Tänzerin, Ballettbühne, Katze, Schmetterling, Regenbogen), Farbkreis mit 12 Farben in 3 Helligkeiten und Weiß in der Mitte, Werkzeuge Stift, Pinsel, Spray, Farbeimer und Radierer in 3 Größen, „Zurück“ und „Alles löschen“. Farben mischen sich wie echte Malfarben (Rot über Blau = Lila, Gelb über Blau = Grün). Bilder werden pro Motiv auf dem Gerät gespeichert (nicht in der Sicherungsdatei enthalten).
- **Eltern-Menü**: Symbol oben rechts antippen und eine **Malaufgabe** (kleines Einmaleins) lösen → Name, Putzzeit (60–150 s), Putz-Reihenfolge (KAI 6 oder 3 Schritte), Musik, Lautstärke, Spielzeit, Fortschritt löschen.

Alles bleibt auf dem Gerät (localStorage) – es werden keine Daten verschickt.

**Sicherung:** Beim Löschen der Website-Daten oder des Home-Bildschirm-Symbols geht der Fortschritt verloren. Deshalb erscheint nach je 10 Putzrunden unten links „Eltern: Fortschritt sichern“ (3 Sekunden halten → Datei in „Dateien“/iCloud Drive speichern). Ist kein Fortschritt vorhanden, zeigt der Startbildschirm „Sicherung laden“ zum Wiederherstellen. Export/Import gibt es zusätzlich im Eltern-Menü.

## Projektaufbau

```
app/        Die eigentliche App (nur diesen Ordner veröffentlichen)
  js/config.js   alle globalen Konstanten, Kataloge und Texte
  js/*.js        Logik (timer, storage, rewards, sequins) und Zeichnungen (art, dancer, stickers)
  js/screens/    die einzelnen Bildschirme
tests/      pytest + Playwright (WebKit = Safari-Engine)
tools/      Dev-Server, Icon-Generator, Test-Runner, tools/config.py
```

## Einrichtung (Windows PowerShell oder cmd)

```
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m playwright install webkit chromium
```

(macOS/Linux: `.venv/bin/python` statt `.venv\Scripts\python`.)

## Lokal starten

```
.venv\Scripts\python tools\serve.py
```

Die Ausgabe zeigt die Adresse fürs iPad (z. B. `http://<Laptop-IP>:8080`). iPad und Laptop müssen im selben WLAN sein; beim ersten Start fragt die Windows-Firewall – „Private Netzwerke“ erlauben. Kommt keine Abfrage und das Handy/iPad erreicht die App nicht, einmalig in einer Admin-PowerShell freigeben:

```
New-NetFirewallRule -DisplayName "Zahnputz-App Dev-Server (8080)" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Private
```

Über `http://` im LAN funktionieren alle Funktionen außer dem Offline-Modus.

Schnelltest-Modus: `…/index.html?schnell=1` (20 s Putzzeit, 1 s Countdown).

## Tests

```
.venv\Scripts\python tools\run_tests.py
```

Enthält Logik-Tests (Datentypen, Grenzfälle wie Schaltjahr, Zeitumstellung, Monatswechsel, kaputte Speicherdaten), einen kompletten Durchlauf in WebKit mit künstlicher Uhr und einen Performance-Test mit 4-fach gedrosselter CPU.

## Veröffentlichen (GitHub Pages)

Die App läuft unter **<https://mulct-diz-db.github.io/Zaehneputzen/>** (HTTPS, daher funktioniert auch der Offline-Modus). Schritt-für-Schritt-Anleitung: [docs/DEPLOY.md](docs/DEPLOY.md).

- Jeder Push auf `main` veröffentlicht den Ordner `app/` automatisch (Workflow `.github/workflows/pages.yml`, ca. 1 Minute; Status im Tab *Actions*).
- Einmalige Einrichtung: *Settings → Pages → Source* = **GitHub Actions**. Das Repository muss bei kostenlosem Konto öffentlich sein.
- GitHub Pages cacht bis zu 10 Minuten – danach die App auf dem iPad online schließen und neu öffnen.
- **Neue Dateien in `app/`** zusätzlich in die `PRECACHE`-Liste in `app/sw.js` eintragen, sonst fehlen sie offline.
- Der Fortschritt wird pro Adresse gespeichert: beim Wechsel von der LAN-Adresse zu GitHub Pages im Eltern-Menü exportieren und dort importieren.

Alternativen ohne GitHub: **Netlify Drop** (<https://app.netlify.com/drop>, Ordner `app` hineinziehen) oder **Cloudflare Pages** („Direct Upload“ des Ordners `app`).

## Auf dem iPad installieren

1. Adresse in **Safari** öffnen → Teilen-Symbol → **„Zum Home-Bildschirm“**.
2. Einmal online öffnen, danach funktioniert sie offline.
3. Empfehlung: *Einstellungen → Anzeige & Helligkeit → Automatische Sperre* auf mindestens **5 Minuten**, damit der Bildschirm beim Putzen sicher an bleibt (iOS 16 unterstützt das automatische Wachhalten in Home-Bildschirm-Apps nur eingeschränkt).
4. Optional: *Einstellungen → Bedienungshilfen → Geführter Zugriff*, damit das Kind in der App bleibt.

## Datenschutz im Repository

Das Repository darf keine persönlichen Daten oder Angaben zum eigenen Rechner enthalten.

- `tools/privacy_check.py` sucht nach privaten Begriffen, persönlichen Ordnerpfaden, E-Mail-Adressen (außer noreply) und privaten IP-Adressen. `tests/test_privacy.py` prüft alle Dateien bei jedem Testlauf.
- Die privaten Begriffe (z. B. Name des Kindes, Benutzer- und Computername) stehen in der lokalen Datei `.private-terms` – sie ist per `.gitignore` ausgeschlossen und wird nie hochgeladen. Eine Zeile pro Begriff.
- Einmal pro Klon `.venv\Scripts\python tools\install_hooks.py` ausführen: Danach blockieren Git-Hooks jeden Commit (Dateien und Commit-Nachricht), der solche Daten enthält.
- Testdaten verwenden neutrale Namen wie „Testkind“. Commits laufen über die GitHub-noreply-Adresse.

## Lizenzen

Schrift „Patrick Hand“ © Patrick Wagesreiter, SIL Open Font License 1.1 (`app/fonts/OFL.txt`). Alle Zeichnungen und die Musik sind für dieses Projekt erstellt.

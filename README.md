# Zahnputz-Tanz 🦷💃

Eine ruhige, gezeichnete Zahnputz-App für Kinder – gedacht als flüssige Alternative zur Sonicare-for-Kids-App auf älteren iPads (getestet für iPad 5. Generation, iOS 16).

- **2 Minuten, 4 Zonen à 30 s** (oben links → oben rechts → unten links → unten rechts) – passend zum 30-Sekunden-Signal der Zahnbürste. Beim „Los!“ gleichzeitig den Knopf an der Zahnbürste drücken.
- **Animation**: gezeichneter Mund, die Zahnbürste putzt die aktive Zone, Zuckerpunkte verschwinden, die Tänzerin putzt mit. Beim Wechsel: Glockenton, Drehung, „Wechseln! Jetzt …“.
- **Geschenke**: Sticker-Album (30 Sticker, jeder 4. glitzert), Kleider für die Tänzerin (alle 5 Putzrunden), Tanzschritte (3/7/14/21/30 Tage in Folge), Kalender mit Sonne (morgens) und Mond (abends). Höchstens 2 Geschenke pro Tag.
- **Wende-Pailletten**: Pailletten-Rock und -Top lassen sich beim Anziehen mit dem Finger umstreichen (runter = andere Farbe, hoch = zurück).
- **Musik**: ruhige, langsame Instrumentalmusik, live im Browser erzeugt (keine Audiodateien, keine Lizenzfragen). Abschaltbar.
- **Eltern-Menü**: Zahnrad oben rechts **3 Sekunden gedrückt halten** → Name, Putzzeit (60–150 s), Reihenfolge, Musik, Lautstärke, Fortschritt löschen.

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

Die Ausgabe zeigt die Adresse fürs iPad (z. B. `http://192.168.178.20:8080`). iPad und Laptop müssen im selben WLAN sein; beim ersten Start fragt die Windows-Firewall – „Private Netzwerke“ erlauben. Kommt keine Abfrage und das Handy/iPad erreicht die App nicht, einmalig in einer Admin-PowerShell freigeben:

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

## Lizenzen

Schrift „Patrick Hand“ © Patrick Wagesreiter, SIL Open Font License 1.1 (`app/fonts/OFL.txt`). Alle Zeichnungen und die Musik sind für dieses Projekt erstellt.

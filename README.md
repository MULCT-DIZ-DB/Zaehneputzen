# Zahnputz-Tanz 🦷💃

Eine ruhige, gezeichnete Zahnputz-App für Kinder – gedacht als flüssige Alternative zur Sonicare-for-Kids-App auf älteren iPads (getestet für iPad 5. Generation, iOS 16).

- **2 Minuten, 4 Zonen à 30 s** (oben links → oben rechts → unten links → unten rechts) – passend zum 30-Sekunden-Signal der Zahnbürste. Beim „Los!“ gleichzeitig den Knopf an der Zahnbürste drücken.
- **Animation**: gezeichneter Mund, die Zahnbürste putzt die aktive Zone, Zuckerpunkte verschwinden, die Tänzerin putzt mit. Beim Wechsel: Glockenton, Drehung, „Wechseln! Jetzt …“.
- **Geschenke**: Sticker-Album (30 Sticker, jeder 4. glitzert), Kleider für die Tänzerin (alle 5 Putzrunden), Tanzschritte (3/7/14/21/30 Tage in Folge), Kalender mit Sonne (morgens) und Mond (abends). Höchstens 2 Geschenke pro Tag.
- **Wende-Pailletten**: Pailletten-Rock und -Top lassen sich beim Anziehen mit dem Finger umstreichen (runter = andere Farbe, hoch = zurück).
- **Musik**: ruhige, langsame Instrumentalmusik, live im Browser erzeugt (keine Audiodateien, keine Lizenzfragen). Abschaltbar.
- **Eltern-Menü**: Zahnrad oben rechts **3 Sekunden gedrückt halten** → Name, Putzzeit (60–150 s), Reihenfolge, Musik, Lautstärke, Fortschritt löschen.

Alles bleibt auf dem Gerät (localStorage) – es werden keine Daten verschickt.

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

Die Ausgabe zeigt die Adresse fürs iPad (z. B. `http://192.168.178.20:8080`). iPad und Laptop müssen im selben WLAN sein; beim ersten Start fragt die Windows-Firewall – „Private Netzwerke“ erlauben.
Über `http://` im LAN funktionieren alle Funktionen außer dem Offline-Modus.

Schnelltest-Modus: `…/index.html?schnell=1` (20 s Putzzeit, 1 s Countdown).

## Tests

```
.venv\Scripts\python tools\run_tests.py
```

Enthält Logik-Tests (Datentypen, Grenzfälle wie Schaltjahr, Zeitumstellung, Monatswechsel, kaputte Speicherdaten), einen kompletten Durchlauf in WebKit mit künstlicher Uhr und einen Performance-Test mit 4-fach gedrosselter CPU.

## Dauerhaft veröffentlichen (kostenlos)

Die FRITZ!Box kann keine Webseiten mit HTTPS ausliefern – HTTPS ist aber für den Offline-Modus nötig. Kostenlose Möglichkeiten:

1. **Netlify Drop** (am einfachsten): auf <https://app.netlify.com/drop> den Ordner **`app`** hineinziehen (kostenloses Konto). Für Updates den Ordner erneut hineinziehen.
2. **Cloudflare Pages**: „Direct Upload“ des Ordners `app`.
3. **GitHub Pages**: im Repository unter *Settings → Pages* veröffentlichen (bei kostenlosem Konto muss das Repository öffentlich sein). Dann ist die App unter `…/app/` erreichbar.

## Auf dem iPad installieren

1. Adresse in **Safari** öffnen → Teilen-Symbol → **„Zum Home-Bildschirm“**.
2. Einmal online öffnen, danach funktioniert sie offline.
3. Empfehlung: *Einstellungen → Anzeige & Helligkeit → Automatische Sperre* auf mindestens **5 Minuten**, damit der Bildschirm beim Putzen sicher an bleibt (iOS 16 unterstützt das automatische Wachhalten in Home-Bildschirm-Apps nur eingeschränkt).
4. Optional: *Einstellungen → Bedienungshilfen → Geführter Zugriff*, damit das Kind in der App bleibt.

## Lizenzen

Schrift „Patrick Hand“ © Patrick Wagesreiter, SIL Open Font License 1.1 (`app/fonts/OFL.txt`). Alle Zeichnungen und die Musik sind für dieses Projekt erstellt.

# Designentscheidungen & Begründungen

## Backend-Architektur

### 1. CSV Parser (`services/csv_parser.py`)

**Designentscheidungen:**
- **Pandas für CSV-Parsing**: Robuste Bibliothek mit guter Fehlerbehandlung und Datums-Parsing
- **Pydantic Models**: Type-safe Validierung mit automatischer Fehlerbehandlung
- **Fehlertoleranz**: Fehlerhafte Zeilen werden gesammelt, aber nicht abgebrochen
- **Metriken-Berechnung**: Automatische Aggregation von Einnahmen, Ausgaben und Kategorien

**Begründung:**
- Pandas bietet robustes CSV-Parsing auch bei verschiedenen Formaten
- Pydantic stellt sicher, dass alle Daten valide sind bevor sie weiterverarbeitet werden
- Fehlertoleranz ermöglicht teilweise erfolgreiche Analysen auch bei fehlerhaften Daten

**Weakpoints:**
- Keine Unterstützung für verschiedene CSV-Delimiter (nur Komma)
- Keine automatische Erkennung von Datumsformaten (versucht verschiedene, aber nicht alle)
- Keine Validierung von Kategorien gegen vordefinierte Listen

**Verbesserungsmöglichkeiten:**
- Auto-Detection von Delimitern
- Erweiterte Datumsformat-Erkennung
- Kategorie-Validierung und Normalisierung

---

### 2. Szenario Calculator (`services/scenario_calculator.py`)

**Designentscheidungen:**
- **Statistische Methoden**: Verwendung von Durchschnitt und Standardabweichung für Projektionen
- **Drei Szenarien**: Best Case (+10% Einnahmen, -5% Ausgaben), Worst Case (-10% Einnahmen, +15% Ausgaben), Realistic (Variation um Durchschnitt)
- **12-Monats-Projektion**: Standard-Zeitraum für Finanzplanung
- **Kumulative Berechnung**: Tracking des Gesamtguthabens über Zeit

**Begründung:**
- Statistische Methoden sind transparent und nachvollziehbar
- Drei Szenarien geben ein gutes Spektrum von Möglichkeiten
- 12 Monate ist ein üblicher Planungshorizont für junge Erwachsene

**Weakpoints:**
- Lineare Extrapolation, keine saisonalen Trends
- Keine Berücksichtigung von einmaligen Ereignissen
- Realistic Case verwendet Zufallszahlen (nicht deterministisch)

**Verbesserungsmöglichkeiten:**
- Saisonale Anpassungen (z.B. höhere Ausgaben im Dezember)
- Machine Learning Modelle für präzisere Projektionen
- Konfigurierbare Projektionszeiträume
- Deterministische Realistic Case Berechnung

---

### 3. LLM Service (`services/llm_service.py`)

**Designentscheidungen:**
- **Multi-Provider Support**: OpenAI GPT-4o und Google Gemini
- **Strukturierte Prompts**: Klare Templates für konsistente Ausgaben
- **Graceful Degradation**: Fallback-Zusammenfassungen wenn LLM nicht verfügbar
- **Deutsche Ausgaben**: Speziell für Zielgruppe optimiert

**Begründung:**
- Multi-Provider gibt Flexibilität bei API-Verfügbarkeit
- Strukturierte Prompts sorgen für konsistente, relevante Ausgaben
- Graceful Degradation stellt sicher, dass die App auch ohne LLM funktioniert
- Deutsche Sprache ist wichtig für die Zielgruppe

**Weakpoints:**
- Keine Prompt-Caching (jede Anfrage kostet API-Credits)
- Keine Validierung der LLM-Ausgaben
- Fallback-Texte sind sehr generisch

**Verbesserungsmöglichkeiten:**
- Caching von ähnlichen Anfragen
- Output-Validierung mit Pydantic
- Bessere Fallback-Generierung basierend auf Daten
- Fine-tuning für spezifische Finanzberatung

---

### 4. FastAPI Main (`main.py`)

**Designentscheidungen:**
- **CORS Middleware**: Ermöglicht Frontend-Integration
- **Temporäre Dateien**: Sichere Handhabung von Uploads
- **Strukturierte Responses**: Konsistente JSON-Struktur
- **Error Handling**: Explizite HTTP-Status-Codes

**Begründung:**
- CORS ist notwendig für Frontend-Backend-Kommunikation
- Temporäre Dateien werden automatisch gelöscht (Sicherheit)
- Strukturierte Responses erleichtern Frontend-Integration
- Explizite Error Codes helfen beim Debugging

**Weakpoints:**
- Keine Rate Limiting
- Keine Authentifizierung (wie gewünscht, aber für Production nötig)
- Keine Request-Validierung außer File-Upload

**Verbesserungsmöglichkeiten:**
- Rate Limiting für API-Schutz
- Request-Validierung mit Pydantic
- Logging und Monitoring
- API-Versionierung

---

## Frontend-Architektur

### 1. Next.js 15 App Router

**Designentscheidungen:**
- **App Router**: Neueste Next.js Architektur für bessere Performance
- **Server Components**: Wo möglich für bessere SEO
- **Client Components**: Nur wo Interaktivität nötig ist
- **TypeScript**: Type-safety für bessere Entwicklererfahrung

**Begründung:**
- App Router ist die Zukunft von Next.js
- Server Components reduzieren Bundle-Size
- TypeScript verhindert viele Runtime-Fehler

**Weakpoints:**
- Keine Server-Side Rendering für dynamische Daten
- Keine Caching-Strategie

**Verbesserungsmöglichkeiten:**
- ISR (Incremental Static Regeneration) für bessere Performance
- React Query für Caching und State Management

---

### 2. shadcn/ui Komponenten

**Designentscheidungen:**
- **Copy-Paste Komponenten**: Volle Kontrolle über Code
- **Tailwind CSS**: Utility-first Styling
- **Radix UI**: Accessible Primitive Components
- **Customizable**: Einfach anpassbar für Branding

**Begründung:**
- shadcn/ui bietet beste Balance zwischen Flexibilität und Einfachheit
- Tailwind ermöglicht schnelles Styling
- Radix UI garantiert Accessibility

**Weakpoints:**
- Mehr Code zu maintainen als fertige UI-Libraries
- Keine vorgefertigten Finanz-Komponenten

**Verbesserungsmöglichkeiten:**
- Eigene Finanz-spezifische Komponenten-Bibliothek
- Storybook für Component Documentation

---

### 3. Recharts für Visualisierung

**Designentscheidungen:**
- **Recharts**: React-native Charting-Library
- **Responsive**: Automatische Anpassung an Container
- **Interaktiv**: Tooltips und Hover-Effekte
- **Mehrere Linien**: Einnahmen, Ausgaben, Saldo, Kumuliert

**Begründung:**
- Recharts ist einfach zu verwenden und gut dokumentiert
- Responsive Design ist wichtig für mobile Nutzer
- Interaktivität verbessert User Experience

**Weakpoints:**
- Keine erweiterten Chart-Typen (z.B. Pie Charts für Kategorien)
- Keine Export-Funktionalität

**Verbesserungsmöglichkeiten:**
- Pie Charts für Kategorien-Verteilung
- Bar Charts für monatliche Vergleiche
- Export als PNG/PDF

---

### 4. File Upload Komponente

**Designentscheidungen:**
- **Drag & Drop**: Moderne UX
- **File Validation**: Nur CSV-Dateien
- **Loading States**: Klare Feedback während Verarbeitung
- **Error Handling**: Benutzerfreundliche Fehlermeldungen

**Begründung:**
- Drag & Drop ist intuitiver als File-Picker
- Validation verhindert Fehler früh
- Loading States verbessern UX
- Klare Fehlermeldungen helfen bei Problemen

**Weakpoints:**
- Keine Vorschau der CSV-Daten
- Keine Validierung vor Upload

**Verbesserungsmöglichkeiten:**
- CSV-Vorschau vor Upload
- Client-side Validierung
- Progress-Bar für große Dateien

---

## Gesamtarchitektur

### Stärken
1. **Modulare Struktur**: Jede Komponente ist unabhängig testbar
2. **Type Safety**: TypeScript + Pydantic für robuste Datenvalidierung
3. **Error Handling**: Umfassende Fehlerbehandlung auf allen Ebenen
4. **Graceful Degradation**: Funktioniert auch ohne LLM
5. **Moderne Tech Stack**: Aktuelle Best Practices

### Weakpoints
1. **Keine Persistenz**: Daten werden nicht gespeichert
2. **Einfache Projektionen**: Keine komplexen Finanzmodelle
3. **Keine Authentifizierung**: Nicht für Production ohne Auth
4. **Begrenzte Skalierung**: Keine Caching- oder Queue-Strategien

### Zukünftige Verbesserungen
1. **Datenbank-Integration**: PostgreSQL für Persistenz
2. **Erweiterte Modelle**: ML-basierte Projektionen
3. **Real-time Updates**: WebSocket für Live-Daten
4. **Mobile App**: React Native Version
5. **Export-Funktionen**: PDF-Reports, Excel-Export
6. **Mehrere Währungen**: Internationale Unterstützung


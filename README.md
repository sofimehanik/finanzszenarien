# Finanzszenarien - Finanzplanungs-Tool

Eine minimalistische Web-Anwendung zur Berechnung und Visualisierung privater Finanzszenarien für junge Erwachsene (18-30 Jahre).

## 🎯 Features

- **CSV-Import**: Importiere deine Finanzdaten aus einer CSV-Datei
- **Szenario-Berechnung**: Automatische Berechnung von Best Case, Worst Case und Realistic Case Szenarien
- **Visuelle Darstellung**: Interaktive Charts und Cards für alle Szenarien
- **KI-Analyse**: GPT-4o/Gemini-basierte Erklärungen und Tipps (optional)
- **Moderne UI**: Built mit Next.js 15, shadcn/ui und Tailwind CSS

## 🏗️ Architektur

### Backend (FastAPI)
- **CSV Parser**: Robuste Parsing-Logik mit Pandas und Fehlerbehandlung
- **Szenario Calculator**: Statistische Analyse und Projektionen
- **LLM Service**: Integration mit OpenAI GPT-4o oder Google Gemini
- **REST API**: FastAPI-Endpoints für Frontend-Integration

### Frontend (Next.js 15)
- **React Components**: Modulare UI-Komponenten mit shadcn/ui
- **Charts**: Recharts für interaktive Visualisierungen
- **File Upload**: Drag & Drop CSV-Upload
- **Responsive Design**: Mobile-first Ansatz

## 🚀 Setup

### Voraussetzungen

- Python 3.9+
- Node.js 18+
- npm oder yarn

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Umgebungsvariablen konfigurieren:**

```bash
cp .env.example .env
```

Bearbeite `.env` und füge deine API-Keys ein:
- `OPENAI_API_KEY` (für OpenAI GPT-4o)
- oder `GEMINI_API_KEY` (für Google Gemini)
- `LLM_PROVIDER=openai` oder `LLM_PROVIDER=gemini`

**Backend starten:**

```bash
uvicorn main:app --reload
```

Das Backend läuft auf `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
```

**Frontend starten:**

```bash
npm run dev
```

Das Frontend läuft auf `http://localhost:3000`

## 📊 CSV-Format

Die CSV-Datei muss folgende Spalten enthalten:

```csv
date,amount,category,description
2024-10-01,2500,income,Gehalt Oktober
2024-10-05,-650,rent,Miete
2024-10-07,-120,groceries,Wocheneinkauf
```

- **date**: Datum im Format YYYY-MM-DD
- **amount**: Betrag (positiv für Einnahmen, negativ für Ausgaben)
- **category**: Kategorie (z.B. income, rent, groceries)
- **description**: Beschreibung der Transaktion

Eine Beispiel-CSV findest du in `data/sample_finances.csv`

## 🧩 Komponenten-Übersicht

### Backend Services

1. **CSV Parser** (`services/csv_parser.py`)
   - Validiert CSV-Struktur
   - Bereinigt und normalisiert Daten
   - Berechnet Metriken (Einnahmen, Ausgaben, Kategorien)

2. **Szenario Calculator** (`services/scenario_calculator.py`)
   - Analysiert historische Daten statistisch
   - Berechnet 12-Monats-Projektionen
   - Generiert Best/Worst/Realistic Case Szenarien

3. **LLM Service** (`services/llm_service.py`)
   - Generiert Szenario-Zusammenfassungen
   - Erstellt Plausibilitätsanalysen
   - Liefert personalisierte Finanztipps

### Frontend Components

1. **FileUpload**: Drag & Drop CSV-Upload
2. **ScenarioCard**: Darstellung einzelner Szenarien
3. **ScenarioChart**: Interaktive Charts mit Recharts
4. **UI Components**: shadcn/ui Komponenten (Button, Card, Tabs, etc.)

## 📝 API Endpoints

### `POST /api/analyze`
Analysiert eine CSV-Datei und gibt Szenarien zurück.

**Request:**
- `file`: CSV-Datei (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "finance_data": {...},
  "scenarios": {
    "best_case": {...},
    "worst_case": {...},
    "realistic_case": {...}
  },
  "ai_analysis": {
    "plausibility": "...",
    "tips": "..."
  }
}
```

### `GET /`
Health Check Endpoint

### `GET /api/health`
Detaillierter Health Check

## 🎨 Designentscheidungen

### Backend
- **Pydantic Models**: Type-safe Datenvalidierung
- **Error Handling**: Graceful degradation bei LLM-Ausfällen
- **Modulare Struktur**: Jeder Service ist unabhängig testbar
- **Statistische Methoden**: Verwendung von NumPy für robuste Berechnungen

### Frontend
- **Atomic Design**: Wiederverwendbare Komponenten
- **TypeScript**: Type-safety für bessere Entwicklererfahrung
- **Responsive Design**: Mobile-first Ansatz
- **Accessibility**: ARIA-Labels und Keyboard-Navigation

## 🔍 Weakpoints & Verbesserungsmöglichkeiten

### Aktuelle Limitationen
1. **Statische Daten**: Nur CSV-Import, keine Live-Bankanbindung
2. **Einfache Projektionen**: Lineare Extrapolation, keine komplexen Modelle
3. **LLM-Abhängigkeit**: Funktioniert ohne API-Keys, aber mit reduzierter Funktionalität
4. **Keine Persistenz**: Daten werden nicht gespeichert

### Zukünftige Verbesserungen
1. **Datenbank-Integration**: Speicherung von Analysen und Historie
2. **Erweiterte Modelle**: Machine Learning für präzisere Projektionen
3. **Mehrere Währungen**: Unterstützung für internationale Nutzer
4. **Export-Funktionen**: PDF-Reports, Excel-Export
5. **Benutzer-Accounts**: Persistente Speicherung (optional)
6. **Real-time Updates**: WebSocket für Live-Daten
7. **Mobile App**: React Native Version

## 📚 Prompt-Templates

Die LLM-Prompts sind in `backend/services/llm_service.py` definiert:

1. **System Prompt**: Definiert den Ton und Stil (freundlich, motivierend, verständlich)
2. **Szenario Prompt**: Template für Szenario-Zusammenfassungen
3. **Plausibilitäts-Prompt**: Template für Plausibilitätsanalysen
4. **Tipps-Prompt**: Template für personalisierte Finanztipps

## 🧪 Testing

```bash
# Backend Tests (zu implementieren)
cd backend
pytest

# Frontend Tests (zu implementieren)
cd frontend
npm test
```

## 📄 Lizenz

MIT License

## 👤 Autor

Erstellt für die Zielgruppe 18-30 Jahre, digital-nativ, Fokus auf Selbstorganisation und Berufseinstieg.


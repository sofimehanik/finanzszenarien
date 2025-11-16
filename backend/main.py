"""
FastAPI Backend für Finanzszenarien-Analyse
Haupt-Endpoint für Frontend-Integration
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Optional
import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

from services.csv_parser import CSVParser, ParsedFinanceData
from services.scenario_calculator import ScenarioCalculator
from services.llm_service import LLMService

# Load environment variables from .env file in backend directory
backend_dir = Path(__file__).parent
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="Finanzszenarien API",
    description="API für Finanzanalyse und Szenario-Berechnung",
    version="1.0.0"
)

# CORS für Frontend-Integration
# Allow common development origins (add your network IP if accessing from other devices)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.1.102:3000",  # Add your network IP
        # Add more IPs as needed, or use environment variable in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services initialisieren
csv_parser = CSVParser()
scenario_calculator = ScenarioCalculator(months_ahead=12)
llm_service: Optional[LLMService] = None

# LLM Service optional initialisieren (falls API-Keys vorhanden)
try:
    llm_service = LLMService()
except ValueError:
    print("Warnung: LLM Service nicht verfügbar. API-Keys fehlen.")


@app.get("/")
async def root():
    """Health Check Endpoint"""
    return {
        "status": "ok",
        "service": "Finanzszenarien API",
        "llm_available": llm_service is not None
    }


@app.post("/api/analyze")
async def analyze_finances(
    file: UploadFile = File(...),
    user_goal: str = Form(...)
):
    """
    Haupt-Endpoint: Analysiert CSV-Datei und berechnet Szenarien basierend auf Benutzerzielen.
    
    Designentscheidungen:
    - Upload-Handling mit temporären Dateien
    - Fehlerbehandlung auf allen Ebenen
    - Strukturierte JSON-Responses
    - Optionale LLM-Integration (graceful degradation)
    - Goal-basierte Szenario-Berechnung
    """
    temp_file = None
    temp_file_path = None
    
    try:
        print(f"📤 Empfange Datei-Upload: {file.filename}")
        print(f"🎯 Benutzerziel: {user_goal}")
        
        # Datei temporär speichern
        suffix = Path(file.filename).suffix if file.filename else '.csv'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        print(f"✅ Datei gespeichert: {temp_file_path} ({len(content)} bytes)")
        
        # CSV parsen
        try:
            print("📊 Starte CSV-Parsing...")
            finance_data = csv_parser.parse(temp_file_path)
            print(f"✅ CSV geparst: {len(finance_data.transactions)} Transaktionen")
        except Exception as e:
            print(f"❌ CSV-Parsing Fehler: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Fehler beim Parsen der CSV: {str(e)}"
            )
        
        # Szenarien berechnen (mit Benutzerziel)
        try:
            print("🧮 Berechne Szenarien basierend auf Benutzerziel...")
            scenarios = scenario_calculator.calculate_all_scenarios(finance_data, user_goal)
            print("✅ Szenarien berechnet")
        except Exception as e:
            print(f"❌ Szenario-Berechnung Fehler: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Fehler bei Szenario-Berechnung: {str(e)}"
            )
        
        # LLM-Analysen (optional, mit Benutzerziel)
        scenario_summaries = {}
        plausibility_analysis = None
        tips = None
        
        if llm_service:
            try:
                print("🤖 Starte LLM-Analysen...")
                # Zusammenfassungen für jedes Szenario
                for key, scenario in scenarios.items():
                    print(f"  - Generiere Zusammenfassung für {key}...")
                    scenario_summaries[key] = llm_service.generate_scenario_summary(
                        scenario, finance_data, user_goal
                    )
                
                # Plausibilitätsanalyse
                print("  - Generiere Plausibilitätsanalyse...")
                plausibility_analysis = llm_service.generate_plausibility_analysis(
                    scenarios, finance_data, user_goal
                )
                
                # Tipps
                print("  - Generiere Tipps...")
                tips = llm_service.generate_tips(finance_data, user_goal)
                print("✅ LLM-Analysen abgeschlossen")
            except Exception as e:
                print(f"⚠️ LLM-Fehler (wird ignoriert): {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Response zusammenstellen
        print("📦 Erstelle Response...")
        response = {
            "success": True,
            "finance_data": {
                "total_income": finance_data.total_income,
                "total_expenses": finance_data.total_expenses,
                "net_balance": finance_data.net_balance,
                "monthly_averages": finance_data.monthly_averages,
                "categories": finance_data.categories,
                "date_range": finance_data.date_range,
                "transaction_count": len(finance_data.transactions),
                "transactions": [
                    {
                        "date": t.date,
                        "amount": t.amount,
                        "category": t.category,
                        "description": t.description
                    }
                    for t in finance_data.transactions
                ]
            },
            "scenarios": {
                key: {
                    "title": scenario.title,
                    "description": scenario.description,
                    "monthly_savings": scenario.monthly_savings,
                    "final_balance": scenario.final_balance,
                    "projections": [
                        {
                            "month": p.month,
                            "projected_income": p.projected_income,
                            "projected_expenses": p.projected_expenses,
                            "projected_balance": p.projected_balance,
                            "cumulative_balance": p.cumulative_balance
                        }
                        for p in scenario.projections
                    ],
                    "risk_factors": scenario.risk_factors,
                    "opportunities": scenario.opportunities,
                    "ai_summary": scenario_summaries.get(key, "")
                }
                for key, scenario in scenarios.items()
            },
            "ai_analysis": {
                "plausibility": plausibility_analysis,
                "tips": tips
            },
            "errors": csv_parser.errors,
            "warnings": csv_parser.warnings
        }
        
        print("✅ Response erstellt, sende an Client...")
        return JSONResponse(content=response)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unerwarteter Fehler: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Unerwarteter Fehler: {str(e)}"
        )
    finally:
        # Temporäre Datei löschen
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                print(f"🗑️ Temporäre Datei gelöscht: {temp_file_path}")
            except Exception as e:
                print(f"⚠️ Konnte temporäre Datei nicht löschen: {e}")


@app.get("/api/health")
async def health_check():
    """Detaillierter Health Check"""
    return {
        "status": "healthy",
        "services": {
            "csv_parser": "available",
            "scenario_calculator": "available",
            "llm_service": "available" if llm_service else "unavailable"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


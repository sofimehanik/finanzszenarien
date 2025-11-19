"""
FastAPI Backend für Finanzszenarien-Analyse
Haupt-Endpoint für Frontend-Integration
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Optional
import os
import tempfile
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from services.csv_parser import CSVParser, ParsedFinanceData
from services.scenario_calculator import ScenarioCalculator, ScenarioResult
from services.llm_service import LLMService
from services.auth_service import AuthService
from database import get_db, init_db
from models import User, AnalysisHistory
from schemas import (
    UserRegister,
    UserLogin,
    Token,
    UserResponse,
    UserUpdate,
    AnalysisHistoryCreate,
    AnalysisHistoryResponse,
    QuizProfileUpdate,
)
import json

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

# Initialize database
init_db()

# Serve static files (avatars)
backend_dir = Path(__file__).parent
avatars_dir = backend_dir / "avatars"
avatars_dir.mkdir(exist_ok=True)
app.mount("/avatars", StaticFiles(directory=str(avatars_dir)), name="avatars")

# Security
security = HTTPBearer(auto_error=False)


def build_local_scenario_summary(scenario: ScenarioResult, user_goal: Optional[str]) -> str:
    """Create a lightweight scenario summary without LLM usage."""
    goal_phrase = f" im Hinblick auf dein Ziel „{user_goal}“" if user_goal else ""
    trend = "positiv" if scenario.monthly_savings >= 0 else "kritisch"
    return (
        f"{scenario.title}{goal_phrase} prognostiziert {scenario.monthly_savings:.2f} € pro Monat "
        f"und {scenario.final_balance:.2f} € nach 12 Monaten. "
        f"Damit bleibt dein Cashflow {trend}; plane Puffer für Schwankungen ein."
    )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Dependency to get current authenticated user (optional)"""
    if not credentials:
        return None
    token = credentials.credentials
    payload = AuthService.verify_token(token)
    if payload is None:
        return None
    user_id_str = payload.get("sub")
    if user_id_str is None:
        return None
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        return None
    user = AuthService.get_user_by_id(db, user_id=user_id)
    return user


def serialize_user_response(user: User) -> UserResponse:
    """Helper to convert User model to response schema with quiz profile."""
    quiz_profile = None
    if user.quiz_profile:
        try:
            quiz_profile = json.loads(user.quiz_profile)
        except Exception:
            quiz_profile = None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        profession=user.profession,
        about_me=user.about_me,
        financial_goals=user.financial_goals,
        quiz_profile=quiz_profile,
        is_active=user.is_active
    )


@app.get("/")
async def root():
    """Health Check Endpoint"""
    return {
        "status": "ok",
        "service": "Finanzszenarien API",
        "llm_available": llm_service is not None
    }


@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        user = AuthService.register_user(
            db=db,
            email=user_data.email,
            password=user_data.password,
            full_name=user_data.full_name
        )
        access_token = AuthService.create_access_token(data={"sub": str(user.id)})
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            full_name=user.full_name
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    user = AuthService.authenticate_user(db, user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        full_name=user.full_name
    )


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return serialize_user_response(current_user)


@app.put("/api/auth/profile", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile information"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Update fields if provided
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.profession is not None:
        current_user.profession = user_update.profession
    if user_update.about_me is not None:
        current_user.about_me = user_update.about_me
    if user_update.financial_goals is not None:
        current_user.financial_goals = user_update.financial_goals
    if user_update.quiz_profile is not None:
        current_user.quiz_profile = json.dumps(user_update.quiz_profile)
    
    db.commit()
    db.refresh(current_user)
    
    return serialize_user_response(current_user)


@app.post("/api/auth/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload user avatar"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must be less than 5MB"
        )
    
    # Save file
    backend_dir = Path(__file__).parent
    avatars_dir = backend_dir / "avatars"
    avatars_dir.mkdir(exist_ok=True)
    
    # Generate filename
    file_extension = Path(file.filename).suffix if file.filename else '.jpg'
    filename = f"{current_user.id}_{int(datetime.utcnow().timestamp())}{file_extension}"
    file_path = avatars_dir / filename
    
    # Write file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update user avatar URL
    avatar_url = f"/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    
    return {"avatar_url": avatar_url}


@app.post("/api/quiz/profile", response_model=UserResponse)
async def save_quiz_profile(
    quiz_update: QuizProfileUpdate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save quiz-based finance profile for the user."""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    if quiz_update.profession:
        current_user.profession = quiz_update.profession
    
    current_user.quiz_profile = json.dumps(quiz_update.quiz_profile)
    db.commit()
    db.refresh(current_user)
    
    return serialize_user_response(current_user)


@app.post("/api/analysis/save", response_model=AnalysisHistoryResponse)
async def save_analysis(
    history_data: AnalysisHistoryCreate,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save analysis to user history"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    history_entry = AnalysisHistory(
        user_id=current_user.id,
        title=history_data.title,
        user_goal=history_data.user_goal,
        analysis_data=json.dumps(history_data.analysis_data)
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    
    return AnalysisHistoryResponse(
        id=history_entry.id,
        title=history_entry.title,
        user_goal=history_entry.user_goal,
        created_at=history_entry.created_at.isoformat(),
        updated_at=history_entry.updated_at.isoformat() if history_entry.updated_at else None
    )


@app.get("/api/analysis/history", response_model=list[AnalysisHistoryResponse])
async def get_analysis_history(
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get user's analysis history"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    histories = db.query(AnalysisHistory).filter(
        AnalysisHistory.user_id == current_user.id
    ).order_by(
        AnalysisHistory.created_at.desc()
    ).limit(limit).all()
    
    return [
        AnalysisHistoryResponse(
            id=h.id,
            title=h.title,
            user_goal=h.user_goal,
            created_at=h.created_at.isoformat(),
            updated_at=h.updated_at.isoformat() if h.updated_at else None
        )
        for h in histories
    ]


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(
    analysis_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific analysis by ID"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    history = db.query(AnalysisHistory).filter(
        AnalysisHistory.id == analysis_id,
        AnalysisHistory.user_id == current_user.id
    ).first()
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    return json.loads(history.analysis_data)


@app.delete("/api/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete analysis from history"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    history = db.query(AnalysisHistory).filter(
        AnalysisHistory.id == analysis_id,
        AnalysisHistory.user_id == current_user.id
    ).first()
    
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    db.delete(history)
    db.commit()
    
    return {"success": True, "message": "Analysis deleted"}


@app.post("/api/tips/details")
async def get_tip_details(
    tip_data: dict,
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get detailed information about a specific tip"""
    if not llm_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LLM service not available"
        )
    
    tip_title = tip_data.get("tip_title", "")
    tip_description = tip_data.get("tip_description", "")
    finance_data_dict = tip_data.get("finance_data")
    user_goal = tip_data.get("user_goal")
    
    if not tip_title or not tip_description or not finance_data_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: tip_title, tip_description, finance_data"
        )
    
    # Convert finance_data dict back to ParsedFinanceData object
    from services.csv_parser import ParsedFinanceData
    finance_data = ParsedFinanceData(
        total_income=finance_data_dict.get("total_income", 0),
        total_expenses=finance_data_dict.get("total_expenses", 0),
        net_balance=finance_data_dict.get("net_balance", 0),
        monthly_averages=finance_data_dict.get("monthly_averages", {}),
        categories=finance_data_dict.get("categories", {}),
        date_range=finance_data_dict.get("date_range", {}),
        transactions=[]
    )
    
    # Get user context
    user_profession = current_user.profession if current_user else None
    user_about_me = current_user.about_me if current_user else None
    user_financial_goals = current_user.financial_goals if current_user else None
    quiz_profile = None
    if current_user and current_user.quiz_profile:
        try:
            quiz_profile = json.loads(current_user.quiz_profile)
        except Exception:
            quiz_profile = None
    
    try:
        details = llm_service.generate_tip_details(
            tip_title=tip_title,
            tip_description=tip_description,
            finance_data=finance_data,
            user_goal=user_goal,
            user_profession=user_profession,
            user_about_me=user_about_me,
            user_financial_goals=user_financial_goals,
            quiz_profile=quiz_profile
        )
        
        if not details:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate tip details"
            )
        
        return {"details": details}
    except Exception as e:
        print(f"❌ Error generating tip details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating tip details: {str(e)}"
        )


@app.get("/api/user/suggested-questions")
async def get_suggested_questions(
    current_user: Optional[User] = Depends(get_current_user)
):
    """Generate suggested questions from user's financial goals"""
    if not current_user or not current_user.financial_goals:
        return {"questions": []}
    
    if not llm_service:
        return {"questions": []}
    
    try:
        import google.generativeai as genai
        
        prompt = f"""Der Benutzer hat folgende finanzielle Ziele:
{current_user.financial_goals}

Erstelle 3-5 kurze, konkrete Fragen auf Deutsch, die der Benutzer basierend auf seinen finanziellen Zielen stellen könnte. 
Die Fragen sollten:
- Kurz und prägnant sein (max. 15 Wörter)
- Direkt mit den finanziellen Zielen zusammenhängen
- In der Form sein, die für eine Finanzanalyse geeignet ist (z.B. "Kann ich mir... leisten?", "Ist es möglich, ...?", "Wie viel kann ich...?")

Gib nur die Fragen zurück, eine pro Zeile, ohne Nummerierung oder zusätzlichen Text."""
        
        if llm_service.provider == 'openai':
            response = llm_service.client.chat.completions.create(
                model=llm_service.model,
                messages=[
                    {"role": "system", "content": "Du bist ein hilfreicher Assistent, der kurze, präzise Fragen auf Deutsch generiert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=200
            )
            result = response.choices[0].message.content.strip()
        else:  # Gemini
            full_prompt = f"Du bist ein hilfreicher Assistent, der kurze, präzise Fragen auf Deutsch generiert.\n\n{prompt}"
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=200,
                temperature=0.7
            )
            response = llm_service.model.generate_content(full_prompt, generation_config=generation_config)
            result = response.text.strip() if response.text else ""
        
        # Parse questions from response - remove common prefixes
        lines = result.split('\n')
        questions = []
        for line in lines:
            q = line.strip()
            # Remove common prefixes
            q = q.lstrip('•').lstrip('-').lstrip('*').strip()
            q = q.lstrip('1.').lstrip('2.').lstrip('3.').lstrip('4.').lstrip('5.').strip()
            q = q.lstrip('1)').lstrip('2)').lstrip('3)').lstrip('4)').lstrip('5)').strip()
            if q and len(q) > 10 and not q.lower().startswith('frage'):
                questions.append(q)
        
        questions = questions[:5]  # Limit to 5 questions
        
        return {"questions": questions}
    except Exception as e:
        print(f"⚠️ Fehler bei Generierung von Fragen: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"questions": []}


@app.post("/api/analyze")
async def analyze_finances(
    file: UploadFile = File(...),
    user_goal: str = Form(...),
    current_user: Optional[User] = Depends(get_current_user),  # Optional authentication
    db: Session = Depends(get_db)
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
        scenario_summaries = {
            key: build_local_scenario_summary(scenario, user_goal)
            for key, scenario in scenarios.items()
        }
        plausibility_analysis = None
        tips = None
        scenario_analysis = None
        summary = None
        
        print(f"🔍 LLM Service Status: {'verfügbar' if llm_service else 'nicht verfügbar'}")
        
        if llm_service:
            print("✅ LLM Service verfügbar, starte Analysen...")
            try:
                print("🤖 Starte LLM-Analysen (parallel)...")
                import concurrent.futures
                
                # Parallele Ausführung aller LLM-Anfragen für bessere Performance
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    # Alle Anfragen parallel starten
                    futures = {}
                    
                    # Get user context for personalization
                    user_profession = current_user.profession if current_user else None
                    user_about_me = current_user.about_me if current_user else None
                    user_financial_goals = current_user.financial_goals if current_user else None
                    quiz_profile = None
                    if current_user and current_user.quiz_profile:
                        try:
                            quiz_profile = json.loads(current_user.quiz_profile)
                        except Exception:
                            quiz_profile = None
                    
                    # Plausibilitätsanalyse
                    print("  - Starte Plausibilitätsanalyse...")
                    futures['plausibility'] = executor.submit(
                        llm_service.generate_plausibility_analysis,
                        scenarios, finance_data, user_goal, user_profession, user_about_me, user_financial_goals, quiz_profile
                    )
                    
                    # Tipps
                    print("  - Starte Tipps-Generierung...")
                    futures['tips'] = executor.submit(
                        llm_service.generate_tips,
                        finance_data, user_goal, user_profession, user_about_me, user_financial_goals, quiz_profile
                    )
                    
                    # Szenario-Analyse (kurze Analyse aller 3 Szenarien)
                    print("  - Starte Szenario-Analyse...")
                    futures['scenario_analysis'] = executor.submit(
                        llm_service.generate_scenario_analysis,
                        scenarios, finance_data, user_goal, user_profession, user_about_me, user_financial_goals, quiz_profile
                    )
                    
                    # Zusammenfassung/Итоги
                    print("  - Starte Zusammenfassung...")
                    futures['summary'] = executor.submit(
                        llm_service.generate_summary,
                        scenarios, finance_data, user_goal, user_profession, user_about_me, user_financial_goals, quiz_profile
                    )
                    
                    # Ergebnisse sammeln (warten auf alle)
                    print("  - Warte auf alle LLM-Antworten...")
                    plausibility_analysis = futures['plausibility'].result()
                    if plausibility_analysis:
                        print(f"  ✅ Plausibilitätsanalyse erhalten ({len(plausibility_analysis)} Zeichen)")
                        print(f"  📝 Erste 100 Zeichen: {plausibility_analysis[:100]}...")
                    else:
                        print(f"  ⚠️ Plausibilitätsanalyse nicht verfügbar (LLM-Fehler oder Quota überschritten)")
                    
                    tips = futures['tips'].result()
                    if tips:
                        print(f"  ✅ Tipps erhalten ({len(tips)} Zeichen)")
                        print(f"  📝 Erste 100 Zeichen: {tips[:100]}...")
                    else:
                        print(f"  ⚠️ Tipps nicht verfügbar (LLM-Fehler oder Quota überschritten)")
                    
                    scenario_analysis = futures['scenario_analysis'].result()
                    if scenario_analysis:
                        print(f"  ✅ Szenario-Analyse erhalten ({len(scenario_analysis)} Zeichen)")
                    else:
                        print(f"  ⚠️ Szenario-Analyse nicht verfügbar")
                    
                    summary = futures['summary'].result()
                    if summary:
                        print(f"  ✅ Zusammenfassung erhalten ({len(summary)} Zeichen)")
                    else:
                        print(f"  ⚠️ Zusammenfassung nicht verfügbar")
                
                print("✅ Alle LLM-Analysen abgeschlossen")
            except Exception as e:
                print(f"⚠️ LLM-Fehler (wird ignoriert): {str(e)}")
                import traceback
                traceback.print_exc()
                # Stelle sicher, dass None-Werte gesetzt sind
                if plausibility_analysis is None:
                    plausibility_analysis = None
                if tips is None:
                    tips = None
                if 'scenario_analysis' not in locals():
                    scenario_analysis = None
                if 'summary' not in locals():
                    summary = None
        
        # Response zusammenstellen
        print("📦 Erstelle Response...")
        print(f"🔍 Debug: plausibility_analysis = {plausibility_analysis is not None} ({len(plausibility_analysis) if plausibility_analysis else 0} Zeichen)")
        print(f"🔍 Debug: tips = {tips is not None} ({len(tips) if tips else 0} Zeichen)")
        
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
                "plausibility": plausibility_analysis if (plausibility_analysis and plausibility_analysis.strip()) else None,
                "tips": tips if (tips and tips.strip()) else None,
                "scenario_analysis": scenario_analysis if (scenario_analysis and scenario_analysis.strip()) else None,
                "summary": summary if (summary and summary.strip()) else None
            },
            "errors": csv_parser.errors,
            "warnings": csv_parser.warnings
        }
        
        print("✅ Response erstellt, sende an Client...")
        
        # Save to history if user is authenticated
        if current_user:
            try:
                # Generate title from user goal or use default
                title = user_goal[:50] if user_goal and len(user_goal) > 0 else f"Analyse vom {datetime.utcnow().strftime('%d.%m.%Y')}"
                if len(title) > 100:
                    title = title[:100]
                
                history_entry = AnalysisHistory(
                    user_id=current_user.id,
                    title=title,
                    user_goal=user_goal,
                    analysis_data=json.dumps(response)
                )
                db.add(history_entry)
                db.commit()
                db.refresh(history_entry)
                print(f"✅ Analysis saved to history: ID {history_entry.id}")
            except Exception as e:
                print(f"⚠️ Failed to save analysis to history: {str(e)}")
                # Don't fail the request if history save fails
        
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


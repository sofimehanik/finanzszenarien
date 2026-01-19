"""
LLM Service für KI-gestützte Finanzanalysen
Unterstützt OpenAI GPT-4o und Google Gemini.
"""

import os
import json
from typing import Dict, Optional
from pathlib import Path
from openai import OpenAI
import google.generativeai as genai
from dotenv import load_dotenv

from .scenario_calculator import ScenarioResult
from .csv_parser import ParsedFinanceData

# Load environment variables from .env file in backend directory
backend_dir = Path(__file__).parent.parent
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)


class LLMService:
    """
    Service für KI-basierte Finanzanalysen und Erklärungen.
    
    Designentscheidungen:
    - Unterstützung für mehrere LLM-Provider (OpenAI, Gemini)
    - Strukturierte Prompt-Templates für konsistente Ausgaben
    - Fehlerbehandlung für API-Ausfälle
    - Deutsche Ausgaben, verständlich für Zielgruppe (18-30 Jahre)
    """
    
    def __init__(self, provider: Optional[str] = None):
        self.provider = provider or os.getenv('LLM_PROVIDER', 'openai').lower()
        
        if self.provider == 'openai':
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY nicht gesetzt")
            self.client = OpenAI(api_key=api_key)
            self.model = "gpt-4o"
        elif self.provider == 'gemini':
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("GEMINI_API_KEY nicht gesetzt")
            genai.configure(api_key=api_key)
            # Используем gemini-2.0-flash (доступная модель из списка)
            self.model = genai.GenerativeModel('models/gemini-2.0-flash')
        else:
            raise ValueError(f"Unbekannter Provider: {self.provider}")
    
    def generate_scenario_summary(self, scenario: ScenarioResult, 
                                  finance_data: ParsedFinanceData,
                                  user_goal: Optional[str] = None,
                                  user_profession: Optional[str] = None,
                                  user_about_me: Optional[str] = None,
                                  user_financial_goals: Optional[str] = None,
                                  quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """
        Generiert eine verständliche Zusammenfassung für ein Szenario.
        
        Args:
            scenario: Berechnetes Szenario
            finance_data: Originale Finanzdaten
            
        Returns:
            Deutsche Zusammenfassung als String
        """
        prompt = self._build_scenario_prompt(scenario, finance_data, user_goal, user_profession, user_about_me, user_financial_goals, quiz_profile)
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=220  # Kürzer für Szenario-Zusammenfassungen
                )
                return response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=220,
                    temperature=0.7
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                return response.text.strip()
        except Exception as e:
            # Fallback bei API-Fehler
            return self._generate_fallback_summary(scenario)
    
    def generate_plausibility_analysis(self, scenarios: Dict[str, ScenarioResult],
                                      finance_data: ParsedFinanceData,
                                      user_goal: Optional[str] = None,
                                      user_profession: Optional[str] = None,
                                      user_about_me: Optional[str] = None,
                                      user_financial_goals: Optional[str] = None,
                                      quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """
        Generiert eine Plausibilitätsanalyse für alle Szenarien.
        
        Args:
            scenarios: Dictionary mit allen Szenarien
            finance_data: Originale Finanzdaten
            
        Returns:
            Plausibilitätsanalyse als String
        """
        prompt = self._build_plausibility_prompt(scenarios, finance_data, user_goal, user_profession, user_about_me, user_financial_goals, quiz_profile)
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=350  # 2 Absätze, ca. 100 Wörter
                )
                result = response.choices[0].message.content.strip()
                print(f"📊 Plausibilitätsanalyse erhalten: {len(result)} Zeichen")
                if not result or len(result) < 50:
                    print(f"⚠️ Plausibilitätsanalyse zu kurz oder leer: {len(result) if result else 0} Zeichen (Minimum: 50)")
                    print(f"📝 Inhalt: {result[:200] if result else 'LEER'}")
                    # Zu kurze Antwort = None zurückgeben, nicht fallback
                    return None
                print(f"✅ Plausibilitätsanalyse gültig: {len(result)} Zeichen")
                return result
            else:  # Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=350,
                    temperature=0.7
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                result = response.text.strip() if response.text else ""
                print(f"📊 Plausibilitätsanalyse erhalten (Gemini): {len(result)} Zeichen")
                if not result or len(result) < 50:
                    print(f"⚠️ Plausibilitätsanalyse zu kurz oder leer: {len(result) if result else 0} Zeichen (Minimum: 50)")
                    print(f"📝 Inhalt: {result[:200] if result else 'LEER'}")
                    # Zu kurze Antwort = None zurückgeben, nicht fallback
                    return None
                print(f"✅ Plausibilitätsanalyse gültig: {len(result)} Zeichen")
                return result
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Fehler bei Plausibilitätsanalyse: {error_msg}")
            # Bei API-Fehlern (z.B. 429 Quota) nicht fallback zurückgeben, sondern None
            # damit frontend weiß, dass LLM nicht verfügbar war
            if "429" in error_msg or "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
                print("⚠️ API-Quota überschritten - keine LLM-Analyse verfügbar")
                return None  # None statt fallback, damit frontend fallback anzeigen kann
            return None  # Bei anderen Fehlern auch None zurückgeben
    
    def generate_tips(self, finance_data: ParsedFinanceData, 
                     user_goal: Optional[str] = None,
                     user_profession: Optional[str] = None,
                     user_about_me: Optional[str] = None,
                     user_financial_goals: Optional[str] = None,
                     quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """
        Generiert personalisierte Finanztipps basierend auf den Daten.
        
        Args:
            finance_data: Analysierte Finanzdaten
            user_goal: Finanzielles Ziel des Benutzers
            user_profession: Beruf/Profession des Benutzers
            user_about_me: Zusätzliche Informationen über den Benutzer
            
        Returns:
            Liste von Tipps als String
        """
        prompt = self._build_tips_prompt(finance_data, user_goal, user_profession, user_about_me, user_financial_goals, quiz_profile)
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.8,
                    max_tokens=900  # Kompaktere Antworten
                )
                result = response.choices[0].message.content.strip()
                print(f"📊 Tipps erhalten: {len(result)} Zeichen")
                if not result or len(result) < 50:
                    print(f"⚠️ Tipps zu kurz oder leer: {len(result) if result else 0} Zeichen (Minimum: 50)")
                    print(f"📝 Inhalt: {result[:200] if result else 'LEER'}")
                    # Zu kurze Antwort = None zurückgeben, nicht fallback
                    return None
                print(f"✅ Tipps gültig: {len(result)} Zeichen")
                return result
            else:  # Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=1200,
                    temperature=0.8
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                result = response.text.strip() if response.text else ""
                print(f"📊 Tipps erhalten (Gemini): {len(result)} Zeichen")
                if not result or len(result) < 50:
                    print(f"⚠️ Tipps zu kurz oder leer: {len(result) if result else 0} Zeichen (Minimum: 50)")
                    print(f"📝 Inhalt: {result[:200] if result else 'LEER'}")
                    # Zu kurze Antwort = None zurückgeben, nicht fallback
                    return None
                print(f"✅ Tipps gültig: {len(result)} Zeichen")
                return result
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Fehler bei Tipps-Generierung: {error_msg}")
            # Bei API-Fehlern (z.B. 429 Quota) nicht fallback zurückgeben, sondern None
            # damit frontend weiß, dass LLM nicht verfügbar war
            if "429" in error_msg or "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
                print("⚠️ API-Quota überschritten - keine LLM-Tipps verfügbar")
                return None  # None statt fallback, damit frontend fallback anzeigen kann
            return None  # Bei anderen Fehlern auch None zurückgeben
    
    def _get_system_prompt(self) -> str:
        """System-Prompt für konsistente Ausgaben"""
        return """Du bist ein erfahrener Finanzberater für junge Erwachsene (18-30 Jahre) mit tiefem Verständnis für persönliche Finanzen, Budgetplanung und Sparstrategien.
Deine Aufgabe ist es, detaillierte, tiefgreifende Finanzanalysen zu erstellen, die über oberflächliche Ratschläge hinausgehen.

Anforderungen:
- Verwende einfache, klare Sprache ohne unnötigen Fachjargon
- Sei ermutigend und konstruktiv, aber auch ehrlich über Risiken
- Gehe in die Tiefe: Analysiere Zusammenhänge, Trends und langfristige Auswirkungen
- Biete konkrete, umsetzbare Handlungsempfehlungen mit konkreten Zahlen und Zeitrahmen
- Berücksichtige psychologische Aspekte (Motivation, Gewohnheiten, Lebensstil)
- Antworte immer auf Deutsch
- Verwende Emojis sparsam, nur wenn es die Verständlichkeit verbessert
- Strukturiere deine Antworten klar mit Absätzen und ggf. Aufzählungen für bessere Lesbarkeit"""

    def _format_quiz_profile(self, quiz_profile: Optional[Dict[str, str]]) -> str:
        """Convert quiz answers into prompt-friendly context."""
        if not quiz_profile:
            return ""
        label_map = {
            "profession": "Beruf",
            "net_income": "Netto-Einkommen",
            "fixed_costs": "Fixkosten",
            "main_goal": "Hauptziel",
            "risk_profile": "Risikotyp",
            "savings_rate": "Sparquote",
            "emergency_buffer": "Notgroschen",
            "debt_status": "Schuldenstatus",
            "investment_style": "Investitionsstil",
            "time_horizon": "Zeithorizont",
        }
        details = []
        for key, label in label_map.items():
            value = quiz_profile.get(key)
            if value:
                details.append(f"{label}: {value}")
        extras = [f"{k}: {v}" for k, v in quiz_profile.items() if k not in label_map and quiz_profile.get(k)]
        if extras:
            details.extend(extras)
        if details:
            return "\nQuiz-Daten des Benutzers: " + "; ".join(details)
        return ""
    
    def _build_scenario_prompt(self, scenario: ScenarioResult, 
                              finance_data: ParsedFinanceData,
                              user_goal: Optional[str] = None,
                              user_profession: Optional[str] = None,
                              user_about_me: Optional[str] = None,
                              user_financial_goals: Optional[str] = None,
                              quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """Prompt-Template für Szenario-Zusammenfassungen"""
        goal_context = f"\n\nBenutzerziel: {user_goal}" if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf/Profession des Benutzers: {user_profession}"
        if user_about_me:
            user_context += f"\nZusätzliche Informationen über den Benutzer: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele des Benutzers: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        if user_context:
            user_context += "\nBerücksichtige diese Informationen bei der Analyse und passe die Empfehlungen entsprechend an. Besonders wichtig sind die finanziellen Ziele des Benutzers - analysiere, ob das Szenario diese Ziele unterstützt."
        
        return f"""Analysiere das folgende Finanzszenario im Kontext des Benutzerziels und erstelle eine kurze, verständliche Zusammenfassung:{user_context}

Szenario-Typ: {scenario.title}
Beschreibung: {scenario.description}{goal_context}

Finanzdaten:
- Monatliche Ersparnisse: {scenario.monthly_savings:.2f} €
- Endguthaben nach 12 Monaten: {scenario.final_balance:.2f} €
- Aktuelles Guthaben: {finance_data.net_balance:.2f} €

Risikofaktoren: {', '.join(scenario.risk_factors) if scenario.risk_factors else 'Keine'}
Chancen: {', '.join(scenario.opportunities) if scenario.opportunities else 'Keine'}

Erstelle eine 3-4 Sätze lange Zusammenfassung, die:
1. Das Szenario in Bezug auf das Benutzerziel erklärt
2. Die wichtigsten Erkenntnisse in Bezug auf die Frage/Ziel des Benutzers hervorhebt
3. Eine motivierende Perspektive bietet, die direkt auf das Ziel eingeht

Antworte nur mit der Zusammenfassung, ohne zusätzliche Erklärungen."""
    
    def _build_plausibility_prompt(self, scenarios: Dict[str, ScenarioResult],
                                  finance_data: ParsedFinanceData,
                                  user_goal: Optional[str] = None,
                                  user_profession: Optional[str] = None,
                                  user_about_me: Optional[str] = None,
                                  user_financial_goals: Optional[str] = None,
                                  quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """Prompt-Template für Plausibilitätsanalyse"""
        best = scenarios['best_case']
        worst = scenarios['worst_case']
        realistic = scenarios['realistic_case']
        
        goal_context = f"\n\nWICHTIG: Der Benutzer hat folgendes Ziel/Frage: {user_goal}\nAnalysiere die Szenarien speziell im Hinblick auf dieses Ziel." if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf/Profession des Benutzers: {user_profession}"
        if user_about_me:
            user_context += f"\nZusätzliche Informationen über den Benutzer: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele des Benutzers: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        if user_context:
            user_context += "\nBerücksichtige diese Informationen bei der Plausibilitätsbewertung. Wie beeinflussen Beruf, persönliche Situation und vor allem die finanziellen Ziele die Realisierbarkeit der Szenarien? Bewerte, ob die Szenarien helfen, die finanziellen Ziele des Benutzers zu erreichen."
        
        goal_context = goal_context + user_context
        
        # Berechne zusätzliche Metriken für tiefere Analyse
        savings_rate = ((finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']) / finance_data.monthly_averages['income'] * 100) if finance_data.monthly_averages['income'] > 0 else 0
        top_categories = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)[:3]
        category_breakdown = ', '.join([f"{cat}: {amt:.0f} €" for cat, amt in top_categories]) or "keine auffälligen Kategorien"
        
        return f"""Erstelle eine knappe Plausibilitätsanalyse der drei Szenarien:{goal_context}

Szenario-Überblick:
- Best: {best.monthly_savings:.2f} €/Monat → {best.final_balance:.2f} €
- Realistic: {realistic.monthly_savings:.2f} €/Monat → {realistic.final_balance:.2f} €
- Worst: {worst.monthly_savings:.2f} €/Monat → {worst.final_balance:.2f} €
- Sparrate aktuell: {savings_rate:.1f}% ({finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']:.2f} €)
- Größte Ausgabenfelder: {category_breakdown}

Schreibe GENAU zwei Absätze (je 3-4 Sätze, gesamt 90-120 Wörter):
Im ersten Absatz erkläre, welches Szenario am plausibelsten ist und warum. Verknüpfe es direkt mit dem Ziel.
Im zweiten Absatz beschreibe, welche Risiken und Chancen daraus folgen.
WICHTIG: Schreibe den Text direkt als Fließtext ohne Überschriften, ohne "Absatz 1" oder "Absatz 2", ohne Nummerierung. Maximal 1-2 Emojis innerhalb des Textes, keine Bulletpoints. Beginne einfach mit dem Inhalt."""
    
    def _build_tips_prompt(self, finance_data: ParsedFinanceData, 
                          user_goal: Optional[str] = None,
                          user_profession: Optional[str] = None,
                          user_about_me: Optional[str] = None,
                          user_financial_goals: Optional[str] = None,
                          quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """Prompt-Template für personalisierte Tipps"""
        top_categories = sorted(
            finance_data.categories.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        
        goal_context = f"\n\nWICHTIG: Der Benutzer hat folgendes Ziel/Frage: {user_goal}\nDie Tipps sollten direkt auf dieses Ziel eingehen und helfen, es zu erreichen." if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf/Profession des Benutzers: {user_profession}"
        if user_about_me:
            user_context += f"\nZusätzliche Informationen über den Benutzer: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele des Benutzers: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        if user_context:
            user_context += "\nBerücksichtige diese Informationen bei den Tipps. Passe die Empfehlungen an den Beruf, die persönliche Situation und VOR ALLEM an die finanziellen Ziele des Benutzers an. Die Tipps sollten konkret helfen, die finanziellen Ziele zu erreichen. Welche spezifischen Möglichkeiten oder Herausforderungen ergeben sich aus dem Beruf, den persönlichen Umständen und den Zielen?"
        
        goal_context = goal_context + user_context
        
        # Berechne zusätzliche Metriken
        monthly_savings = finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']
        savings_rate = (monthly_savings / finance_data.monthly_averages['income'] * 100) if finance_data.monthly_averages['income'] > 0 else 0
        total_expenses = finance_data.total_expenses
        total_income = finance_data.total_income
        expense_ratio = (total_expenses / total_income * 100) if total_income > 0 else 0
        
        # Kurzfassung für Ausgabenkategorien (max. 4)
        top_spend = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)[:4]
        category_details = ', '.join([f"{cat}: {amt:.0f} € ({amt/total_expenses*100:.1f}%)" for cat, amt in top_spend]) or "keine dominanten Kategorien"
        
        return f"""Erstelle kompakte, priorisierte Finanztipps basierend auf diesen Daten:{goal_context}

Finanzüberblick:
- Einnahmen ∅: {finance_data.monthly_averages['income']:.2f} € | Ausgaben ∅: {finance_data.monthly_averages['expenses']:.2f} €
- Ersparnis ∅: {monthly_savings:.2f} € (Sparrate {savings_rate:.1f}%)
- Top-Ausgaben: {category_details}

Antwortstruktur:
1. Kurzes Fazit (2 Sätze) – Kann das Ziel erreicht werden?
2. Direkte Antwort auf die Frage (1 Satz + 2 Bulletpoints mit ✓/⚠️/💡)
3. GENAU 6 Tipps im Format „Emoji Titel – 1 kurzer Satz“ (wichtigste zuerst, direkt auf das Ziel bezogen).

Sprache klar und motivierend, insgesamt maximal 220 Wörter."""
    
    def _generate_fallback_summary(self, scenario: ScenarioResult) -> str:
        """Fallback-Zusammenfassung ohne LLM"""
        return f"""Das {scenario.title} zeigt, dass du bei diesem Szenario 
{scenario.monthly_savings:.2f} € monatlich sparen könntest. 
Nach 12 Monaten würdest du ein Guthaben von {scenario.final_balance:.2f} € haben. 
{'Dieses Szenario bietet gute Chancen für den Aufbau von Ersparnissen.' if scenario.monthly_savings > 0 else 'Achte auf eine ausgewogene Budgetplanung.'}"""
    
    def _generate_fallback_plausibility(self, scenarios: Dict[str, ScenarioResult]) -> str:
        """Fallback-Plausibilität ohne LLM"""
        realistic = scenarios['realistic_case']
        return f"""Das realistischste Szenario basiert auf deinen historischen Daten. 
Es zeigt eine monatliche Ersparnis von {realistic.monthly_savings:.2f} €. 
Das Best Case Szenario ist optimistisch, während das Worst Case Szenario 
als Vorsichtsmaßnahme dient. Plane am besten mit dem Realistic Case."""
    
    def generate_scenario_analysis(self, scenarios: Dict[str, ScenarioResult],
                                   finance_data: ParsedFinanceData,
                                   user_goal: Optional[str] = None,
                                   user_profession: Optional[str] = None,
                                   user_about_me: Optional[str] = None,
                                   user_financial_goals: Optional[str] = None,
                                   quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """Generiert eine kurze Analyse aller 3 Szenarien"""
        goal_context = f"\n\nBenutzerziel: {user_goal}" if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf: {user_profession}"
        if user_about_me:
            user_context += f"\nPersönliche Info: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        
        prompt = f"""Erstelle eine KURZE, PRÄGNANTE Analyse der drei Finanzszenarien auf Deutsch:{goal_context}{user_context}

Szenarien:
1. BEST CASE: {scenarios['best_case'].monthly_savings:.2f} €/Monat → {scenarios['best_case'].final_balance:.2f} €
2. REALISTIC CASE: {scenarios['realistic_case'].monthly_savings:.2f} €/Monat → {scenarios['realistic_case'].final_balance:.2f} €
3. WORST CASE: {scenarios['worst_case'].monthly_savings:.2f} €/Monat → {scenarios['worst_case'].final_balance:.2f} €

Format (MAXIMAL 2-3 Sätze pro Szenario):
BEST CASE: [Kurze Beschreibung, was dieses Szenario bedeutet]

REALISTIC CASE: [Kurze Beschreibung, was dieses Szenario bedeutet]

WORST CASE: [Kurze Beschreibung, was dieses Szenario bedeutet]

Antworte NUR mit der Analyse, sehr kurz und prägnant."""
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=250
                )
                return response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=250,
                    temperature=0.7
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                return response.text.strip() if response.text else ""
        except Exception as e:
            print(f"❌ Fehler bei Szenario-Analyse: {e}")
            return None
    
    def generate_summary(self, scenarios: Dict[str, ScenarioResult],
                        finance_data: ParsedFinanceData,
                        user_goal: Optional[str] = None,
                        user_profession: Optional[str] = None,
                        user_about_me: Optional[str] = None,
                        user_financial_goals: Optional[str] = None,
                        quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """Generiert eine abschließende Zusammenfassung/Итоги"""
        goal_context = f"\n\nBenutzerziel: {user_goal}" if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf: {user_profession}"
        if user_about_me:
            user_context += f"\nPersönliche Info: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        
        savings_rate = ((finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']) / finance_data.monthly_averages['income'] * 100) if finance_data.monthly_averages['income'] > 0 else 0
        
        prompt = f"""Erstelle eine KURZE, MOTIVIERENDE Zusammenfassung der Finanzanalyse auf Deutsch:{goal_context}{user_context}

Zusammenfassung:
- Monatliche Sparrate: {finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']:.2f} € ({savings_rate:.1f}%)
- Best Case nach 12 Monaten: {scenarios['best_case'].final_balance:.2f} €
- Realistic Case nach 12 Monaten: {scenarios['realistic_case'].final_balance:.2f} €
- Worst Case nach 12 Monaten: {scenarios['worst_case'].final_balance:.2f} €

Format (MAXIMAL 3-4 Sätze):
[Kurze, motivierende Zusammenfassung der wichtigsten Erkenntnisse und nächsten Schritte]

Antworte NUR mit der Zusammenfassung, sehr kurz und prägnant."""
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=220
                )
                return response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=220,
                    temperature=0.7
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                return response.text.strip() if response.text else ""
        except Exception as e:
            print(f"❌ Fehler bei Zusammenfassung: {e}")
            return None
    
    def generate_tip_details(self, tip_title: str, tip_description: str,
                             finance_data: ParsedFinanceData,
                             user_goal: Optional[str] = None,
                             user_profession: Optional[str] = None,
                             user_about_me: Optional[str] = None,
                             user_financial_goals: Optional[str] = None,
                             quiz_profile: Optional[Dict[str, str]] = None) -> str:
        """Generiert detaillierte Informationen zu einem spezifischen Tipp"""
        goal_context = f"\n\nBenutzerziel: {user_goal}" if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf: {user_profession}"
        if user_about_me:
            user_context += f"\nPersönliche Info: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        
        monthly_savings = finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']
        savings_rate = (monthly_savings / finance_data.monthly_averages['income'] * 100) if finance_data.monthly_averages['income'] > 0 else 0
        
        prompt = f"""Erkläre kompakt, warum dieser Tipp relevant ist und wie er umgesetzt werden kann:{goal_context}{user_context}

TIP:
Titel: {tip_title}
Beschreibung: {tip_description}

Finanzkontext:
- Einnahmen ∅: {finance_data.monthly_averages['income']:.2f} € | Ausgaben ∅: {finance_data.monthly_averages['expenses']:.2f} €
- Ersparnisse ∅: {monthly_savings:.2f} € (Sparrate {savings_rate:.1f}%)

Anweisungen:
- Maximal 2 Absätze, jeweils 3 Sätze (insgesamt < 140 Wörter)
- Im ersten Absatz: Erkläre die Wirkung und Relevanz des Tipps im Kontext des Ziels
- Im zweiten Absatz: Beschreibe 2-3 konkrete Umsetzungsschritte (Zahlen nennen, falls sinnvoll)
- Höchstens 2 Emojis innerhalb des Textes (⚠️, 💡, ✅, 🎯)
- Keine Bulletpoints, keine Überschriften.
WICHTIG: Schreibe den Text direkt als Fließtext ohne Überschriften, ohne "Absatz 1" oder "Absatz 2", ohne Nummerierung. Beginne einfach mit dem Inhalt."""
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=280  # Kürzere Antworten
                )
                return response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=280,
                    temperature=0.7
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                return response.text.strip() if response.text else ""
        except Exception as e:
            print(f"❌ Fehler bei Tip-Details-Generierung: {e}")
            return None
    
    def _generate_fallback_tips(self, finance_data: ParsedFinanceData) -> str:
        """Fallback-Tipps ohne LLM - immer 6 Tipps"""
        savings = finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']
        return f"""FAZIT: Basierend auf deinen aktuellen Finanzdaten kannst du deine Ziele erreichen, wenn du konsequent an deiner Budgetplanung arbeitest.

ANTWORT AUF DIE FRAGE:
• ✓ Deine aktuelle Sparrate ermöglicht es dir, deine Ziele zu verfolgen
• ⚠️ Achte auf unerwartete Ausgaben und plane einen Puffer ein
• 💡 Regelmäßige Überprüfung deines Budgets hilft, auf Kurs zu bleiben

TIPPS:
1. 💰 Monatliche Sparrate optimieren - {'Nutze deine monatlichen Ersparnisse von {:.2f} € strategisch für deine Ziele'.format(savings) if savings > 0 else 'Identifiziere Einsparpotenziale, um eine positive Sparrate zu erreichen'}
2. ✂️ Ausgabenkategorien analysieren - Überprüfe regelmäßig deine größten Ausgabenposten und finde Optimierungsmöglichkeiten
3. 📊 Budgetplanung erstellen - Erstelle ein monatliches Budget basierend auf deinen durchschnittlichen Einnahmen und Ausgaben
4. 🧱 Notgroschen aufbauen - Baue einen Notgroschen für unerwartete Ausgaben auf, um finanzielle Sicherheit zu gewinnen
5. 🚀 Langfristige Ziele setzen - Definiere konkrete, messbare finanzielle Ziele mit klaren Zeitrahmen
6. 🔍 Regelmäßige Finanzanalyse - Führe monatlich eine Analyse deiner Finanzen durch, um Trends zu erkennen und Anpassungen vorzunehmen"""
    
    def generate_scenario_data(self, finance_data: ParsedFinanceData,
                               user_goal: Optional[str] = None,
                               months_ahead: int = 12,
                               user_profession: Optional[str] = None,
                               user_about_me: Optional[str] = None,
                               user_financial_goals: Optional[str] = None,
                               quiz_profile: Optional[Dict[str, str]] = None) -> Optional[Dict]:
        """
        Generiert konkrete Finanzdaten für Szenarien basierend auf Benutzerziel.
        AI gibt konkrete Einnahmen/Ausgaben zurück, nicht nur Prozente.
        
        Returns:
            Dictionary mit 'best_case', 'realistic_case', 'worst_case'
            Jedes Szenario enthält:
            - base_monthly_income: Basis-Einkommen pro Monat
            - base_monthly_expenses: Basis-Ausgaben pro Monat
            - expense_breakdown: Detaillierte Aufschlüsselung der Ausgaben (z.B. Miete, Essen, Versicherung)
            - income_sources: Quellen des Einkommens
            - description: Beschreibung des Szenarios
            Oder None bei Fehler
        """
        goal_context = f"\n\nWICHTIG: Der Benutzer hat folgendes Ziel/Frage: {user_goal}\nGeneriere realistische Finanzdaten basierend auf diesem Ziel." if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf/Profession: {user_profession}"
        if user_about_me:
            user_context += f"\nPersönliche Informationen: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        
        monthly_income = finance_data.monthly_averages['income']
        monthly_expenses = finance_data.monthly_averages['expenses']
        top_categories = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)[:5]
        category_details = ', '.join([f"{cat}: {amt:.0f} €" for cat, amt in top_categories]) or "keine"
        
        prompt = f"""Erstelle realistische Finanzszenarien basierend auf den historischen Daten und dem Benutzerziel.{goal_context}{user_context}

AKTUELLE FINANZDATEN:
- Monatliches Einkommen (Durchschnitt): {monthly_income:.2f} €
- Monatliche Ausgaben (Durchschnitt): {monthly_expenses:.2f} €
- Top-Ausgabenkategorien: {category_details}
- Zeitraum: {months_ahead} Monate

AUFGABE:
Generiere für JEDES der 3 Szenarien (best_case, realistic_case, worst_case) konkrete Finanzdaten im JSON-Format.

BEISPIEL für Ziel "Studium in Australien":
- best_case: Einkommen (Stipendium + Teilzeitjob), Ausgaben (Miete in Sydney, Essen, Versicherung, Flug)
- realistic_case: Einkommen (Teilzeitjob), Ausgaben (Miete, Essen, Versicherung, Flug, Notfallreserve)
- worst_case: Einkommen (nur Stipendium), Ausgaben (hohe Miete, teures Essen, Versicherung, Flug, unerwartete Kosten)

WICHTIG:
- Gib KONKRETE ZAHLEN, nicht nur Prozente
- Berücksichtige das Benutzerziel bei der Berechnung (z.B. wenn Ziel "Studium in Australien" → Miete in Australien, Versicherung, Flugkosten)
- expense_breakdown sollte konkrete Kategorien enthalten (z.B. "Miete: 1200", "Essen: 400", "Versicherung: 150")
- income_sources sollte Quellen beschreiben (z.B. "Gehalt: 2500", "Nebentätigkeit: 300")

JSON-Format:
{{
  "best_case": {{
    "base_monthly_income": <Zahl>,
    "base_monthly_expenses": <Zahl>,
    "expense_breakdown": {{"Kategorie1": <Zahl>, "Kategorie2": <Zahl>, ...}},
    "income_sources": {{"Quelle1": <Zahl>, "Quelle2": <Zahl>, ...}},
    "description": "Kurze Beschreibung des Szenarios"
  }},
  "realistic_case": {{
    "base_monthly_income": <Zahl>,
    "base_monthly_expenses": <Zahl>,
    "expense_breakdown": {{"Kategorie1": <Zahl>, "Kategorie2": <Zahl>, ...}},
    "income_sources": {{"Quelle1": <Zahl>, "Quelle2": <Zahl>, ...}},
    "description": "Kurze Beschreibung des Szenarios"
  }},
  "worst_case": {{
    "base_monthly_income": <Zahl>,
    "base_monthly_expenses": <Zahl>,
    "expense_breakdown": {{"Kategorie1": <Zahl>, "Kategorie2": <Zahl>, ...}},
    "income_sources": {{"Quelle1": <Zahl>, "Quelle2": <Zahl>, ...}},
    "description": "Kurze Beschreibung des Szenarios"
  }}
}}

ANTWORTE NUR MIT VALIDEM JSON, KEINEM ANDEREN TEXT."""
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt() + "\n\nWICHTIG: Antworte IMMER mit validem JSON-Format. Gib konkrete Zahlen, keine Prozente."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2000,
                    response_format={"type": "json_object"}
                )
                result_text = response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"""{self._get_system_prompt()}

WICHTIG: Antworte IMMER mit validem JSON-Format. Gib konkrete Zahlen, keine Prozente.

{prompt}"""
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=2000,
                    temperature=0.7,
                    response_mime_type="application/json"
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                result_text = response.text.strip() if response.text else ""
            
            if not result_text:
                print("⚠️ Leere Antwort von LLM für Szenario-Daten")
                return None
            
            # Try to extract JSON if there's extra text
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.startswith('```'):
                result_text = result_text[3:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            try:
                result_dict = json.loads(result_text)
            except json.JSONDecodeError as e:
                print(f"❌ JSON-Parse-Fehler bei Szenario-Daten: {e}")
                print(f"📝 Antwort-Text (erste 500 Zeichen): {result_text[:500]}")
                return None
            
            # Validate structure
            required_scenarios = ['best_case', 'realistic_case', 'worst_case']
            for scenario_key in required_scenarios:
                if scenario_key not in result_dict:
                    print(f"⚠️ Fehlendes Szenario: {scenario_key}")
                    return None
                scenario = result_dict[scenario_key]
                required_fields = ['base_monthly_income', 'base_monthly_expenses', 'expense_breakdown', 'income_sources', 'description']
                for field in required_fields:
                    if field not in scenario:
                        print(f"⚠️ Fehlendes Feld {field} in {scenario_key}")
                        return None
            
            print(f"✅ Szenario-Daten erhalten: {len(result_text)} Zeichen")
            return result_dict
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Fehler bei Szenario-Daten-Generierung: {error_msg}")
            import traceback
            traceback.print_exc()
            if "429" in error_msg or "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
                print("⚠️ API-Quota überschritten - keine LLM-Szenario-Daten verfügbar")
            return None
    
    def generate_unified_analysis(self, scenarios: Dict[str, ScenarioResult],
                                  finance_data: ParsedFinanceData,
                                  user_goal: Optional[str] = None,
                                  user_profession: Optional[str] = None,
                                  user_about_me: Optional[str] = None,
                                  user_financial_goals: Optional[str] = None,
                                  quiz_profile: Optional[Dict[str, str]] = None) -> Optional[Dict[str, str]]:
        """
        Generiert eine einheitliche Analyse mit allen 4 Komponenten in einem einzigen LLM-Aufruf.
        Gibt ein strukturiertes JSON-Dictionary zurück.
        
        Returns:
            Dictionary mit keys: 'plausibility', 'tips', 'scenario_analysis', 'summary'
            Oder None bei Fehler
        """
        
        # Build user context
        goal_context = f"\n\nWICHTIG: Der Benutzer hat folgendes Ziel/Frage: {user_goal}" if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf/Profession des Benutzers: {user_profession}"
        if user_about_me:
            user_context += f"\nZusätzliche Informationen über den Benutzer: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele des Benutzers: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        
        # Calculate metrics
        best = scenarios['best_case']
        worst = scenarios['worst_case']
        realistic = scenarios['realistic_case']
        monthly_savings = finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']
        savings_rate = (monthly_savings / finance_data.monthly_averages['income'] * 100) if finance_data.monthly_averages['income'] > 0 else 0
        top_categories = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)[:3]
        category_breakdown = ', '.join([f"{cat}: {amt:.0f} €" for cat, amt in top_categories]) or "keine auffälligen Kategorien"
        top_spend = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)[:4]
        category_details = ', '.join([f"{cat}: {amt:.0f} € ({amt/finance_data.total_expenses*100:.1f}%)" for cat, amt in top_spend]) or "keine dominanten Kategorien"
        
        # Build unified prompt
        prompt = f"""Erstelle eine umfassende Finanzanalyse basierend auf den folgenden Daten. Du musst ALLE 4 Teile der Analyse in einem strukturierten JSON-Format zurückgeben.{goal_context}{user_context}

FINANZDATEN:
- Einnahmen ∅: {finance_data.monthly_averages['income']:.2f} € | Ausgaben ∅: {finance_data.monthly_averages['expenses']:.2f} €
- Ersparnis ∅: {monthly_savings:.2f} € (Sparrate {savings_rate:.1f}%)
- Top-Ausgaben: {category_details}

SZENARIEN:
- BEST CASE: {best.monthly_savings:.2f} €/Monat → {best.final_balance:.2f} €
- REALISTIC CASE: {realistic.monthly_savings:.2f} €/Monat → {realistic.final_balance:.2f} €
- WORST CASE: {worst.monthly_savings:.2f} €/Monat → {worst.final_balance:.2f} €

AUFGABE:
Erstelle eine JSON-Antwort mit genau diesen 4 Feldern:

1. "plausibility": GENAU zwei Absätze (je 3-4 Sätze, gesamt 90-120 Wörter). 
   - Im ersten Absatz: Welches Szenario ist am plausibelsten und warum? Verknüpfe es direkt mit dem Ziel.
   - Im zweiten Absatz: Welche Risiken und Chancen folgen daraus?
   - WICHTIG: Fließtext ohne Überschriften, ohne "Absatz 1/2", ohne Nummerierung. Maximal 1-2 Emojis.

2. "tips": Strukturierte Tipps im Format:
   - Kurzes Fazit (2 Sätze) – Kann das Ziel erreicht werden?
   - Direkte Antwort auf die Frage (1 Satz + 2 Bulletpoints mit ✓/⚠️/💡)
   - GENAU 6 Tipps im Format „Emoji Titel – 1 kurzer Satz“ (wichtigste zuerst, direkt auf das Ziel bezogen)
   - Insgesamt maximal 220 Wörter

3. "scenario_analysis": KURZE Analyse aller 3 Szenarien (MAXIMAL 2-3 Sätze pro Szenario):
   - BEST CASE: [Kurze Beschreibung]
   - REALISTIC CASE: [Kurze Beschreibung]
   - WORST CASE: [Kurze Beschreibung]

4. "summary": KURZE, MOTIVIERENDE Zusammenfassung (MAXIMAL 3-4 Sätze) der wichtigsten Erkenntnisse und nächsten Schritte

ANTWORTE NUR MIT VALIDEM JSON, KEINEM ANDEREN TEXT:
{{
  "plausibility": "...",
  "tips": "...",
  "scenario_analysis": "...",
  "summary": "..."
}}"""
        
        try:
            if self.provider == 'openai':
                # Use JSON mode for OpenAI
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt() + "\n\nWICHTIG: Antworte IMMER mit validem JSON-Format. Keine zusätzlichen Erklärungen außerhalb des JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2000,  # Больше токенов для объединенного ответа
                    response_format={"type": "json_object"}
                )
                result_text = response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"""{self._get_system_prompt()}

WICHTIG: Antworte IMMER mit validem JSON-Format. Keine zusätzlichen Erklärungen außerhalb des JSON.

{prompt}"""
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=2000,
                    temperature=0.7,
                    response_mime_type="application/json"
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                result_text = response.text.strip() if response.text else ""
            
            # Parse JSON response
            if not result_text:
                print("⚠️ Leere Antwort von LLM")
                return None
            
            # Try to extract JSON if there's extra text
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.startswith('```'):
                result_text = result_text[3:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            # Parse JSON
            try:
                result_dict = json.loads(result_text)
            except json.JSONDecodeError as e:
                print(f"❌ JSON-Parse-Fehler: {e}")
                print(f"📝 Antwort-Text (erste 500 Zeichen): {result_text[:500]}")
                return None
            
            # Validate structure
            required_keys = ['plausibility', 'tips', 'scenario_analysis', 'summary']
            for key in required_keys:
                if key not in result_dict:
                    print(f"⚠️ Fehlendes Feld im JSON: {key}")
                    result_dict[key] = None
                elif not result_dict[key] or len(str(result_dict[key]).strip()) < 20:
                    print(f"⚠️ Feld {key} zu kurz oder leer")
                    result_dict[key] = None
            
            print(f"✅ Unified Analysis erhalten: {len(result_text)} Zeichen")
            return result_dict
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Fehler bei Unified Analysis: {error_msg}")
            import traceback
            traceback.print_exc()
            if "429" in error_msg or "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
                print("⚠️ API-Quota überschritten - keine LLM-Analyse verfügbar")
            return None
    
    def generate_complete_analysis(self, finance_data: ParsedFinanceData,
                                   user_goal: Optional[str] = None,
                                   months_ahead: int = 12,
                                   user_profession: Optional[str] = None,
                                   user_about_me: Optional[str] = None,
                                   user_financial_goals: Optional[str] = None,
                                   quiz_profile: Optional[Dict[str, str]] = None) -> Optional[Dict]:
        """
        Generiert KOMPLETTE Analyse in einem einzigen LLM-Aufruf:
        - Szenario-Daten (best/realistic/worst с конкретными доходами/расходами)
        - Plausibilitätsanalyse
        - Tipps
        - Szenario-Analyse
        - Zusammenfassung
        
        Returns:
            Dictionary mit:
            - 'scenarios': {best_case, realistic_case, worst_case} с данными
            - 'plausibility': текст
            - 'tips': текст
            - 'scenario_analysis': текст
            - 'summary': текст
            Oder None bei Fehler
        """
        goal_context = f"\n\nWICHTIG: Der Benutzer hat folgendes Ziel/Frage: {user_goal}" if user_goal else ""
        
        user_context = ""
        if user_profession:
            user_context += f"\nBeruf/Profession: {user_profession}"
        if user_about_me:
            user_context += f"\nPersönliche Informationen: {user_about_me}"
        if user_financial_goals:
            user_context += f"\nFinanzielle Ziele: {user_financial_goals}"
        quiz_context = self._format_quiz_profile(quiz_profile)
        if quiz_context:
            user_context += quiz_context
        
        monthly_income = finance_data.monthly_averages['income']
        monthly_expenses = finance_data.monthly_averages['expenses']
        monthly_savings = monthly_income - monthly_expenses
        savings_rate = (monthly_savings / monthly_income * 100) if monthly_income > 0 else 0
        top_categories = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)[:5]
        category_details = ', '.join([f"{cat}: {amt:.0f} €" for cat, amt in top_categories]) or "keine"
        
        prompt = f"""Erstelle eine KOMPLETTE Finanzanalyse in einem einzigen JSON-Format.{goal_context}{user_context}

AKTUELLE FINANZDATEN:
- Monatliches Einkommen (Durchschnitt): {monthly_income:.2f} €
- Monatliche Ausgaben (Durchschnitt): {monthly_expenses:.2f} €
- Monatliche Ersparnis: {monthly_savings:.2f} € (Sparrate {savings_rate:.1f}%)
- Top-Ausgabenkategorien: {category_details}
- Zeitraum: {months_ahead} Monate

AUFGABE - Erstelle JSON mit ALLEN folgenden Feldern:

1. "scenarios": Drei Szenarien mit KONKRETEN Finanzdaten (nicht Prozente!)
   - "best_case": {{"base_monthly_income": <Zahl>, "base_monthly_expenses": <Zahl>, "expense_breakdown": {{"Kategorie": <Zahl>, ...}}, "income_sources": {{"Quelle": <Zahl>, ...}}, "description": "..."}}
   - "realistic_case": {{...}}
   - "worst_case": {{...}}
   - WICHTIG: Berücksichtige das Benutzerziel! (z.B. "Studium in Australien" → Miete in Australien, Versicherung, Flugkosten)

2. "plausibility": GENAU zwei Absätze (je 3-4 Sätze, gesamt 90-120 Wörter)
   - Im ersten Absatz: Welches Szenario ist am plausibelsten und warum? Verknüpfe es direkt mit dem Ziel.
   - Im zweiten Absatz: Welche Risiken und Chancen folgen daraus?
   - Fließtext ohne Überschriften, ohne "Absatz 1/2", ohne Nummerierung. Maximal 1-2 Emojis.

3. "tips": Strukturierte Tipps
   - Kurzes Fazit (2 Sätze) – Kann das Ziel erreicht werden?
   - Direkte Antwort auf die Frage (1 Satz + 2 Bulletpoints mit ✓/⚠️/💡)
   - GENAU 6 Tipps im Format „Emoji Titel – 1 kurzer Satz“ (wichtigste zuerst, direkt auf das Ziel bezogen)
   - Insgesamt maximal 220 Wörter

4. "scenario_analysis": KURZE Analyse aller 3 Szenarien (MAXIMAL 2-3 Sätze pro Szenario)
   - BEST CASE: [Kurze Beschreibung]
   - REALISTIC CASE: [Kurze Beschreibung]
   - WORST CASE: [Kurze Beschreibung]

5. "summary": KURZE, MOTIVIERENDE Zusammenfassung (MAXIMAL 3-4 Sätze) der wichtigsten Erkenntnisse und nächsten Schritte

ANTWORTE NUR MIT VALIDEM JSON, KEINEM ANDEREN TEXT:
{{
  "scenarios": {{
    "best_case": {{...}},
    "realistic_case": {{...}},
    "worst_case": {{...}}
  }},
  "plausibility": "...",
  "tips": "...",
  "scenario_analysis": "...",
  "summary": "..."
}}"""
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt() + "\n\nWICHTIG: Antworte IMMER mit validem JSON-Format. Gib konkrete Zahlen für Szenarien, keine Prozente."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4000,  # Больше токенов для полного ответа
                    response_format={"type": "json_object"}
                )
                result_text = response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"""{self._get_system_prompt()}

WICHTIG: Antworte IMMER mit validem JSON-Format. Gib konkrete Zahlen für Szenarien, keine Prozente.

{prompt}"""
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=4000,
                    temperature=0.7,
                    response_mime_type="application/json"
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                result_text = response.text.strip() if response.text else ""
            
            if not result_text:
                print("⚠️ Leere Antwort von LLM für komplette Analyse")
                return None
            
            # Try to extract JSON if there's extra text
            if result_text.startswith('```json'):
                result_text = result_text[7:]
            if result_text.startswith('```'):
                result_text = result_text[3:]
            if result_text.endswith('```'):
                result_text = result_text[:-3]
            result_text = result_text.strip()
            
            try:
                result_dict = json.loads(result_text)
            except json.JSONDecodeError as e:
                print(f"❌ JSON-Parse-Fehler bei kompletter Analyse: {e}")
                print(f"📝 Antwort-Text (erste 500 Zeichen): {result_text[:500]}")
                return None
            
            # Validate structure
            if 'scenarios' not in result_dict:
                print("⚠️ Fehlendes Feld 'scenarios'")
                return None
            
            scenarios = result_dict['scenarios']
            required_scenarios = ['best_case', 'realistic_case', 'worst_case']
            for scenario_key in required_scenarios:
                if scenario_key not in scenarios:
                    print(f"⚠️ Fehlendes Szenario: {scenario_key}")
                    return None
                scenario = scenarios[scenario_key]
                required_fields = ['base_monthly_income', 'base_monthly_expenses', 'expense_breakdown', 'income_sources', 'description']
                for field in required_fields:
                    if field not in scenario:
                        print(f"⚠️ Fehlendes Feld {field} in {scenario_key}")
                        return None
            
            # Validate other fields
            required_fields = ['plausibility', 'tips', 'scenario_analysis', 'summary']
            for field in required_fields:
                if field not in result_dict:
                    print(f"⚠️ Fehlendes Feld: {field}")
                    result_dict[field] = None
                elif not result_dict[field] or len(str(result_dict[field]).strip()) < 20:
                    print(f"⚠️ Feld {field} zu kurz oder leer")
                    result_dict[field] = None
            
            print(f"✅ Komplette Analyse erhalten: {len(result_text)} Zeichen")
            return result_dict
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Fehler bei kompletter Analyse: {error_msg}")
            import traceback
            traceback.print_exc()
            if "429" in error_msg or "quota" in error_msg.lower() or "insufficient_quota" in error_msg.lower():
                print("⚠️ API-Quota überschritten - keine LLM-Analyse verfügbar")
            return None


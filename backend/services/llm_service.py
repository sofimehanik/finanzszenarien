"""
LLM Service für KI-gestützte Finanzanalysen
Unterstützt OpenAI GPT-4o und Google Gemini.
"""

import os
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
                                  user_goal: Optional[str] = None) -> str:
        """
        Generiert eine verständliche Zusammenfassung für ein Szenario.
        
        Args:
            scenario: Berechnetes Szenario
            finance_data: Originale Finanzdaten
            
        Returns:
            Deutsche Zusammenfassung als String
        """
        prompt = self._build_scenario_prompt(scenario, finance_data, user_goal)
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=300  # Reduziert für Szenario-Zusammenfassungen (weniger wichtig)
                )
                return response.choices[0].message.content.strip()
            else:  # Gemini
                full_prompt = f"{self._get_system_prompt()}\n\n{prompt}"
                generation_config = genai.types.GenerationConfig(
                    max_output_tokens=300,  # Reduziert für Szenario-Zusammenfassungen
                    temperature=0.7
                )
                response = self.model.generate_content(full_prompt, generation_config=generation_config)
                return response.text.strip()
        except Exception as e:
            # Fallback bei API-Fehler
            return self._generate_fallback_summary(scenario)
    
    def generate_plausibility_analysis(self, scenarios: Dict[str, ScenarioResult],
                                      finance_data: ParsedFinanceData,
                                      user_goal: Optional[str] = None) -> str:
        """
        Generiert eine Plausibilitätsanalyse für alle Szenarien.
        
        Args:
            scenarios: Dictionary mit allen Szenarien
            finance_data: Originale Finanzdaten
            
        Returns:
            Plausibilitätsanalyse als String
        """
        prompt = self._build_plausibility_prompt(scenarios, finance_data, user_goal)
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4000  # Erhöht für längere, detailliertere Analysen
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
                    max_output_tokens=4000,  # Erhöht für längere Analysen
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
    
    def generate_tips(self, finance_data: ParsedFinanceData, user_goal: Optional[str] = None) -> str:
        """
        Generiert personalisierte Finanztipps basierend auf den Daten.
        
        Args:
            finance_data: Analysierte Finanzdaten
            
        Returns:
            Liste von Tipps als String
        """
        prompt = self._build_tips_prompt(finance_data, user_goal)
        
        try:
            if self.provider == 'openai':
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self._get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.8,
                    max_tokens=3500  # Erhöht für mehr detaillierte Tipps
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
                    max_output_tokens=3500,  # Erhöht für mehr detaillierte Tipps
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
    
    def _build_scenario_prompt(self, scenario: ScenarioResult, 
                              finance_data: ParsedFinanceData,
                              user_goal: Optional[str] = None) -> str:
        """Prompt-Template für Szenario-Zusammenfassungen"""
        goal_context = f"\n\nBenutzerziel: {user_goal}" if user_goal else ""
        
        return f"""Analysiere das folgende Finanzszenario im Kontext des Benutzerziels und erstelle eine kurze, verständliche Zusammenfassung:

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
                                  user_goal: Optional[str] = None) -> str:
        """Prompt-Template für Plausibilitätsanalyse"""
        best = scenarios['best_case']
        worst = scenarios['worst_case']
        realistic = scenarios['realistic_case']
        
        goal_context = f"\n\nWICHTIG: Der Benutzer hat folgendes Ziel/Frage: {user_goal}\nAnalysiere die Szenarien speziell im Hinblick auf dieses Ziel." if user_goal else ""
        
        # Berechne zusätzliche Metriken für tiefere Analyse
        savings_rate = ((finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']) / finance_data.monthly_averages['income'] * 100) if finance_data.monthly_averages['income'] > 0 else 0
        top_categories = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)[:5]
        category_breakdown = ', '.join([f"{cat}: {amt:.2f} €" for cat, amt in top_categories])
        
        return f"""Erstelle eine detaillierte, tiefgreifende Plausibilitätsanalyse dieser drei Finanzszenarien:{goal_context}

Szenario-Daten:
1. BEST CASE:
   - Monatliche Ersparnisse: {best.monthly_savings:.2f} €
   - Endguthaben nach 12 Monaten: {best.final_balance:.2f} €
   - Risikofaktoren: {', '.join(best.risk_factors) if best.risk_factors else 'Keine'}
   - Chancen: {', '.join(best.opportunities) if best.opportunities else 'Keine'}

2. WORST CASE:
   - Monatliche Ersparnisse: {worst.monthly_savings:.2f} €
   - Endguthaben nach 12 Monaten: {worst.final_balance:.2f} €
   - Risikofaktoren: {', '.join(worst.risk_factors) if worst.risk_factors else 'Keine'}
   - Chancen: {', '.join(worst.opportunities) if worst.opportunities else 'Keine'}

3. REALISTIC CASE:
   - Monatliche Ersparnisse: {realistic.monthly_savings:.2f} €
   - Endguthaben nach 12 Monaten: {realistic.final_balance:.2f} €
   - Risikofaktoren: {', '.join(realistic.risk_factors) if realistic.risk_factors else 'Keine'}
   - Chancen: {', '.join(realistic.opportunities) if realistic.opportunities else 'Keine'}

Historische Finanzdaten (Basis für Projektionen):
- Durchschnittliche monatliche Einnahmen: {finance_data.monthly_averages['income']:.2f} €
- Durchschnittliche monatliche Ausgaben: {finance_data.monthly_averages['expenses']:.2f} €
- Monatliche Sparrate: {savings_rate:.1f}% ({finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']:.2f} €)
- Aktuelles Guthaben: {finance_data.net_balance:.2f} €
- Größte Ausgabenkategorien: {category_breakdown}
- Datumsbereich der Daten: {finance_data.date_range.get('start', 'N/A')} bis {finance_data.date_range.get('end', 'N/A')}

Erstelle eine SEHR UMFASSENDE, TIEFGREIFENDE Plausibilitätsanalyse (15-25 Sätze, mindestens 3-4 Absätze), die:

1. Jedes Szenario EINZELN und AUSFÜHRLICH bewertet (mindestens 4-5 Sätze pro Szenario):
   - Wie realistisch sind die Annahmen? Analysiere Einnahmensteigerung/-senkung, Ausgabenänderungen im Detail.
   - Welche KONKRETEN externen Faktoren könnten das Szenario beeinflussen? (Inflation, Jobwechsel, unerwartete Ausgaben, Marktveränderungen, Lebensereignisse)
   - Wie wahrscheinlich ist es, dass dieses Szenario eintritt? Gib eine prozentuale Einschätzung oder qualitative Bewertung mit Begründung.
   - Welche VORAUSSETZUNGEN müssen erfüllt sein, damit dieses Szenario eintritt?
   - Was sind die größten Risiken und Chancen für dieses spezifische Szenario?

2. Die Szenarien MITEINANDER VERGLEICHT (mindestens 5-6 Sätze):
   - Welche Unterschiede sind besonders signifikant? Erkläre WARUM diese Unterschiede wichtig sind.
   - Welches Szenario ist am wahrscheinlichsten und warum? Gib konkrete Gründe basierend auf den historischen Daten.
   - Welche Risiken und Chancen sind in allen Szenarien konsistent? Was bedeutet das für den Benutzer?
   - Wie groß ist die Spannbreite zwischen Best und Worst Case? Was bedeutet diese Volatilität?

3. KONKRETE HANDLUNGSEMPFEHLUNGEN gibt (mindestens 5-6 Sätze):
   - Ist das Benutzerziel realistisch erreichbar? Wenn ja, unter welchen KONKRETEN Bedingungen? Wenn nein, warum nicht und was kann getan werden?
   - Welche KONKRETEN Schritte sollte der Benutzer unternehmen, um das Ziel zu erreichen? Nenne mindestens 3-4 spezifische Maßnahmen.
   - Welche Fallback-Strategien gibt es, falls das Worst Case eintritt? Beschreibe konkrete Notfallpläne.
   - Welche Meilensteine sollte der Benutzer setzen, um den Fortschritt zu überwachen? Gib konkrete Zeitpunkte und Beträge.
   - Welche Anpassungen am Lebensstil oder Budget sind notwendig?

4. LANGFRISTIGE PERSPEKTIVE bietet (mindestens 3-4 Sätze):
   - Was bedeuten diese Szenarien für die finanzielle Gesundheit in 2-3 Jahren? Berechne oder schätze konkrete Beträge.
   - Welche Gewohnheiten oder Verhaltensänderungen sind notwendig? Beschreibe sie konkret.
   - Welche Investitions- oder Sparstrategien könnten langfristig helfen?
   - Wie sieht die finanzielle Situation in 5 Jahren aus, wenn diese Trends anhalten?

WICHTIG: Gehe wirklich in die Tiefe. Analysiere Zusammenhänge, erkläre WARUM bestimmte Szenarien wahrscheinlicher sind, gib konkrete Zahlen und Zeitrahmen wo möglich. Die Analyse sollte dem Benutzer helfen, fundierte Entscheidungen zu treffen.

Antworte nur mit der detaillierten Analyse, ohne zusätzliche Erklärungen. Strukturiere deine Antwort klar mit Absätzen. Jeder Absatz sollte 3-5 Sätze enthalten."""
    
    def _build_tips_prompt(self, finance_data: ParsedFinanceData, user_goal: Optional[str] = None) -> str:
        """Prompt-Template für personalisierte Tipps"""
        top_categories = sorted(
            finance_data.categories.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        
        goal_context = f"\n\nWICHTIG: Der Benutzer hat folgendes Ziel/Frage: {user_goal}\nDie Tipps sollten direkt auf dieses Ziel eingehen und helfen, es zu erreichen." if user_goal else ""
        
        # Berechne zusätzliche Metriken
        monthly_savings = finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']
        savings_rate = (monthly_savings / finance_data.monthly_averages['income'] * 100) if finance_data.monthly_averages['income'] > 0 else 0
        total_expenses = finance_data.total_expenses
        total_income = finance_data.total_income
        expense_ratio = (total_expenses / total_income * 100) if total_income > 0 else 0
        
        # Erweitere Kategorien-Liste
        all_categories = sorted(finance_data.categories.items(), key=lambda x: x[1], reverse=True)
        category_details = '\n'.join([f"  - {cat}: {amt:.2f} € ({amt/total_expenses*100:.1f}% der Gesamtausgaben)" for cat, amt in all_categories[:8]])
        
        return f"""Erstelle detaillierte, tiefgreifende und personalisierte Finanztipps basierend auf diesen umfassenden Finanzdaten:{goal_context}

Finanzübersicht:
- Monatliche Einnahmen (Durchschnitt): {finance_data.monthly_averages['income']:.2f} €
- Monatliche Ausgaben (Durchschnitt): {finance_data.monthly_averages['expenses']:.2f} €
- Monatliche Ersparnisse: {monthly_savings:.2f} €
- Sparrate: {savings_rate:.1f}% des Einkommens
- Gesamteinnahmen (historisch): {total_income:.2f} €
- Gesamtausgaben (historisch): {total_expenses:.2f} €
- Ausgabenquote: {expense_ratio:.1f}% des Einkommens
- Aktuelles Guthaben: {finance_data.net_balance:.2f} €

Detaillierte Ausgabenverteilung:
{category_details}

Erstelle 7-10 UMFASSENDE, SEHR TIEFGREIFENDE Tipps, die:
1. SEHR KONKRET und umsetzbar sind mit spezifischen Zahlen, Zeitrahmen und detaillierten Handlungsschritten
2. Auf die größten Ausgabenkategorien EINGEHEN und konkrete Einsparpotenziale mit BETRÄGEN aufzeigen (z.B. "Du könntest in Kategorie X monatlich Y€ sparen durch...")
3. Die Sparrate und das aktuelle Guthaben BERÜCKSICHTIGEN und zeigen, wie diese optimiert werden können
4. LANGFRISTIGE Strategien für Vermögensaufbau und finanzielle Sicherheit beinhalten (z.B. Investitionen, Notgroschen, Altersvorsorge)
5. PSYCHOLOGISCHE Aspekte berücksichtigen (Gewohnheiten ändern, Motivation aufrechterhalten, Verhaltensänderungen)
6. DIREKT auf das Benutzerziel eingehen und zeigen, wie es erreicht werden kann mit konkreten Schritten
7. Für junge Erwachsene (18-30) relevant und ansprechend formuliert sind
8. Realistische Erwartungen setzen und gleichzeitig motivierend sind
9. PRIORITÄTEN setzen - welche Tipps sind am wichtigsten und sollten zuerst umgesetzt werden?
10. MESSBARE ZIELE enthalten - wie kann der Benutzer den Fortschritt verfolgen?

Jeder Tipp sollte:
- Eine SEHR KONKRETE Handlungsempfehlung enthalten mit spezifischen Schritten
- Einen ZEITRAHMEN oder Meilenstein nennen (z.B. "In den nächsten 3 Monaten...")
- Erklären, WARUM dieser Tipp wichtig ist und welche Auswirkungen er hat
- KONKRETE ZAHLEN oder Prozentsätze enthalten (z.B. "10% deines Einkommens", "mindestens 500€")
- Einen KONKRETEN NÄCHSTEN SCHRITT vorschlagen (z.B. "Öffne ein separates Sparkonto", "Erstelle eine Excel-Tabelle für...")
- Falls relevant, auf die größten Ausgabenkategorien BEZIEHEN und zeigen, wie dort gespart werden kann

Formatiere als nummerierte Liste. Jeder Tipp sollte 4-6 Sätze lang sein und WIRKLICH in die Tiefe gehen. Erkläre nicht nur WAS zu tun ist, sondern auch WIE und WARUM. Gib konkrete Beispiele und Berechnungen wo möglich."""
    
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
    
    def _generate_fallback_tips(self, finance_data: ParsedFinanceData) -> str:
        """Fallback-Tipps ohne LLM"""
        savings = finance_data.monthly_averages['income'] - finance_data.monthly_averages['expenses']
        return f"""1. Überprüfe regelmäßig deine Ausgaben in den größten Kategorien
2. {'Erstelle einen Sparplan für deine monatlichen Ersparnisse' if savings > 0 else 'Identifiziere Einsparpotenziale in deinen Ausgaben'}
3. Baue einen Notgroschen für unerwartete Ausgaben auf
4. Nutze Budget-Apps oder Tools zur Finanzverfolgung
5. Setze dir konkrete Sparziele für Motivation"""


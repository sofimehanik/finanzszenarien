"""
Szenarien-Berechnung Service
Berechnet Best Case, Worst Case und Realistic Case Szenarien basierend auf historischen Daten und Benutzerzielen.
"""

from typing import Dict, List, Optional
from datetime import datetime
from dateutil.relativedelta import relativedelta
import numpy as np
import re
from pydantic import BaseModel

from .csv_parser import ParsedFinanceData


class ScenarioProjection(BaseModel):
    """Projektion für ein einzelnes Szenario"""
    month: str  # YYYY-MM
    projected_income: float
    projected_expenses: float
    projected_balance: float
    cumulative_balance: float


class ScenarioResult(BaseModel):
    """Vollständiges Szenario-Ergebnis"""
    scenario_type: str  # "best_case", "worst_case", "realistic_case"
    title: str
    description: str
    projections: List[ScenarioProjection]
    final_balance: float
    monthly_savings: float
    risk_factors: List[str]
    opportunities: List[str]


class ScenarioCalculator:
    """
    Berechnet Finanzszenarien basierend auf historischen Daten.
    
    Designentscheidungen:
    - Statistische Analyse (Durchschnitt, Standardabweichung) für realistische Projektionen
    - Best Case: Optimistische Annahmen (höhere Einnahmen, niedrigere Ausgaben)
    - Worst Case: Pessimistische Annahmen (niedrigere Einnahmen, höhere Ausgaben)
    - Realistic Case: Basierend auf historischen Trends mit leichten Variationen
    - 12-Monats-Projektion als Standard
    """
    
    def __init__(self, months_ahead: int = 12):
        self.months_ahead = months_ahead
    
    def calculate_all_scenarios(self, data: ParsedFinanceData, user_goal: Optional[str] = None) -> Dict[str, ScenarioResult]:
        """
        Berechnet alle drei Szenarien basierend auf historischen Daten und Benutzerzielen.
        
        Args:
            data: ParsedFinanceData aus CSV-Parser
            user_goal: Optional user goal/query to incorporate into calculations
            
        Returns:
            Dictionary mit allen Szenarien
        """
        # Historische Daten analysieren
        historical_stats = self._analyze_historical_data(data)
        
        # Parse user goal to extract financial information
        goal_info = self._parse_user_goal(user_goal) if user_goal else {}
        
        scenarios = {
            'best_case': self._calculate_best_case(historical_stats, goal_info),
            'worst_case': self._calculate_worst_case(historical_stats, goal_info),
            'realistic_case': self._calculate_realistic_case(historical_stats, goal_info)
        }
        
        return scenarios
    
    def _parse_user_goal(self, goal: str) -> Dict:
        """
        Parst Benutzerziel und extrahiert finanzielle Informationen.
        
        Returns:
            Dictionary mit extrahierten Informationen (amounts, timeframes, etc.)
        """
        goal_lower = goal.lower()
        info = {
            'monthly_payment': None,
            'target_amount': None,
            'timeframe_months': None,
            'goal_type': None  # 'payment', 'savings', 'purchase', 'other'
        }
        
        # Extract amounts (look for numbers followed by € or Euro)
        amounts = re.findall(r'(\d+(?:[.,]\d+)?)\s*€', goal)
        if not amounts:
            amounts = re.findall(r'€\s*(\d+(?:[.,]\d+)?)', goal)
        if not amounts:
            amounts = re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:euro|EUR)', goal_lower)
        
        # Extract monthly payment mentions
        if any(word in goal_lower for word in ['rate', 'monatlich', 'miete', 'zahlung', 'payment']):
            if amounts:
                info['monthly_payment'] = float(amounts[0].replace(',', '.'))
                info['goal_type'] = 'payment'
        
        # Extract savings target
        if any(word in goal_lower for word in ['sparen', 'ersparen', 'ansparen', 'savings', 'save']):
            if amounts:
                info['target_amount'] = float(amounts[0].replace(',', '.'))
                info['goal_type'] = 'savings'
        
        # Extract timeframe
        months_match = re.search(r'(\d+)\s*(?:monat|month)', goal_lower)
        if months_match:
            info['timeframe_months'] = int(months_match.group(1))
        else:
            # Default to 12 months if not specified
            info['timeframe_months'] = 12
        
        # If no specific type detected but amounts found, assume it's a target amount
        if not info['goal_type'] and amounts:
            info['target_amount'] = float(amounts[0].replace(',', '.'))
            info['goal_type'] = 'savings'
        
        return info
    
    def _analyze_historical_data(self, data: ParsedFinanceData) -> Dict:
        """
        Analysiert historische Daten für statistische Projektionen mit erweiterten Metriken.
        
        Returns:
            Dictionary mit statistischen Metriken inkl. Trends, Saisonality, Volatilität
        """
        # Monatliche Daten extrahieren und sortieren
        monthly_data = {}
        for t in data.transactions:
            month = t.date[:7]  # YYYY-MM
            if month not in monthly_data:
                monthly_data[month] = {'income': 0, 'expenses': 0}
            
            if t.amount > 0:
                monthly_data[month]['income'] += t.amount
            else:
                monthly_data[month]['expenses'] += abs(t.amount)
        
        # Sortierte Listen für Trend-Analyse
        sorted_months = sorted(monthly_data.keys())
        incomes = [monthly_data[m]['income'] for m in sorted_months]
        expenses = [monthly_data[m]['expenses'] for m in sorted_months]
        
        # Basis-Statistiken
        avg_income = np.mean(incomes) if incomes else data.monthly_averages['income']
        avg_expenses = np.mean(expenses) if expenses else data.monthly_averages['expenses']
        std_income = np.std(incomes) if len(incomes) > 1 else avg_income * 0.1
        std_expenses = np.std(expenses) if len(expenses) > 1 else avg_expenses * 0.1
        
        # Trend-Analyse (Lineare Regression)
        income_trend = 0.0
        expense_trend = 0.0
        if len(incomes) >= 3:  # Mindestens 3 Monate für Trend
            x = np.arange(len(incomes))
            # Lineare Regression: y = mx + b
            income_trend = np.polyfit(x, incomes, 1)[0] if len(incomes) > 1 else 0
            expense_trend = np.polyfit(x, expenses, 1)[0] if len(expenses) > 1 else 0
        
        # Saisonality-Analyse (Monatliche Muster)
        seasonal_income = {}
        seasonal_expenses = {}
        if len(sorted_months) >= 6:  # Mindestens 6 Monate für Saisonality
            for month_str in sorted_months:
                month_num = int(month_str.split('-')[1])  # Extrahiere Monat (1-12)
                if month_num not in seasonal_income:
                    seasonal_income[month_num] = []
                    seasonal_expenses[month_num] = []
                seasonal_income[month_num].append(monthly_data[month_str]['income'])
                seasonal_expenses[month_num].append(monthly_data[month_str]['expenses'])
            
            # Durchschnitt pro Monat
            for month_num in range(1, 13):
                if month_num in seasonal_income and len(seasonal_income[month_num]) > 0:
                    seasonal_income[month_num] = np.mean(seasonal_income[month_num])
                else:
                    seasonal_income[month_num] = avg_income
                    
                if month_num in seasonal_expenses and len(seasonal_expenses[month_num]) > 0:
                    seasonal_expenses[month_num] = np.mean(seasonal_expenses[month_num])
                else:
                    seasonal_expenses[month_num] = avg_expenses
        else:
            # Keine Saisonality, verwende Durchschnitt
            for month_num in range(1, 13):
                seasonal_income[month_num] = avg_income
                seasonal_expenses[month_num] = avg_expenses
        
        # Volatilität (Coefficient of Variation)
        cv_income = (std_income / avg_income) if avg_income > 0 else 0.1
        cv_expenses = (std_expenses / avg_expenses) if avg_expenses > 0 else 0.1
        
        # Momentum (letzte 3 Monate vs. Durchschnitt)
        recent_income_momentum = 1.0
        recent_expense_momentum = 1.0
        if len(incomes) >= 3:
            recent_avg_income = np.mean(incomes[-3:])
            recent_avg_expenses = np.mean(expenses[-3:])
            recent_income_momentum = recent_avg_income / avg_income if avg_income > 0 else 1.0
            recent_expense_momentum = recent_avg_expenses / avg_expenses if avg_expenses > 0 else 1.0
        
        return {
            'avg_income': avg_income,
            'std_income': std_income,
            'avg_expenses': avg_expenses,
            'std_expenses': std_expenses,
            'min_income': min(incomes) if incomes else avg_income,
            'max_income': max(incomes) if incomes else avg_income,
            'min_expenses': min(expenses) if expenses else avg_expenses,
            'max_expenses': max(expenses) if expenses else avg_expenses,
            'current_balance': data.net_balance,
            'categories': data.categories,
            # Erweiterte Metriken
            'income_trend': income_trend,  # Monatliche Änderungsrate
            'expense_trend': expense_trend,  # Monatliche Änderungsrate
            'seasonal_income': seasonal_income,  # Durchschnitt pro Monat (1-12)
            'seasonal_expenses': seasonal_expenses,  # Durchschnitt pro Monat (1-12)
            'cv_income': cv_income,  # Coefficient of Variation (Volatilität)
            'cv_expenses': cv_expenses,  # Coefficient of Variation (Volatilität)
            'recent_income_momentum': recent_income_momentum,  # Verhältnis letzte 3 Monate / Durchschnitt
            'recent_expense_momentum': recent_expense_momentum,  # Verhältnis letzte 3 Monate / Durchschnitt
            'num_months': len(sorted_months)  # Anzahl Monate mit Daten
        }
    
    def _calculate_best_case(self, stats: Dict, goal_info: Dict = None) -> ScenarioResult:
        """Berechnet optimistisches Szenario mit verbesserter Mathematik"""
        if goal_info is None:
            goal_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        # Basis-Werte mit Momentum berücksichtigen
        base_income = stats['avg_income'] * stats.get('recent_income_momentum', 1.0)
        base_expenses = stats['avg_expenses'] * stats.get('recent_expense_momentum', 1.0)
        
        # Optimistische Faktoren: progressive Verbesserung
        income_boost = 1.12  # +12% Start
        expense_reduction = 0.93  # -7% Start
        
        for i in range(months):
            month_date = start_date + relativedelta(months=i)
            month_str = month_date.strftime('%Y-%m')
            month_num = month_date.month  # 1-12 für Saisonality
            
            # Progressive Verbesserung über Zeit (leicht steigend)
            progress_factor = 1.0 + (i * 0.002)  # +0.2% pro Monat
            
            # Saisonality berücksichtigen
            seasonal_income_factor = stats.get('seasonal_income', {}).get(month_num, base_income) / base_income if base_income > 0 else 1.0
            seasonal_expense_factor = stats.get('seasonal_expenses', {}).get(month_num, base_expenses) / base_expenses if base_expenses > 0 else 1.0
            
            # Trend berücksichtigen (progressive Steigerung)
            trend_income = stats.get('income_trend', 0) * (i + 1)  # Kumulativer Trend
            trend_expense = stats.get('expense_trend', 0) * (i + 1)  # Kumulativer Trend
            
            # Optimistische Projektion mit allen Faktoren
            projected_income = (
                base_income * income_boost * progress_factor * seasonal_income_factor
                + max(0, trend_income) * 1.2  # Trend verstärkt für Best Case
            )
            
            projected_expenses = (
                base_expenses * expense_reduction * progress_factor * seasonal_expense_factor
                + max(0, trend_expense) * 0.8  # Trend reduziert für Best Case
                + additional_monthly_expense
            )
            
            # Sicherstellen, dass Werte positiv sind
            projected_income = max(0, projected_income)
            projected_expenses = max(0, projected_expenses)
            
            projected_balance = projected_income - projected_expenses
            cumulative_balance += projected_balance
            
            projections.append(ScenarioProjection(
                month=month_str,
                projected_income=round(projected_income, 2),
                projected_expenses=round(projected_expenses, 2),
                projected_balance=round(projected_balance, 2),
                cumulative_balance=round(cumulative_balance, 2)
            ))
        
        # Durchschnittliche monatliche Ersparnisse
        monthly_savings = np.mean([p.projected_balance for p in projections]) if projections else 0
        
        # Customize description based on goal
        if goal_info.get('monthly_payment'):
            description = f'Optimistisches Szenario: Kann zusätzliche monatliche Ausgabe von {goal_info["monthly_payment"]:.2f}€ tragen'
        elif goal_info.get('target_amount'):
            description = f'Optimistisches Szenario: Ziel von {goal_info["target_amount"]:.2f}€ ist erreichbar'
        else:
            description = 'Optimistisches Szenario mit steigenden Einnahmen und kontrollierten Ausgaben'
        
        return ScenarioResult(
            scenario_type='best_case',
            title='Best Case Szenario',
            description=description,
            projections=projections,
            final_balance=round(cumulative_balance, 2),
            monthly_savings=round(monthly_savings, 2),
            risk_factors=[],
            opportunities=[
                'Potenzial für zusätzliche Einnahmen durch Gehaltserhöhung oder Nebentätigkeit',
                'Möglichkeit zur Ausgabenoptimierung durch bewussteres Konsumverhalten',
                'Aufbau eines Notgroschens möglich'
            ]
        )
    
    def _calculate_worst_case(self, stats: Dict, goal_info: Dict = None) -> ScenarioResult:
        """Berechnet pessimistisches Szenario mit verbesserter Mathematik"""
        if goal_info is None:
            goal_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        # Basis-Werte (konservativ, ohne Momentum-Boost)
        base_income = stats['avg_income'] * 0.95  # Leicht reduziert
        base_expenses = stats['avg_expenses'] * 1.05  # Leicht erhöht
        
        # Pessimistische Faktoren
        income_reduction = 0.88  # -12% Start
        expense_increase = 1.18  # +18% Start
        
        for i in range(months):
            month_date = start_date + relativedelta(months=i)
            month_str = month_date.strftime('%Y-%m')
            month_num = month_date.month  # 1-12 für Saisonality
            
            # Progressive Verschlechterung über Zeit (leicht steigend)
            decline_factor = 1.0 - (i * 0.001)  # -0.1% pro Monat
            
            # Saisonality berücksichtigen (konservativ)
            seasonal_income_factor = stats.get('seasonal_income', {}).get(month_num, base_income) / base_income if base_income > 0 else 1.0
            seasonal_expense_factor = stats.get('seasonal_expenses', {}).get(month_num, base_expenses) / base_expenses if base_expenses > 0 else 1.0
            
            # Trend berücksichtigen (progressive Verschlechterung)
            trend_income = stats.get('income_trend', 0) * (i + 1)
            trend_expense = stats.get('expense_trend', 0) * (i + 1)
            
            # Volatilität berücksichtigen (höhere Unsicherheit)
            volatility_factor = 1.0 + (stats.get('cv_income', 0.1) * 0.5)  # 50% der Volatilität als Risiko
            
            # Pessimistische Projektion
            projected_income = (
                base_income * income_reduction * decline_factor * seasonal_income_factor * volatility_factor
                + min(0, trend_income) * 1.3  # Negativer Trend verstärkt
            )
            
            projected_expenses = (
                base_expenses * expense_increase * decline_factor * seasonal_expense_factor * volatility_factor
                + max(0, trend_expense) * 1.2  # Positiver Trend verstärkt
                + additional_monthly_expense
            )
            
            # Sicherstellen, dass Werte positiv sind
            projected_income = max(0, projected_income)
            projected_expenses = max(0, projected_expenses)
            
            projected_balance = projected_income - projected_expenses
            cumulative_balance += projected_balance
            
            projections.append(ScenarioProjection(
                month=month_str,
                projected_income=round(projected_income, 2),
                projected_expenses=round(projected_expenses, 2),
                projected_balance=round(projected_balance, 2),
                cumulative_balance=round(cumulative_balance, 2)
            ))
        
        # Durchschnittliche monatliche Ersparnisse
        monthly_savings = np.mean([p.projected_balance for p in projections]) if projections else 0
        
        # Customize description based on goal
        if goal_info.get('monthly_payment'):
            description = f'Konservatives Szenario: Zusätzliche monatliche Ausgabe von {goal_info["monthly_payment"]:.2f}€ könnte problematisch sein'
        elif goal_info.get('target_amount'):
            description = f'Konservatives Szenario: Ziel von {goal_info["target_amount"]:.2f}€ könnte schwer erreichbar sein'
        else:
            description = 'Konservatives Szenario mit möglichen Einkommensverlusten und steigenden Ausgaben'
        
        return ScenarioResult(
            scenario_type='worst_case',
            title='Worst Case Szenario',
            description=description,
            projections=projections,
            final_balance=round(cumulative_balance, 2),
            monthly_savings=round(monthly_savings, 2),
            risk_factors=[
                'Mögliche Einkommensreduktion durch Jobwechsel oder unerwartete Ausgaben',
                'Steigende Lebenshaltungskosten',
                'Notwendigkeit für Notfallreserve'
            ],
            opportunities=[
                'Frühzeitige Ausgabenplanung und Budgetierung',
                'Identifikation von Einsparpotenzialen',
                'Aufbau eines Sicherheitspuffers'
            ]
        )
    
    def _calculate_realistic_case(self, stats: Dict, goal_info: Dict = None) -> ScenarioResult:
        """Berechnet realistisches Szenario mit verbesserter Mathematik: Trends, Saisonality, Volatilität"""
        if goal_info is None:
            goal_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        # Basis-Werte mit Momentum berücksichtigen
        base_income = stats['avg_income'] * stats.get('recent_income_momentum', 1.0)
        base_expenses = stats['avg_expenses'] * stats.get('recent_expense_momentum', 1.0)
        
        # Seed für reproduzierbare, aber realistische Variationen
        np.random.seed(42)
        
        for i in range(months):
            month_date = start_date + relativedelta(months=i)
            month_str = month_date.strftime('%Y-%m')
            month_num = month_date.month  # 1-12 für Saisonality
            
            # Saisonality berücksichtigen
            seasonal_income = stats.get('seasonal_income', {}).get(month_num, base_income)
            seasonal_expenses = stats.get('seasonal_expenses', {}).get(month_num, base_expenses)
            
            # Trend berücksichtigen (kumulativ)
            trend_income = stats.get('income_trend', 0) * (i + 1)
            trend_expense = stats.get('expense_trend', 0) * (i + 1)
            
            # Realistische Variation basierend auf historischer Volatilität
            # Verwendet Coefficient of Variation für proportionales Rauschen
            cv_income = stats.get('cv_income', 0.1)
            cv_expenses = stats.get('cv_expenses', 0.1)
            
            # Normalverteilte Variation (68% innerhalb 1 StdDev)
            income_noise = np.random.normal(0, base_income * cv_income * 0.5)
            expense_noise = np.random.normal(0, base_expenses * cv_expenses * 0.5)
            
            # Realistische Projektion: Basis + Saisonality + Trend + Rauschen
            projected_income = (
                seasonal_income  # Saisonality bereits berücksichtigt
                + trend_income  # Trend hinzufügen
                + income_noise  # Realistische Variation
            )
            
            projected_expenses = (
                seasonal_expenses  # Saisonality bereits berücksichtigt
                + trend_expense  # Trend hinzufügen
                + expense_noise  # Realistische Variation
                + additional_monthly_expense  # Zusätzliche Ausgaben aus Ziel
            )
            
            # Sicherstellen, dass Werte positiv und realistisch sind
            projected_income = max(0, projected_income)
            projected_expenses = max(0, projected_expenses)
            
            # Begrenze extreme Ausreißer (max 3 StdDev)
            max_income = base_income * (1 + 3 * cv_income)
            min_income = base_income * (1 - 3 * cv_income)
            projected_income = np.clip(projected_income, min_income, max_income)
            
            max_expenses = base_expenses * (1 + 3 * cv_expenses)
            min_expenses = base_expenses * (1 - 3 * cv_expenses)
            projected_expenses = np.clip(projected_expenses, min_expenses, max_expenses)
            
            projected_balance = projected_income - projected_expenses
            cumulative_balance += projected_balance
            
            projections.append(ScenarioProjection(
                month=month_str,
                projected_income=round(projected_income, 2),
                projected_expenses=round(projected_expenses, 2),
                projected_balance=round(projected_balance, 2),
                cumulative_balance=round(cumulative_balance, 2)
            ))
        
        # Durchschnittliche monatliche Ersparnisse
        monthly_savings = np.mean([p.projected_balance for p in projections]) if projections else 0
        
        # Customize description based on goal
        if goal_info.get('monthly_payment'):
            description = f'Realistisches Szenario: Monatliche Rate von {goal_info["monthly_payment"]:.2f}€ basierend auf historischen Daten'
        elif goal_info.get('target_amount'):
            description = f'Realistisches Szenario: Sparziel von {goal_info["target_amount"]:.2f}€ basierend auf historischen Daten'
        else:
            description = 'Basierend auf deinen historischen Daten mit natürlichen Schwankungen'
        
        return ScenarioResult(
            scenario_type='realistic_case',
            title='Realistisches Szenario',
            description=description,
            projections=projections,
            final_balance=round(cumulative_balance, 2),
            monthly_savings=round(monthly_savings, 2),
            risk_factors=[
                'Natürliche Schwankungen in Einnahmen und Ausgaben',
                'Unvorhergesehene Ausgaben möglich'
            ],
            opportunities=[
                'Konsistente Budgetplanung basierend auf Durchschnittswerten',
                'Regelmäßige Überprüfung der Finanzen',
                'Schrittweiser Aufbau von Ersparnissen'
            ]
        )


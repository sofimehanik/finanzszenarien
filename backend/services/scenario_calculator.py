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
        Analysiert historische Daten für statistische Projektionen.
        
        Returns:
            Dictionary mit statistischen Metriken
        """
        # Monatliche Daten extrahieren
        monthly_data = {}
        for t in data.transactions:
            month = t.date[:7]  # YYYY-MM
            if month not in monthly_data:
                monthly_data[month] = {'income': 0, 'expenses': 0}
            
            if t.amount > 0:
                monthly_data[month]['income'] += t.amount
            else:
                monthly_data[month]['expenses'] += abs(t.amount)
        
        # Statistiken berechnen
        incomes = [v['income'] for v in monthly_data.values()]
        expenses = [v['expenses'] for v in monthly_data.values()]
        
        return {
            'avg_income': np.mean(incomes) if incomes else data.monthly_averages['income'],
            'std_income': np.std(incomes) if len(incomes) > 1 else np.mean(incomes) * 0.1,
            'avg_expenses': np.mean(expenses) if expenses else data.monthly_averages['expenses'],
            'std_expenses': np.std(expenses) if len(expenses) > 1 else np.mean(expenses) * 0.1,
            'min_income': min(incomes) if incomes else data.monthly_averages['income'],
            'max_income': max(incomes) if incomes else data.monthly_averages['income'],
            'min_expenses': min(expenses) if expenses else data.monthly_averages['expenses'],
            'max_expenses': max(expenses) if expenses else data.monthly_averages['expenses'],
            'current_balance': data.net_balance,
            'categories': data.categories
        }
    
    def _calculate_best_case(self, stats: Dict, goal_info: Dict = None) -> ScenarioResult:
        """Berechnet optimistisches Szenario, angepasst an Benutzerziel"""
        if goal_info is None:
            goal_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified (handle None values)
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        for i in range(months):
            month_date = start_date + relativedelta(months=i)
            month_str = month_date.strftime('%Y-%m')
            
            # Optimistische Annahmen: +10% Einnahmen, -5% Ausgaben
            projected_income = stats['avg_income'] * 1.10
            projected_expenses = stats['avg_expenses'] * 0.95 + additional_monthly_expense
            projected_balance = projected_income - projected_expenses
            cumulative_balance += projected_balance
            
            projections.append(ScenarioProjection(
                month=month_str,
                projected_income=round(projected_income, 2),
                projected_expenses=round(projected_expenses, 2),
                projected_balance=round(projected_balance, 2),
                cumulative_balance=round(cumulative_balance, 2)
            ))
        
        monthly_savings = projected_income - projected_expenses
        
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
        """Berechnet pessimistisches Szenario, angepasst an Benutzerziel"""
        if goal_info is None:
            goal_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified (handle None values)
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        for i in range(months):
            month_date = start_date + relativedelta(months=i)
            month_str = month_date.strftime('%Y-%m')
            
            # Pessimistische Annahmen: -10% Einnahmen, +15% Ausgaben
            projected_income = stats['avg_income'] * 0.90
            projected_expenses = stats['avg_expenses'] * 1.15 + additional_monthly_expense
            projected_balance = projected_income - projected_expenses
            cumulative_balance += projected_balance
            
            projections.append(ScenarioProjection(
                month=month_str,
                projected_income=round(projected_income, 2),
                projected_expenses=round(projected_expenses, 2),
                projected_balance=round(projected_balance, 2),
                cumulative_balance=round(cumulative_balance, 2)
            ))
        
        monthly_savings = projected_income - projected_expenses
        
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
        """Berechnet realistisches Szenario basierend auf Trends, angepasst an Benutzerziel"""
        if goal_info is None:
            goal_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified (handle None values)
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        # Seed für reproduzierbare Ergebnisse (kann später entfernt werden)
        np.random.seed(42)
        
        for i in range(months):
            month_date = start_date + relativedelta(months=i)
            month_str = month_date.strftime('%Y-%m')
            
            # Realistische Annahmen: leichte Variation um Durchschnitt
            # Zufällige Variation innerhalb einer Standardabweichung
            income_variation = np.random.normal(0, stats['std_income'] * 0.3)
            expense_variation = np.random.normal(0, stats['std_expenses'] * 0.3)
            
            projected_income = max(0, stats['avg_income'] + income_variation)
            projected_expenses = max(0, stats['avg_expenses'] + expense_variation + additional_monthly_expense)
            projected_balance = projected_income - projected_expenses
            cumulative_balance += projected_balance
            
            projections.append(ScenarioProjection(
                month=month_str,
                projected_income=round(projected_income, 2),
                projected_expenses=round(projected_expenses, 2),
                projected_balance=round(projected_balance, 2),
                cumulative_balance=round(cumulative_balance, 2)
            ))
        
        monthly_savings = stats['avg_income'] - stats['avg_expenses'] - additional_monthly_expense
        
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


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
    
    def calculate_all_scenarios(self, data: ParsedFinanceData, user_goal: Optional[str] = None, quiz_profile: Optional[Dict] = None) -> Dict[str, ScenarioResult]:
        """
        Berechnet alle drei Szenarien basierend auf historischen Daten, Benutzerzielen und Quiz-Profil.
        
        Args:
            data: ParsedFinanceData aus CSV-Parser
            user_goal: Optional user goal/query to incorporate into calculations
            quiz_profile: Optional quiz profile with user financial data (income, expenses, etc.)
            
        Returns:
            Dictionary mit allen Szenarien
        """
        # Historische Daten analysieren
        historical_stats = self._analyze_historical_data(data)
        
        # Parse user goal to extract financial information
        goal_info = self._parse_user_goal(user_goal) if user_goal else {}
        
        # Parse quiz profile to extract real financial data
        quiz_info = self._parse_quiz_profile(quiz_profile) if quiz_profile else {}
        
        # Merge quiz data with historical stats for more accurate calculations
        if quiz_info:
            historical_stats = self._merge_quiz_data_with_stats(historical_stats, quiz_info)
        
        scenarios = {
            'best_case': self._calculate_best_case(historical_stats, goal_info, quiz_info),
            'worst_case': self._calculate_worst_case(historical_stats, goal_info, quiz_info),
            'realistic_case': self._calculate_realistic_case(historical_stats, goal_info, quiz_info)
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
    
    def _parse_quiz_profile(self, quiz_profile: Dict) -> Dict:
        """
        Parst Quiz-Profil und extrahiert finanzielle Informationen.
        
        Returns:
            Dictionary mit extrahierten Informationen aus Quiz
        """
        info = {
            'monthly_income': None,
            'monthly_expenses': None,
            'savings_goal': None,
            'emergency_fund': None,
            'has_debt': False,
            'debt_amount': None,
        }
        
        def parse_amount(value):
            """Helper to parse amount from various formats"""
            if not value:
                return None
            # Remove currency symbols, spaces, and handle European format
            cleaned = re.sub(r'[€\s]', '', str(value))
            # Handle European format (1.234,56) or US format (1,234.56)
            if ',' in cleaned and '.' in cleaned:
                # European format: replace . with nothing, , with .
                if cleaned.rindex(',') > cleaned.rindex('.'):
                    cleaned = cleaned.replace('.', '').replace(',', '.')
                else:
                    cleaned = cleaned.replace(',', '')
            elif ',' in cleaned:
                # Could be European thousands separator or decimal
                if len(cleaned.split(',')[-1]) <= 2:  # Decimal part
                    cleaned = cleaned.replace('.', '').replace(',', '.')
                else:
                    cleaned = cleaned.replace(',', '')
            try:
                return float(cleaned)
            except (ValueError, AttributeError):
                return None
        
        # Parse monthly income - try multiple field names
        income = (quiz_profile.get('monthlyIncome') or 
                 quiz_profile.get('monthly_income') or 
                 quiz_profile.get('net_income') or
                 quiz_profile.get('netIncome'))
        if income:
            parsed = parse_amount(income)
            if parsed and parsed > 0:
                info['monthly_income'] = parsed
        
        # Parse monthly expenses - try multiple field names
        expenses = (quiz_profile.get('monthlyExpenses') or 
                   quiz_profile.get('monthly_expenses') or
                   quiz_profile.get('fixed_costs') or
                   quiz_profile.get('fixedCosts'))
        if expenses:
            parsed = parse_amount(expenses)
            if parsed and parsed > 0:
                info['monthly_expenses'] = parsed
        
        # If we have income but no expenses, calculate from savings rate
        if info['monthly_income'] and not info['monthly_expenses']:
            savings_rate_str = quiz_profile.get('savings_rate') or quiz_profile.get('savingsRate')
            if savings_rate_str:
                try:
                    savings_rate = float(re.sub(r'[%,\s]', '', str(savings_rate_str)))
                    savings_amount = info['monthly_income'] * (savings_rate / 100)
                    info['monthly_expenses'] = max(0, info['monthly_income'] - savings_amount)
                except (ValueError, AttributeError):
                    # Default: 70% of income as expenses
                    info['monthly_expenses'] = info['monthly_income'] * 0.7
        
        # Parse savings goal
        savings = quiz_profile.get('savingsGoal') or quiz_profile.get('savings_goal')
        if savings:
            parsed = parse_amount(savings)
            if parsed and parsed > 0:
                info['savings_goal'] = parsed
        
        # Parse emergency fund
        emergency = quiz_profile.get('emergencyFund') or quiz_profile.get('emergency_fund')
        if emergency:
            parsed = parse_amount(emergency)
            if parsed and parsed > 0:
                info['emergency_fund'] = parsed
        
        # Check for debt
        has_debt = quiz_profile.get('hasDebt', False) or quiz_profile.get('has_debt', False)
        info['has_debt'] = bool(has_debt)
        
        debt = quiz_profile.get('debtAmount') or quiz_profile.get('debt_amount')
        if debt:
            parsed = parse_amount(debt)
            if parsed and parsed > 0:
                info['debt_amount'] = parsed
        
        return info
    
    def _merge_quiz_data_with_stats(self, stats: Dict, quiz_info: Dict) -> Dict:
        """
        Merges quiz profile data with historical statistics for more accurate projections.
        Prioritizes quiz data when available, but uses historical patterns for variation.
        """
        merged_stats = stats.copy()
        
        # If quiz provides income data
        if quiz_info.get('monthly_income'):
            quiz_income = quiz_info['monthly_income']
            hist_income = stats.get('avg_income', 0)
            
            # If we have historical data, use weighted average (70% quiz, 30% historical)
            # This respects user input but accounts for actual patterns
            if hist_income > 0:
                merged_stats['avg_income'] = quiz_income * 0.7 + hist_income * 0.3
            else:
                # No historical data, use quiz data directly
                merged_stats['avg_income'] = quiz_income
            
            # Adjust std based on quiz data (10-15% variation)
            merged_stats['std_income'] = max(merged_stats.get('std_income', 0), quiz_income * 0.12)
        
        # If quiz provides expenses data
        if quiz_info.get('monthly_expenses'):
            quiz_expenses = quiz_info['monthly_expenses']
            hist_expenses = stats.get('avg_expenses', 0)
            
            # If we have historical data, use weighted average (70% quiz, 30% historical)
            if hist_expenses > 0:
                merged_stats['avg_expenses'] = quiz_expenses * 0.7 + hist_expenses * 0.3
            else:
                # No historical data, use quiz data directly
                merged_stats['avg_expenses'] = quiz_expenses
            
            # Adjust std based on quiz data
            merged_stats['std_expenses'] = max(merged_stats.get('std_expenses', 0), quiz_expenses * 0.12)
        
        # If quiz data exists but historical is missing/zero, use quiz data directly
        if stats.get('avg_income', 0) == 0 and quiz_info.get('monthly_income'):
            merged_stats['avg_income'] = quiz_info['monthly_income']
            merged_stats['std_income'] = quiz_info['monthly_income'] * 0.15
        
        if stats.get('avg_expenses', 0) == 0 and quiz_info.get('monthly_expenses'):
            merged_stats['avg_expenses'] = quiz_info['monthly_expenses']
            merged_stats['std_expenses'] = quiz_info['monthly_expenses'] * 0.15
        
        # If we have income but no expenses from quiz, calculate from savings rate
        if merged_stats.get('avg_income', 0) > 0 and merged_stats.get('avg_expenses', 0) == 0:
            # Default: 70% of income as expenses (30% savings rate)
            merged_stats['avg_expenses'] = merged_stats['avg_income'] * 0.7
            merged_stats['std_expenses'] = merged_stats['avg_expenses'] * 0.12
        
        # Ensure we have valid, different values
        if merged_stats.get('avg_income', 0) <= 0:
            merged_stats['avg_income'] = 1000  # Fallback minimum
        if merged_stats.get('avg_expenses', 0) <= 0:
            merged_stats['avg_expenses'] = merged_stats['avg_income'] * 0.7  # 70% of income as default
        
        # Ensure expenses are always less than income (realistic constraint)
        # Expenses should be 60-90% of income for realistic scenarios
        if merged_stats['avg_expenses'] >= merged_stats['avg_income'] * 0.95:
            # Cap expenses at 90% of income to allow some savings
            merged_stats['avg_expenses'] = merged_stats['avg_income'] * 0.85
        
        # Ensure minimum difference between income and expenses (at least 10% savings potential)
        min_savings = merged_stats['avg_income'] * 0.1
        if merged_stats['avg_expenses'] > merged_stats['avg_income'] - min_savings:
            merged_stats['avg_expenses'] = merged_stats['avg_income'] - min_savings
        
        return merged_stats
    
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
    
    def _calculate_best_case(self, stats: Dict, goal_info: Dict = None, quiz_info: Dict = None) -> ScenarioResult:
        """Berechnet optimistisches Szenario mit verbesserter Mathematik"""
        if goal_info is None:
            goal_info = {}
        if quiz_info is None:
            quiz_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        # Basis-Werte mit Momentum berücksichtigen - Best Case: optimistic adjustments
        # Ensure we have valid base values
        base_income = max(stats.get('avg_income', 1000), 100)  # Minimum 100€
        base_expenses = max(stats.get('avg_expenses', base_income * 0.7), 50)  # Minimum 50€
        
        # Apply momentum and optimistic adjustments
        base_income = base_income * stats.get('recent_income_momentum', 1.0) * 1.05  # +5% optimistic
        base_expenses = base_expenses * stats.get('recent_expense_momentum', 1.0) * 0.95  # -5% cost optimization
        
        # Ensure expenses are always less than income
        if base_expenses >= base_income * 0.9:
            base_expenses = base_income * 0.75  # Ensure at least 25% savings potential
        
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
            
            # Ensure expenses don't exceed income (realistic constraint)
            if projected_expenses >= projected_income * 0.98:
                projected_expenses = projected_income * 0.80  # Cap at 80% to ensure savings
            
            # Ensure minimum difference (at least 15% savings potential for best case)
            min_savings = projected_income * 0.15
            if projected_expenses > projected_income - min_savings:
                projected_expenses = projected_income - min_savings
            
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
    
    def _calculate_worst_case(self, stats: Dict, goal_info: Dict = None, quiz_info: Dict = None) -> ScenarioResult:
        """Berechnet pessimistisches Szenario mit verbesserter Mathematik"""
        if goal_info is None:
            goal_info = {}
        if quiz_info is None:
            quiz_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        # Basis-Werte (konservativ, ohne Momentum-Boost)
        # Ensure we have valid base values
        base_income = max(stats.get('avg_income', 1000), 100)  # Minimum 100€
        base_expenses = max(stats.get('avg_expenses', base_income * 0.7), 50)  # Minimum 50€
        
        # Apply conservative adjustments
        base_income = base_income * 0.95  # Leicht reduziert
        base_expenses = base_expenses * 1.05  # Leicht erhöht
        
        # Ensure expenses don't exceed income too much
        if base_expenses >= base_income * 0.98:
            base_expenses = base_income * 0.92  # Cap at 92% to allow some buffer
        
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
            
            # Ensure expenses don't exceed income too much (worst case can be tight but still realistic)
            if projected_expenses >= projected_income * 0.98:
                projected_expenses = projected_income * 0.92  # Cap at 92% to allow minimal buffer
            
            # Ensure minimum difference (at least 5% buffer for worst case)
            min_buffer = projected_income * 0.05
            if projected_expenses > projected_income - min_buffer:
                projected_expenses = projected_income - min_buffer
            
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
    
    def _calculate_realistic_case(self, stats: Dict, goal_info: Dict = None, quiz_info: Dict = None) -> ScenarioResult:
        """Berechnet realistisches Szenario mit verbesserter Mathematik: Trends, Saisonality, Volatilität"""
        if goal_info is None:
            goal_info = {}
        if quiz_info is None:
            quiz_info = {}
        
        projections = []
        cumulative_balance = stats['current_balance']
        start_date = datetime.now()
        
        # Adjust months_ahead if goal specifies timeframe
        months = goal_info.get('timeframe_months', self.months_ahead)
        months = min(months, 24)  # Cap at 24 months
        
        # Adjust expenses if monthly payment is specified
        additional_monthly_expense = goal_info.get('monthly_payment') or 0
        
        # Basis-Werte mit Momentum berücksichtigen
        # Ensure we have valid base values
        base_income = max(stats.get('avg_income', 1000), 100)  # Minimum 100€
        base_expenses = max(stats.get('avg_expenses', base_income * 0.7), 50)  # Minimum 50€
        
        # Apply momentum
        base_income = base_income * stats.get('recent_income_momentum', 1.0)
        base_expenses = base_expenses * stats.get('recent_expense_momentum', 1.0)
        
        # Ensure expenses are always less than income (realistic)
        if base_expenses >= base_income * 0.95:
            base_expenses = base_income * 0.80  # Ensure at least 20% difference
        
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
            
            # Ensure expenses don't exceed income (realistic constraint)
            if projected_expenses >= projected_income * 0.98:
                projected_expenses = projected_income * 0.85  # Cap at 85% to ensure savings
            
            # Ensure minimum difference (at least 10% savings potential)
            min_savings = projected_income * 0.1
            if projected_expenses > projected_income - min_savings:
                projected_expenses = projected_income - min_savings
            
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


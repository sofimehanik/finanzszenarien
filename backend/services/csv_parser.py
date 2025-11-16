"""
CSV Parser Service
Liest und analysiert Finanzdaten aus CSV-Dateien mit robustem Error-Handling.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, ValidationError


class Transaction(BaseModel):
    """Validierte Transaktions-Datenstruktur"""
    date: str
    amount: float
    category: str
    description: str


class ParsedFinanceData(BaseModel):
    """Strukturierte Finanzdaten nach dem Parsing"""
    transactions: List[Transaction]
    total_income: float
    total_expenses: float
    net_balance: float
    categories: Dict[str, float]
    date_range: Dict[str, str]
    monthly_averages: Dict[str, float]


class CSVParser:
    """
    Parser für Finanz-CSV-Dateien mit Fehlerbehandlung.
    
    Designentscheidungen:
    - Verwendung von Pandas für robustes CSV-Parsing
    - Pydantic-Models für Datenvalidierung
    - Explizite Fehlerbehandlung für fehlerhafte Zeilen
    - Automatische Typkonvertierung und Bereinigung
    """
    
    REQUIRED_COLUMNS = ['date', 'amount', 'category', 'description']
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def parse(self, file_path: str) -> ParsedFinanceData:
        """
        Parst eine CSV-Datei und gibt strukturierte Finanzdaten zurück.
        
        Args:
            file_path: Pfad zur CSV-Datei
            
        Returns:
            ParsedFinanceData mit validierten Transaktionen und Metriken
            
        Raises:
            FileNotFoundError: Wenn Datei nicht existiert
            ValueError: Wenn CSV-Struktur ungültig ist
        """
        self.errors = []
        self.warnings = []
        
        try:
            # CSV einlesen mit Fehlerbehandlung
            df = pd.read_csv(file_path, encoding='utf-8')
        except FileNotFoundError:
            raise FileNotFoundError(f"Datei nicht gefunden: {file_path}")
        except Exception as e:
            raise ValueError(f"Fehler beim Lesen der CSV: {str(e)}")
        
        # Spalten-Validierung
        missing_columns = set(self.REQUIRED_COLUMNS) - set(df.columns)
        if missing_columns:
            raise ValueError(f"Fehlende Spalten: {', '.join(missing_columns)}")
        
        # Datenbereinigung und Validierung
        transactions = []
        for idx, row in df.iterrows():
            try:
                # Datum validieren und normalisieren
                date_str = self._normalize_date(row['date'])
                
                # Betrag konvertieren (muss numerisch sein)
                amount = self._parse_amount(row['amount'])
                
                # Kategorie und Beschreibung bereinigen
                category = str(row['category']).strip().lower()
                description = str(row['description']).strip()
                
                # Pydantic-Validierung
                transaction = Transaction(
                    date=date_str,
                    amount=amount,
                    category=category,
                    description=description
                )
                transactions.append(transaction)
                
            except (ValueError, ValidationError) as e:
                self.errors.append(f"Zeile {idx + 2}: {str(e)}")
                continue
        
        if not transactions:
            raise ValueError("Keine gültigen Transaktionen gefunden")
        
        # Metriken berechnen
        return self._calculate_metrics(transactions)
    
    def _normalize_date(self, date_value: any) -> str:
        """Normalisiert Datumswerte zu ISO-Format (YYYY-MM-DD)"""
        if pd.isna(date_value):
            raise ValueError("Datum fehlt")
        
        # Versuche verschiedene Datumsformate
        date_str = str(date_value).strip()
        
        try:
            # Direktes Parsing wenn bereits ISO-Format
            datetime.strptime(date_str, '%Y-%m-%d')
            return date_str
        except ValueError:
            pass
        
        try:
            # Pandas Parsing für verschiedene Formate
            parsed = pd.to_datetime(date_str)
            return parsed.strftime('%Y-%m-%d')
        except Exception:
            raise ValueError(f"Ungültiges Datumsformat: {date_value}")
    
    def _parse_amount(self, amount_value: any) -> float:
        """Konvertiert Betrag zu Float mit Fehlerbehandlung"""
        if pd.isna(amount_value):
            raise ValueError("Betrag fehlt")
        
        try:
            # Entferne mögliche Währungssymbole und Leerzeichen
            amount_str = str(amount_value).strip().replace(',', '.')
            amount_str = ''.join(c for c in amount_str if c.isdigit() or c in '.-')
            return float(amount_str)
        except (ValueError, TypeError):
            raise ValueError(f"Ungültiger Betrag: {amount_value}")
    
    def _calculate_metrics(self, transactions: List[Transaction]) -> ParsedFinanceData:
        """Berechnet Metriken aus validierten Transaktionen"""
        amounts = [t.amount for t in transactions]
        dates = [t.date for t in transactions]
        
        # Einnahmen und Ausgaben trennen
        income = sum(a for a in amounts if a > 0)
        expenses = abs(sum(a for a in amounts if a < 0))
        net_balance = sum(amounts)
        
        # Kategorien aggregieren
        categories = {}
        for t in transactions:
            if t.amount < 0:  # Nur Ausgaben kategorisieren
                categories[t.category] = categories.get(t.category, 0) + abs(t.amount)
        
        # Datumsbereich
        sorted_dates = sorted(dates)
        date_range = {
            'start': sorted_dates[0],
            'end': sorted_dates[-1]
        }
        
        # Monatliche Durchschnitte
        df_temp = pd.DataFrame([{
            'date': t.date,
            'amount': t.amount
        } for t in transactions])
        df_temp['date'] = pd.to_datetime(df_temp['date'])
        df_temp['month'] = df_temp['date'].dt.to_period('M')
        
        monthly_income = df_temp[df_temp['amount'] > 0].groupby('month')['amount'].sum().mean()
        monthly_expenses = abs(df_temp[df_temp['amount'] < 0].groupby('month')['amount'].sum().mean())
        
        monthly_averages = {
            'income': float(monthly_income) if not pd.isna(monthly_income) else 0.0,
            'expenses': float(monthly_expenses) if not pd.isna(monthly_expenses) else 0.0
        }
        
        return ParsedFinanceData(
            transactions=transactions,
            total_income=income,
            total_expenses=expenses,
            net_balance=net_balance,
            categories=categories,
            date_range=date_range,
            monthly_averages=monthly_averages
        )


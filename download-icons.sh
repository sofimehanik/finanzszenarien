#!/bin/bash

# Script to download all Lucide icons used in the project as SVG files

# Create icons directory
mkdir -p icons

# List of all icons used in the project (from grep results)
ICONS=(
  "AlertCircle" "Lightbulb" "Globe" "User" "Brain" "Sparkles" "LogOut" "Menu"
  "ChevronDown" "ChevronUp" "X" "Loader2" "TrendingUp" "TrendingDown" "FileText"
  "CheckCircle" "ArrowUp" "ArrowDown" "Minus" "Edit2" "Check" "BarChart3"
  "Target" "Info" "ArrowRight" "Zap" "Shield" "Upload" "Trophy" "AlertTriangle"
  "Wallet" "PiggyBank" "DollarSign" "Percent" "ZoomIn" "ZoomOut" "RotateCcw"
  "Maximize2" "ChevronRight" "Trash2" "Calendar" "Search" "Award" "Clock"
  "Filter" "CheckCircle2" "ArrowUpRight" "ArrowDownRight" "Eye" "EyeOff"
  "Plus" "ArrowUpCircle" "Euro" "Tag" "FileSpreadsheet" "PenTool" "Moon"
  "Sun" "Users" "ShieldCheck"
)

echo "Downloading ${#ICONS[@]} icons from Lucide..."

for icon in "${ICONS[@]}"; do
  # Convert PascalCase to kebab-case (e.g., AlertCircle -> alert-circle)
  icon_kebab=$(echo "$icon" | sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr '[:upper:]' '[:lower:]')
  
  echo "Downloading $icon ($icon_kebab)..."
  
  # Download SVG from lucide.dev CDN
  curl -s "https://lucide.dev/icons/${icon_kebab}.svg" -o "icons/${icon}.svg"
  
  if [ $? -eq 0 ]; then
    echo "✓ $icon downloaded"
  else
    echo "✗ Failed to download $icon"
  fi
done

echo ""
echo "Done! Icons saved in ./icons directory"

#!/usr/bin/env python3
"""
Helper script to create .env file for backend configuration
"""
import os
from pathlib import Path

def create_env_file():
    """Creates .env file with user input"""
    backend_dir = Path(__file__).parent
    env_path = backend_dir / '.env'
    
    if env_path.exists():
        print(f"⚠️  .env file already exists at {env_path}")
        response = input("Do you want to overwrite it? (y/N): ")
        if response.lower() != 'y':
            print("Aborted.")
            return
    
    print("\n🔧 Setting up .env file for Finanzszenarien Backend\n")
    print("You can get your OpenAI API key from: https://platform.openai.com/api-keys")
    print("Or use Google Gemini: https://makersuite.google.com/app/apikey\n")
    
    provider = input("Which LLM provider do you want to use? (openai/gemini) [openai]: ").strip().lower()
    if not provider:
        provider = 'openai'
    
    if provider == 'openai':
        api_key = input("Enter your OPENAI_API_KEY: ").strip()
        if not api_key:
            print("❌ API key is required!")
            return
        
        content = f"""# OpenAI API Configuration
OPENAI_API_KEY={api_key}

# LLM Provider Selection
LLM_PROVIDER=openai
"""
    elif provider == 'gemini':
        api_key = input("Enter your GEMINI_API_KEY: ").strip()
        if not api_key:
            print("❌ API key is required!")
            return
        
        content = f"""# Google Gemini API Configuration
GEMINI_API_KEY={api_key}

# LLM Provider Selection
LLM_PROVIDER=gemini
"""
    else:
        print(f"❌ Unknown provider: {provider}")
        return
    
    try:
        with open(env_path, 'w') as f:
            f.write(content)
        print(f"\n✅ .env file created successfully at {env_path}")
        print("🔒 Make sure this file is in .gitignore (it should be by default)")
        print("\n💡 Restart your backend server for changes to take effect!")
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")

if __name__ == "__main__":
    create_env_file()


"""
Vexadoc — LLM Caller
Provider: Groq (free tier — Llama 3.3 70b)
To switch models, change LLM_MODEL in .env

Usage:
    from generation.llm import generate
    answer = generate(prompt)
"""

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()


def generate(prompt: str) -> str:
    """
    Generate an answer from Groq LLM.

    Args:
        prompt: Fully formatted prompt from prompt.py

    Returns:
        LLM answer as a string
    """
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in environment.")

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", 2048)),
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

    except Exception as e:
        raise RuntimeError("Groq API call failed.") from e
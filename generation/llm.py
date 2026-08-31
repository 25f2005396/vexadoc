"""
Vexadoc — LLM Caller

Uses the configured Large Language Model (LLM) provider.

Configuration:
- LLM_MODEL
- LLM_MAX_TOKENS
- API key (via environment variables)

Usage:
    from generation.llm import generate
    answer = generate(prompt)

    from generation.llm import generate_stream

    for token in generate_stream(prompt):
        # Handle streamed output
        ...
"""

import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

_api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=_api_key) if _api_key else None


def generate(prompt: str) -> str:
    """
    Generate an answer from the configured LLM.

    Args:
        prompt: Fully formatted prompt from prompt.py

    Returns:
        LLM answer as a string
    """
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    if not client:
        raise ValueError(
            "No API key is configured. Please check your environment variables."
        )

    try:
        response = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", 2048)),
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

    except Exception as e:
        raise RuntimeError(
            "Unable to generate a response at the moment. Please try again."
        ) from e


def generate_stream(prompt: str):
    """
    Generate an answer from the configured LLM as a stream of text chunks.
    Yields one character at a time for smooth word-by-word display.

    Args:
        prompt: Fully formatted prompt from prompt.py

    Yields:
        Individual characters of the LLM answer as they arrive.
    """
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    if not client:
        raise ValueError(
            "No API key is configured. Please check your environment variables."
        )

    try:
        stream = client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "llama-3.3-70b-versatile"),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", 2048)),
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}],
            stream=True
        )

        for chunk in stream:
            delta = chunk.choices[0].delta
            token = getattr(delta, "content", None)
            if token:
                # Yield character by character for smooth streaming
                for char in token:
                    yield char

    except Exception as e:
        raise RuntimeError(
            "Unable to generate a response at the moment. Please try again."
        ) from e
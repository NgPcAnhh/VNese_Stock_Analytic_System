from pathlib import Path

CHATBOT_DIR = Path(__file__).resolve().parents[1]
PROMPT_DIR = CHATBOT_DIR / "system_prompt"


def load_prompt(name: str) -> str:
    path = PROMPT_DIR / name
    return path.read_text(encoding="utf-8")
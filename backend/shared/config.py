"""
Centralized environment configuration for backend services.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND_ROOT.parent

# Load root and backend env files (if present) without overriding existing env vars.
load_dotenv(_PROJECT_ROOT / ".env", override=False)
load_dotenv(_BACKEND_ROOT / ".env", override=False)

AVIATIONSTACK_API_KEY = os.getenv("AVIATIONSTACK_API_KEY")


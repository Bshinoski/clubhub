from datetime import datetime
from typing import Optional

def generate_timestamp() -> str:
    """Generate ISO timestamp"""
    return datetime.utcnow().isoformat()

def format_date(date_string: str) -> Optional[str]:
    """Format date string to ISO format"""
    try:
        dt = datetime.fromisoformat(date_string)
        return dt.isoformat()
    except:
        return None

def clean_dict(d: dict) -> dict:
    """Remove None values from dictionary"""
    return {k: v for k, v in d.items() if v is not None}
"""
Faithful port of the coercion helpers from the original single-file app.

These are ported deliberately literally (same regexes, same fallbacks) so that
the server produces byte-identical numbers to what your users see today. Do not
"clean these up" without a test proving the output is unchanged -- the European
vs US thousand-separator handling in particular is load-bearing.

Original JS equivalents are named in each docstring.
"""
from __future__ import annotations

import math
import re
from datetime import UTC, date, datetime, timedelta

# Excel's day 0. Excel wrongly thinks 1900 was a leap year, hence Dec 30 1899.
_EXCEL_EPOCH = datetime(1899, 12, 30, tzinfo=UTC)

_STATUS_CANON = [
    "Initiation", "Starting", "In Progress", "On Hold",
    "Completed", "Cancelled", "Won", "Lost",
]
_STATUS_NORM: dict[str, str] = {s.lower(): s for s in _STATUS_CANON}
_STATUS_NORM["canceled"] = "Cancelled"  # US spelling, as in the original

_RE_EU = re.compile(r"^-?\d{1,3}(\.\d{3})+(,\d*)?$")   # 1.234.567,89
_RE_US = re.compile(r"^-?\d{1,3}(,\d{3})+(\.\d*)?$")   # 1,234,567.89
_RE_DEC_COMMA = re.compile(r"^-?\d+(,\d+)$")           # 1234,56
_RE_STRIP = re.compile(r"[€$£\s%]")
_RE_QUOTES = re.compile(r"['\u2019\u2018`]")


def nk(s: object) -> str:
    """JS: nk() -- normalise a header key."""
    return re.sub(r"\s+", " ", str(s or "").replace("\n", " ")).strip().lower()


def to_num(v: object) -> float:
    """JS: toNum() -- tolerant numeric coercion. Returns 0.0, never None/NaN."""
    if v is None or v == "":
        return 0.0
    if isinstance(v, bool):
        return 0.0
    if isinstance(v, (int, float)):
        return 0.0 if isinstance(v, float) and math.isnan(v) else float(v)

    s = _RE_QUOTES.sub("", _RE_STRIP.sub("", str(v).strip()))
    if not s:
        return 0.0

    try:
        if _RE_EU.match(s):
            return float(s.replace(".", "").replace(",", "."))
        if _RE_US.match(s):
            return float(s.replace(",", ""))
        if _RE_DEC_COMMA.match(s):
            return float(s.replace(",", "."))
        return float(s)
    except ValueError:
        return 0.0


def norm_probability(v: object) -> float:
    """
    JS: (v)=>{const n=toNum(v); return n<=1&&n>0 ? n*100 : n;}

    Excel stores percentages either as 0.75 or as 75 depending on cell format.
    Anything in (0,1] is assumed to be a fraction and scaled to 0-100.
    """
    n = to_num(v)
    return n * 100 if 0 < n <= 1 else n


def norm_status(v: object) -> str:
    """JS: normStatus() -- canonicalise status casing/spelling."""
    s = str(v or "").strip()
    if not s:
        return "Unknown"
    return _STATUS_NORM.get(s.lower(), s)


def coerce_date(v: object) -> date | None:
    """
    JS: fmtDate() + excelDate() combined.

    Handles: real datetimes (openpyxl gives these when the cell is date-formatted),
    Excel serial numbers, and ISO-ish strings. Returns None rather than guessing.
    """
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if v <= 0:
            return None
        return (_EXCEL_EPOCH + timedelta(days=float(v))).date()

    s = str(v).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

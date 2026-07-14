"""
These tests exist to pin the PORTED behaviour.

The risk in this migration is silent numeric drift: a European-formatted value
like "1.234.567,89" quietly becoming 1.234 instead of 1234567.89, and nobody
noticing until a PMO number is wrong in a steering meeting.

Every case below mirrors a branch of the original JS toNum()/normStatus().
"""
from __future__ import annotations

from datetime import date

import pytest

from app.core.coerce import coerce_date, nk, norm_probability, norm_status, to_num


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, 0.0),
        ("", 0.0),
        (1234.5, 1234.5),
        (42, 42.0),
        ("1.234.567,89", 1234567.89),   # European
        ("1,234,567.89", 1234567.89),   # US
        ("1234,56", 1234.56),           # decimal comma
        ("€ 1.500", 1500.0),            # currency symbol + EU grouping
        ("75%", 75.0),
        ("  2 000  ", 2000.0),          # space as separator
        ("not a number", 0.0),          # must not raise
    ],
)
def test_to_num(raw: object, expected: float) -> None:
    assert to_num(raw) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(0.75, 75.0), (75, 75.0), (1, 100.0), (0, 0.0), ("", 0.0), (100, 100.0)],
)
def test_norm_probability(raw: object, expected: float) -> None:
    """Excel stores % as either 0.75 or 75; (0,1] is treated as a fraction."""
    assert norm_probability(raw) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("completed", "Completed"),
        ("CANCELLED", "Cancelled"),
        ("Canceled", "Cancelled"),   # US spelling folded in, as in the original
        ("In Progress", "In Progress"),
        ("", "Unknown"),
        ("Some New Status", "Some New Status"),  # unknown values pass through
    ],
)
def test_norm_status(raw: str, expected: str) -> None:
    assert norm_status(raw) == expected


def test_coerce_date_excel_serial() -> None:
    assert coerce_date(45658) == date(2025, 1, 1)  # Excel serial -> real date


def test_coerce_date_rejects_garbage() -> None:
    assert coerce_date("tomorrow") is None  # returns None, never guesses


def test_nk_normalises_headers() -> None:
    assert nk("  Project\nName  ") == "project name"

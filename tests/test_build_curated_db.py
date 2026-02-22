"""Tests for the curated DB build script."""

import json
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import AssessmentResult

# Import the script's functions
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from build_curated_db import (  # noqa: E402
    _extract_substances,
    _result_to_dict,
    write_output,
)


class TestExtractSubstances:
    def test_extracts_from_active_substance_key(self):
        medicines = [
            {"activeSubstance": "pembrolizumab"},
            {"activeSubstance": "nivolumab"},
        ]
        result = _extract_substances(medicines)
        assert "pembrolizumab" in result
        assert "nivolumab" in result

    def test_extracts_from_alternative_keys(self):
        medicines = [
            {"active_substance": "avelumab"},
            {"inn_common_name": "atezolizumab"},
        ]
        result = _extract_substances(medicines)
        assert "avelumab" in result
        assert "atezolizumab" in result

    def test_deduplicates(self):
        medicines = [
            {"activeSubstance": "pembrolizumab"},
            {"activeSubstance": "pembrolizumab"},
            {"active_substance": "pembrolizumab"},
        ]
        result = _extract_substances(medicines)
        assert result.count("pembrolizumab") == 1

    def test_skips_empty_values(self):
        medicines = [
            {"activeSubstance": ""},
            {"activeSubstance": None},
            {},
        ]
        result = _extract_substances(medicines)
        assert len(result) == 0

    def test_sorted_output(self):
        medicines = [
            {"activeSubstance": "zoledronic acid"},
            {"activeSubstance": "avelumab"},
            {"activeSubstance": "pembrolizumab"},
        ]
        result = _extract_substances(medicines)
        assert result == sorted(result)


class TestResultToDict:
    def test_drops_empty_fields(self):
        r = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Test indication",
            opinion_date="2022-03-23",
            nice_recommendation="Recommended",
            guidance_reference="TA788",
            # All other fields default to ""
        )
        d = _result_to_dict(r)
        assert "product_name" in d
        assert "nice_recommendation" in d
        assert "smr_value" not in d  # empty, should be dropped
        assert "benefit_rating" not in d
        assert "comparator" not in d

    def test_preserves_all_populated_fields(self):
        r = AssessmentResult(
            product_name="Bavencio",
            evaluation_reason="Test",
            opinion_date="2022-03-23",
            assessment_url="https://example.com",
            benefit_rating="gering",
            evidence_level="Hinweis",
            comparator="Metformin",
            patient_group="Adults",
        )
        d = _result_to_dict(r)
        assert d["benefit_rating"] == "gering"
        assert d["evidence_level"] == "Hinweis"
        assert d["comparator"] == "Metformin"
        assert d["patient_group"] == "Adults"


class TestWriteOutput:
    def test_writes_valid_json(self):
        curated = {
            "avelumab": {
                "GB": [{"product_name": "Bavencio", "evaluation_reason": "test", "opinion_date": "2022-01-01"}],
            },
        }
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            output_path = Path(f.name)

        write_output(curated, output_path)

        with open(output_path, encoding="utf-8") as fh:
            data = json.load(fh)

        assert "_meta" in data
        assert "avelumab" in data
        assert data["avelumab"]["GB"][0]["product_name"] == "Bavencio"
        output_path.unlink()

    def test_includes_meta(self):
        curated = {"test": {"GB": []}}
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            output_path = Path(f.name)

        write_output(curated, output_path)

        with open(output_path, encoding="utf-8") as fh:
            data = json.load(fh)

        assert "_meta" in data
        assert "last_updated" in data["_meta"]
        assert "description" in data["_meta"]
        output_path.unlink()

    def test_sorts_substances_alphabetically(self):
        curated = {
            "zoledronic acid": {"GB": []},
            "avelumab": {"GB": []},
            "pembrolizumab": {"GB": []},
        }
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            output_path = Path(f.name)

        write_output(curated, output_path)

        with open(output_path, encoding="utf-8") as fh:
            data = json.load(fh)

        keys = [k for k in data.keys() if not k.startswith("_")]
        assert keys == sorted(keys)
        output_path.unlink()

    def test_creates_parent_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            output_path = Path(tmp) / "subdir" / "curated.json"
            write_output({"test": {}}, output_path)
            assert output_path.exists()

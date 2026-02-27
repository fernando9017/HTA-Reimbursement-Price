#!/usr/bin/env python3
"""Verify that seed data files can be loaded by each adapter."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

DATA_DIR = PROJECT_ROOT / "data"


def verify_france():
    from app.services.hta_agencies.france_has import FranceHAS
    adapter = FranceHAS()
    ok = adapter.load_from_file(DATA_DIR / "FR.json")
    assert ok, "FR.json failed to load"
    assert adapter.is_loaded, "FranceHAS not marked as loaded"
    print(f"  FR: OK — {len(adapter._medicines)} medicines, "
          f"{sum(len(v) for v in adapter._smr.values())} SMR, "
          f"{sum(len(v) for v in adapter._asmr.values())} ASMR")
    return adapter


def verify_uk():
    from app.services.hta_agencies.uk_nice import UKNICE
    adapter = UKNICE()
    ok = adapter.load_from_file(DATA_DIR / "GB.json")
    assert ok, "GB.json failed to load"
    assert adapter.is_loaded, "UKNICE not marked as loaded"
    print(f"  GB: OK — {len(adapter._guidance_list)} guidance entries")
    return adapter


def verify_spain():
    from app.services.hta_agencies.spain_aemps import SpainAEMPS
    adapter = SpainAEMPS()
    ok = adapter.load_from_file(DATA_DIR / "ES.json")
    assert ok, "ES.json failed to load"
    assert adapter.is_loaded, "SpainAEMPS not marked as loaded"
    print(f"  ES: OK — {len(adapter._ipt_list)} IPT entries")
    return adapter


def verify_japan():
    from app.services.hta_agencies.japan_pmda import JapanPMDA
    adapter = JapanPMDA()
    ok = adapter.load_from_file(DATA_DIR / "JP.json")
    assert ok, "JP.json failed to load"
    assert adapter.is_loaded, "JapanPMDA not marked as loaded"
    reimbursed = sum(1 for d in adapter._drug_list if d.get("japic_code"))
    print(f"  JP: OK — {len(adapter._drug_list)} drugs ({reimbursed} with NHI pricing)")
    return adapter


def verify_deep_dive_services(fr_adapter, gb_adapter, es_adapter):
    """Verify deep-dive services can work with the loaded data."""
    from app.services.france_hta import FranceHTAService
    from app.services.uk_nice_hta import UKNICEHTAService
    from app.services.spain_aemps_hta import SpainAEMPSHTAService

    # France deep-dive
    fr_svc = FranceHTAService(fr_adapter)
    result = fr_svc.search_drugs(query="pembrolizumab")
    assert result.total > 0, "France deep-dive: no results for pembrolizumab"
    profile = fr_svc.get_drug_profile("Pembrolizumab")
    assert profile is not None, "France deep-dive: no profile for Pembrolizumab"
    print(f"  France deep-dive: pembrolizumab has {profile.total_assessments} assessments")

    # UK deep-dive
    gb_svc = UKNICEHTAService(gb_adapter)
    result = gb_svc.search_drugs(query="pembrolizumab")
    assert result.total > 0, "UK deep-dive: no results for pembrolizumab"
    print(f"  UK deep-dive: pembrolizumab found in {result.total} substance(s)")

    # Spain deep-dive
    es_svc = SpainAEMPSHTAService(es_adapter)
    result = es_svc.search_drugs(query="pembrolizumab")
    assert result.total > 0, "Spain deep-dive: no results for pembrolizumab"
    print(f"  Spain deep-dive: pembrolizumab found in {result.total} substance(s)")


def verify_search_assessments():
    """Test search_assessments() for a few key drugs across all adapters."""
    import asyncio

    async def _test_searches():
        from app.services.hta_agencies.france_has import FranceHAS
        from app.services.hta_agencies.uk_nice import UKNICE
        from app.services.hta_agencies.spain_aemps import SpainAEMPS
        from app.services.hta_agencies.japan_pmda import JapanPMDA

        # Load from files
        fr = FranceHAS()
        fr.load_from_file(DATA_DIR / "FR.json")
        gb = UKNICE()
        gb.load_from_file(DATA_DIR / "GB.json")
        es = SpainAEMPS()
        es.load_from_file(DATA_DIR / "ES.json")
        jp = JapanPMDA()
        jp.load_from_file(DATA_DIR / "JP.json")

        test_substances = ["pembrolizumab", "nivolumab", "olaparib", "enfortumab vedotin", "dupilumab"]

        for substance in test_substances:
            fr_results = await fr.search_assessments(substance)
            gb_results = await gb.search_assessments(substance)
            es_results = await es.search_assessments(substance)
            jp_results = await jp.search_assessments(substance)
            print(f"  {substance}: FR={len(fr_results)}, GB={len(gb_results)}, ES={len(es_results)}, JP={len(jp_results)}")

    asyncio.run(_test_searches())


def main():
    print("Verifying seed data files...\n")

    print("1. Loading adapters from cache:")
    fr = verify_france()
    gb = verify_uk()
    es = verify_spain()
    jp = verify_japan()

    print("\n2. Deep-dive services:")
    verify_deep_dive_services(fr, gb, es)

    print("\n3. Search assessments (cross-country):")
    verify_search_assessments()

    print("\nAll verifications passed!")


if __name__ == "__main__":
    main()

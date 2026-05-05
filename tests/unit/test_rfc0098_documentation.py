from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_rfc0098_experience_uses_gateway_and_manage_truth() -> None:
    rfc = (
        ROOT / "docs" / "rfcs" / "RFC-0098-dpm-mandate-command-center-experience.md"
    ).read_text(encoding="utf-8")
    index = (ROOT / "docs" / "rfcs" / "README.md").read_text(encoding="utf-8")
    integrations = (ROOT / "wiki" / "Integrations.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "wiki" / "Roadmap.md").read_text(encoding="utf-8")

    assert "RFC-0041/0042 WAVE AND OUTCOME EXPERIENCE ALIGNED" in rfc
    assert "RFC-0041/0042 WAVE AND OUTCOME EXPERIENCE ALIGNED" in index
    assert "`lotus-manage` RFC-0040" in rfc
    assert "`lotus-manage` RFC-0042" in rfc
    assert "proof_pack_evidence" in rfc
    assert "Post-Trade Outcome Review Workspace Addendum" in rfc
    assert "`GET /api/v1/dpm/command-center/outcome-reviews/{outcome_review_id}`" in rfc
    assert "Dimension Matrix" in rfc
    assert "AI Evidence Panel" in rfc
    assert "must not call `lotus-manage`" in rfc
    assert "must not recompute expected values" in rfc
    assert "`lotus-report`" in rfc
    assert "`lotus-ai` directly" in rfc
    assert "must not rebuild proof-pack sections" in rfc
    assert "report-input ready but report output unavailable" in rfc
    assert "AI-evidence ready but AI memo unavailable" in rfc
    assert "outcome-review search, detail, supportability" in integrations
    assert "must not calculate expected-versus-realized values" in integrations
    assert "proof-pack truth" in integrations
    assert "manage-owned RFC-0040" in roadmap
    assert "RFC-0042 post-trade\n   outcome-review evidence" in roadmap
    assert "proof-pack evidence, RFC-0041 rebalance-wave orchestration" in roadmap

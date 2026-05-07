from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_rfc0098_experience_uses_gateway_and_manage_truth() -> None:
    rfc = (
        ROOT / "docs" / "rfcs" / "RFC-0098-dpm-mandate-command-center-experience.md"
    ).read_text(encoding="utf-8")
    index = (ROOT / "docs" / "rfcs" / "README.md").read_text(encoding="utf-8")
    integrations = (ROOT / "wiki" / "Integrations.md").read_text(encoding="utf-8")
    roadmap = (ROOT / "wiki" / "Roadmap.md").read_text(encoding="utf-8")
    supported_features = (ROOT / "wiki" / "Supported-Features.md").read_text(encoding="utf-8")

    assert "RFC-0040 PROOF-PACK PANEL" in rfc
    assert "RFC-0040 PROOF-PACK PANEL" in index
    assert "`lotus-manage` RFC-0040" in rfc
    assert "`lotus-manage` RFC-0042" in rfc
    assert "proof_pack_evidence" in rfc
    assert "first RFC-0040 proof-pack review realization is embedded" in rfc
    assert "`/api/v1/dpm/command-center/proof-packs*`" in rfc
    assert "Outcome-review proof ids such as" in rfc
    assert "Gateway Workbench rebalance snapshot" in rfc
    assert "Populated proof packs with manage business state `PENDING_REVIEW`" in rfc
    assert "expected-snapshot run ids" in (
        ROOT / "wiki" / "API-Surface.md"
    ).read_text(encoding="utf-8")
    assert "outcome-review `dpp_*` proof ids or expected-snapshot run ids as RFC-0040" in (
        ROOT / "wiki" / "API-Surface.md"
    ).read_text(encoding="utf-8")
    assert "`dpm.proof_pack`" in rfc
    assert "RFC-0040 PROOF-PACK PANEL" in index
    assert "Post-Trade Outcome Review Workspace Addendum" in rfc
    assert "RFC-0041 REBALANCE-WAVE PANEL" in rfc
    assert "first RFC-0041 rebalance-wave command-center" in rfc
    assert "`/api/v1/dpm/command-center/waves*`" in rfc
    assert "approval, staging, handoff" in rfc
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
    assert "create, detail, item, source-check, simulation, approval, staging, handoff" in integrations
    assert "must not calculate expected-versus-realized values" in integrations
    assert "calculate wave readiness" in integrations
    assert "proof-pack truth" in integrations
    assert "proof-pack panel consumes the Gateway proof-pack" in integrations
    assert "proof-pack sections" in integrations
    assert "manage-owned RFC-0040" in roadmap
    assert "RFC-0042 outcome-review panel" in roadmap
    assert "RFC-0040 proof-pack evidence" in roadmap
    assert "DPM rebalance-wave command center" in supported_features
    assert "approval, staging, handoff" in supported_features
    assert "external OMS/execution integration" in supported_features

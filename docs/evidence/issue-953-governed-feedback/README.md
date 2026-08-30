# Issue 953 Rendered Evidence

These images document the Workbench adviser-feedback interaction implemented for
[#953](https://github.com/sgajbi/lotus-workbench/issues/953) at branch head
`b0982a59559fae4f7f8415984be11f87f8201e8a`.

| Evidence | Viewport | What it proves |
| --- | ---: | --- |
| [Wide adviser action panel](adviser-feedback-wide.png) | 1,600 × 1,000 | The three related decisions remain comparable in a dense workstation row; usefulness is asked first and the relevant-client reason is explicit. |
| [Compact not-useful decision](adviser-feedback-compact.png) | 820 × 1,180 | The cards reflow before helper text can collide; the source-owned not-useful reasons appear only after that outcome is selected. |

The captures use the repository's deterministic Playwright Idea queue/detail fixtures and the
canonical `PB_SG_GLOBAL_BAL_001` portfolio identity. They are rendered UX regression evidence, not
canonical live-service proof. The browser contract test separately proves the exact BFF request for
all eight source-owned reasons and the recorded-and-refreshed success fence. Canonical Idea/Gateway
validation is required after merge before the issue can close.

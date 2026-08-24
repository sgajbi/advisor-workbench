# Product vocabulary

Workbench uses one precise business language across portfolio, performance, advisory, suitability,
portfolio-management, and reporting workflows. This page is the reader-facing index; the complete
definitions, allowed contexts, restricted alternatives, and engineering rules are maintained in
[`docs/documentation/product-vocabulary.md`](../docs/documentation/product-vocabulary.md).

## Core terms

| Business question | Workbench term | Important boundary |
|---|---|---|
| Which client record am I reviewing? | **Portfolio** | **Adviser book** is the adviser-level population; **AUM** requires a source-backed aggregate. |
| What inventory is invested? | **Positions** | Use **Contributing positions** only for a filtered explanatory subset. |
| What cash is expected? | **Projected cash flow** | Dated movements are not projected cash balances. |
| Where do I order and retrieve reports? | **Report centre** | The route remains `/reports`. |
| What requires action? | **Attention item** / **Needs attention** | A source **exception** is evidence, not automatically a processable work item. |
| Is data present, broad enough, and sufficient? | **Availability**, **Evidence coverage**, **Review readiness** | These are three separate facts. Supportability belongs in details. |
| What date did I request and what date did the source price? | **As-of date**, **Valuation date** | Preserve both when they differ; use review date only in the explicit comparison. |
| Which denomination applies? | **Base**, **Reporting**, **Instrument**, **Transaction currency** | Reporting currency requires source acceptance; never relabel a fallback. |
| Which return method is shown? | **Time-weighted return (TWR)**, **Money-weighted return (MWR)** | NET/GROSS is the fee basis, not the method. |
| What advice workflow am I in? | **Proposal**, **Suitability review** | Policy is supporting evidence; Lotus Ideas is the product queue name. |
| What is the rebalance operating scope? | **Instruction** → **Wave** → **Campaign** | One change, one controlled run, then a governed multi-wave programme. |

## Writing and evidence rules

- Use UK English and sentence case.
- Put the business decision before technical support detail.
- Expand specialist acronyms at first meaningful use.
- Use the source-provided business benchmark label; place codes and references in support detail.
- Never infer a service model, capability, date, currency, calculation method, or action authority
  from missing data.
- Say each fact once in the primary scan path and disclose lineage progressively.

## Ownership

This vocabulary governs UI meaning, not API naming. Runtime terms remain in their owning domain
modules and contract fields remain unchanged at adapters. Workbench issue #799 owns the initial
alignment; issue #798 owns the later general copy and jargon enforcement mechanism.

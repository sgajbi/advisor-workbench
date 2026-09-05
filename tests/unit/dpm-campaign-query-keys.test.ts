import { describe, expect, it } from "vitest";

import {
  dpmCampaignMutationKeys,
  dpmCampaignQueryKeys,
} from "../../src/features/workbench/dpm-campaign-query-keys";

const campaign = {
  campaignId: "campaign-1",
  campaignVersion: "2026.05",
};

describe("DPM campaign query identity", () => {
  it("binds every source read to the exact campaign id and version", () => {
    expect(dpmCampaignQueryKeys.lifecycle(campaign)).toEqual([
      "workbench",
      "dpm-campaigns",
      "campaign",
      "campaign-1",
      "2026.05",
      "lifecycle",
    ]);
    expect(dpmCampaignQueryKeys.workflow(campaign)).toEqual([
      "workbench",
      "dpm-campaigns",
      "campaign",
      "campaign-1",
      "2026.05",
      "workflow",
    ]);
  });

  it("includes paging and business-date inputs that change returned evidence", () => {
    expect(dpmCampaignQueryKeys.launchHistory(campaign, 10, 10).at(-1)).toEqual(
      {
        limit: 10,
        offset: 10,
      },
    );
    expect(
      dpmCampaignQueryKeys.previewReadiness(campaign, "2026-05-10").at(-1),
    ).toBe("2026-05-10");
  });

  it("keeps persisted command families beneath one campaign mutation authority", () => {
    expect(dpmCampaignMutationKeys.lifecycle()).toEqual([
      "workbench",
      "dpm-campaigns",
      "mutation",
      "lifecycle",
    ]);
    expect(dpmCampaignMutationKeys.workflow()).toEqual([
      "workbench",
      "dpm-campaigns",
      "mutation",
      "workflow",
    ]);
  });
});

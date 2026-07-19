"use client";

import type { ComponentProps } from "react";
import ReactECharts from "echarts-for-react";
import "echarts/theme/v5.js";

type WorkbenchEChartsProps = Omit<ComponentProps<typeof ReactECharts>, "theme">;

export default function WorkbenchECharts(props: WorkbenchEChartsProps) {
  return <ReactECharts {...props} theme="v5" />;
}

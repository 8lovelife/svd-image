"use client"

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    TooltipProps,
    Legend,
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart" // Ensure this path is correct
import { ColorSvdData } from '@/lib/utils'   // Ensure this path is correct
import { useMemo } from "react"
import React from "react" // Explicit import for React.Fragment if mapping returns fragments

interface SingularValuesAreaChartRGBProps {
    svdData: ColorSvdData | null
    usedValues: number
    maxValuesToPlot?: number // Max number of k values to display on x-axis
}

// --- Hardcoded Color Definitions (REPLACE with your theme or resolved CSS vars) ---
// These should be HSL value strings like "H S% L%"
const COLORS = {
    R: { baseHslValue: "0 84.2% 60.2%", label: "Red" },
    G: { baseHslValue: "120 60% 45%", label: "Green" },
    B: { baseHslValue: "240 70% 60%", label: "Blue" },
};

const PRIMARY_THEME_COLOR_HSL_VAL = "262.1 83.3% 57.8%";
const BACKGROUND_COLOR_HSL_VAL = "0 0% 100%";
const FOREGROUND_COLOR_HSL_VAL = "240 10% 3.9%";
const BORDER_COLOR_HSL_VAL = "240 5.9% 90%";
const MUTED_FOREGROUND_COLOR_HSL_VAL = "240 5% 64.9%";

// Helper to build full HSL/HSLA strings
const buildHslString = (hslValue: string) => `hsl(${hslValue})`;
const buildHslaString = (hslValue: string, alpha: number) => `hsla(${hslValue} / ${alpha})`;

const chartConfigRGB: ChartConfig = {
    R: { label: COLORS.R.label, color: buildHslString(COLORS.R.baseHslValue) },
    G: { label: COLORS.G.label, color: buildHslString(COLORS.G.baseHslValue) },
    B: { label: COLORS.B.label, color: buildHslString(COLORS.B.baseHslValue) },
};

// Opacity levels for the gradient parts
const ACTIVE_PART_OPACITY_START = 0.7;
const ACTIVE_PART_OPACITY_END = 0.6;
const INACTIVE_PART_OPACITY_START = 0.25;
const INACTIVE_PART_OPACITY_END = 0.1;
// --- End of Color Definitions ---


export function SingularValuesAreaChartRGB({
    svdData,
    usedValues,
}: SingularValuesAreaChartRGBProps) {

    if (!svdData || !svdData.r?.s?.length || !svdData.g?.s?.length || !svdData.b?.s?.length) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">Insufficient SVD data for RGB chart.</div>
    }

    const xMax = useMemo(() => {
        if (!svdData.r?.s || !svdData.g?.s || !svdData.b?.s) return 0; // Should be caught by above check
        return Math.min(
            svdData.r.s.length,
            svdData.g.s.length,
            svdData.b.s.length,
        );
    }, [svdData]);

    const chartData = useMemo(() => {
        if (xMax === 0 || !svdData.r?.s || !svdData.g?.s || !svdData.b?.s) return [];
        return Array.from({ length: xMax }, (_, index) => ({
            k: index + 1,
            R_value: svdData.r.s[index] ?? 0,
            G_value: svdData.g.s[index] ?? 0,
            B_value: svdData.b.s[index] ?? 0,
        }));
    }, [svdData, xMax]);

    const yMax = useMemo(() => {
        if (chartData.length === 0) return 0;
        const allIndividualValues = chartData.flatMap(d => [d.R_value, d.G_value, d.B_value]);
        return Math.max(...allIndividualValues.filter(v => typeof v === 'number' && !isNaN(v)), 0);
    }, [chartData]);

    const gradientStopOffset = useMemo(() => {
        if (xMax <= 0) return 0; // No data points
        if (xMax === 1) return 1; // Single data point, active part covers 100%
        const normalizedUsedValues = Math.max(1, Math.min(xMax, usedValues));
        return (normalizedUsedValues - 1) / (xMax - 1); // Range [0, 1]
    }, [usedValues, xMax]);

    const svgGradientDefinitions = useMemo(() => {
        // stop1Pct is where the "active" color segment ends
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        // stop2Pct is where the "inactive" color segment begins, immediately after active
        const stop2Pct = stop1Pct < 100 ? Math.min(100, stop1Pct + 0.001) : 100; // Tiny gap for sharp transition

        return (['R', 'G', 'B'] as const).map(channelKey => {
            const gradientId = `areaGradient-${channelKey}-${usedValues}-${xMax}`; // Unique ID
            const baseHsl = COLORS[channelKey].baseHslValue;
            return (
                <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={buildHslaString(baseHsl, ACTIVE_PART_OPACITY_START)} />
                    <stop offset={`${stop1Pct}%`} stopColor={buildHslaString(baseHsl, ACTIVE_PART_OPACITY_END)} />
                    {/* Only add inactive stops if the active part doesn't cover the whole area */}
                    {stop1Pct < 100 && (
                        <>
                            <stop offset={`${stop2Pct}%`} stopColor={buildHslaString(baseHsl, INACTIVE_PART_OPACITY_START)} />
                            <stop offset="100%" stopColor={buildHslaString(baseHsl, INACTIVE_PART_OPACITY_END)} />
                        </>
                    )}
                </linearGradient>
            );
        });
    }, [gradientStopOffset, usedValues, xMax]); // COLORS is stable, no need to add unless it becomes dynamic state/prop

    const xTicks = useMemo(() => {
        // Create reasonable tick values based on xMax
        if (xMax <= 10) return Array.from({ length: xMax }, (_, i) => i + 1);

        // For larger ranges, create about 5-10 ticks evenly distributed
        const tickCount = Math.min(10, xMax);
        const step = Math.max(1, Math.floor(xMax / (tickCount - 1)));

        // Generate evenly spaced ticks with first and last tick guaranteed
        const ticks = [];
        for (let i = 1; i <= xMax; i += step) {
            ticks.push(i);
        }

        // Ensure the last tick (xMax) is included if not already
        if (ticks[ticks.length - 1] !== xMax) {
            ticks.push(xMax);
        }

        return ticks;
    }, [xMax]);

    const yTickFormatter = (value: number): string => {
        if (value === 0) return "0";
        if (isNaN(value)) return "";
        if (Math.abs(value) >= 1000) return `${(value / 1000).toPrecision(3)}K`;
        // Adjust precision for smaller numbers
        const absVal = Math.abs(value);
        if (absVal < 1 && absVal > 0) return value.toPrecision(2);
        if (absVal < 10) return value.toPrecision(3);
        return value.toPrecision(4);
    };

    const yAxisLabel = `Singular Value${yMax >= 1000 ? " (K)" : ""}`;

    if (xMax === 0) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No data to plot after filtering.</div>
    }

    return (
        <>
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>{svgGradientDefinitions}</defs>
            </svg>

            <ChartContainer config={chartConfigRGB} className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 15, bottom: 25 }}
                    >
                        {/* <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={buildHslString(BORDER_COLOR_HSL_VAL)} /> */}
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[1, xMax]}
                            allowDataOverflow={false} ticks={xTicks}
                            label={{ value: "Singular Value Index (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: buildHslString(FOREGROUND_COLOR_HSL_VAL) }}
                            stroke={buildHslString(FOREGROUND_COLOR_HSL_VAL)}
                        // tick={{ fontSize: 10, fill: buildHslString(MUTED_FOREGROUND_COLOR_HSL_VAL) }}
                        />
                        <YAxis
                            type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[0, yMax > 0 ? 'auto' : 1]}
                            allowDataOverflow={false}
                            label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -10, fontSize: 12, fill: buildHslString(FOREGROUND_COLOR_HSL_VAL) }}
                            tickFormatter={yTickFormatter}
                            stroke={buildHslString(FOREGROUND_COLOR_HSL_VAL)}
                        // tick={{ fontSize: 10, fill: buildHslString(MUTED_FOREGROUND_COLOR_HSL_VAL) }}
                        // width={60} // Adjusted for potentially wider tick labels
                        />
                        <ChartTooltip
                            cursor={{ stroke: buildHslString(MUTED_FOREGROUND_COLOR_HSL_VAL), strokeDasharray: "3 3" }}
                            content={({ active, payload, label }: TooltipProps<number, string>) => {
                                // console.log("Tooltip - Active:", active, "Label:", label, "Payload:", payload);
                                if (active && payload && payload.length) {
                                    // Important: Get the k value from the payload's first item
                                    const kValue = payload[0]?.payload?.k

                                    return (
                                        <ChartTooltipContent
                                            active={active}
                                            payload={payload}
                                            label={label}
                                            className="w-auto"
                                            hideIndicator={false}
                                            // Use the kValue directly from the payload
                                            labelFormatter={() => `k = ${kValue}`}
                                            formatter={(value, name, itemProps) => {
                                                const configEntry = chartConfigRGB[name as keyof typeof chartConfigRGB]
                                                const displayName = configEntry?.label || name

                                                if (typeof value === "number") {
                                                    return (
                                                        <div className="flex items-center justify-between gap-x-2">
                                                            <span className="text-muted-foreground" style={{ color: itemProps.color }}>
                                                                {displayName}:
                                                            </span>
                                                            <span className="font-semibold text-right tabular-nums">{yTickFormatter(value)}</span>
                                                        </div>
                                                    )
                                                }
                                                return null
                                            }}
                                        />
                                    )
                                }
                                return null
                            }}
                        />

                        <Legend
                            onClick={alert}
                            layout="horizontal"
                            verticalAlign="middle"
                            wrapperStyle={{
                                position: 'relative',
                                bottom: 24,
                                right: 80,
                                margin: 0,
                            }}
                            payload={[
                                { value: "R", type: "circle", id: "r", color: "#EF4444" },
                                { value: "G", type: "circle", id: "g", color: "#10B981" },
                                { value: "B", type: "circle", id: "b", color: "#3B82F6" },
                            ]}
                        />
                        {/* <ChartLegend
                            onClick={alert}
                            content={<ChartLegendContent verticalAlign="top" />}
                            align="right"
                            verticalAlign="top"
                            wrapperStyle={{ top: 0, right: 0, left: 'auto' }}
                        /> */}
                        {(['R', 'G', 'B'] as const).map((channel) => {
                            const gradientId = `areaGradient-${channel}-${usedValues}-${xMax}`;
                            const baseHsl = COLORS[channel].baseHslValue;
                            return (
                                <Area
                                    key={`${channel}_value`}
                                    dataKey={`${channel}_value`}
                                    type="natural"
                                    fill={`url(#${gradientId})`}
                                    stroke={buildHslString(baseHsl)}
                                    strokeWidth={1.5}
                                    dot={false}
                                    // activeDot={{ r: 4, strokeWidth: 2, stroke: buildHslString(baseHsl), fill: buildHslString(BACKGROUND_COLOR_HSL_VAL) }}
                                    isAnimationActive={false}
                                // name={chartConfigRGB[channel].label}
                                />
                            );
                        })}

                        {usedValues > 0 && usedValues <= xMax && (
                            <ReferenceLine
                                x={usedValues} stroke={buildHslString(PRIMARY_THEME_COLOR_HSL_VAL)}
                                strokeDasharray="3 3" strokeWidth={1.5} ifOverflow="extendDomain"
                                label={{
                                    value: `k=${usedValues}`, position: "insideTopRight",
                                    fill: buildHslString(PRIMARY_THEME_COLOR_HSL_VAL), fontSize: 11, dy: -5, dx: -2
                                }}
                            />
                        )}
                    </RechartsAreaChart>
                </ResponsiveContainer>
            </ChartContainer>
        </>
    );
}
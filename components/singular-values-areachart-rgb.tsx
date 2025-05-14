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
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart" // Make sure this path is correct
import { ColorSvdData } from '@/lib/utils'   // Make sure this path is correct
import { useMemo } from "react"
import React from "react" // Explicit import for React.Fragment if mapping returns fragments

// Props interface for the component
interface SingularValuesAreaChartRGBProps {
    svdData: ColorSvdData | null
    usedValues: number
    maxValuesToPlot?: number
}

// --- Color Definitions ---
// Base HSL values for channel colors (ensure these CSS variables are in globals.css)
const baseChannelColorsHSL = {
    R: "var(--chart-red)",   // Example: "0 84.2% 60.2%" (actual HSL values)
    G: "var(--chart-green)", // Example: "142.1 70.6% 45.3%"
    B: "var(--chart-blue)",  // Example: "221.2 83.2% 53.3%"
};

// Helper to build full HSL/HSLA strings for SVG
const buildHslString = (cssVarValue: string) => `hsl(${cssVarValue})`;
const buildHslaString = (cssVarValue: string, alpha: number) => `hsla(${cssVarValue}, ${alpha})`;

const PRIMARY_THEME_COLOR_HSL = buildHslString("var(--primary)");
const BACKGROUND_COLOR_HSL = buildHslString("var(--background)");
const FOREGROUND_COLOR_HSL = buildHslString("var(--foreground)");
const BORDER_COLOR_HSL = buildHslString("var(--border)");
const MUTED_FOREGROUND_COLOR_HSL = buildHslString("var(--muted-foreground)");

// Chart config for legend (uses solid colors)
const initialChartConfigRGB: ChartConfig = {
    R: { label: "Red", color: buildHslString(baseChannelColorsHSL.R) },
    G: { label: "Green", color: buildHslString(baseChannelColorsHSL.G) },
    B: { label: "Blue", color: buildHslString(baseChannelColorsHSL.B) },
};

// Opacity levels for the gradient parts within each area
const ACTIVE_PART_OPACITY_START = 0.75; // Start of "active" segment (0 to usedValues)
const ACTIVE_PART_OPACITY_END = 0.65;   // End of "active" segment (at usedValues)
const INACTIVE_PART_OPACITY_START = 0.3;  // Start of "inactive" segment (after usedValues)
const INACTIVE_PART_OPACITY_END = 0.15;   // End of "inactive" segment (at xMax)
// --- End of Color Definitions ---


export function SingularValuesAreaChartRGB({
    svdData,
    usedValues,
    maxValuesToPlot = 100, // Default max points to plot
}: SingularValuesAreaChartRGBProps) {

    if (!svdData || !svdData.r?.s?.length || !svdData.g?.s?.length || !svdData.b?.s?.length) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">Insufficient SVD data for RGB Area Chart.</div>
    }

    // Determine the maximum number of points to plot based on available data and prop
    const xMax = useMemo(() => Math.min(
        svdData.r.s.length,
        svdData.g.s.length,
        svdData.b.s.length,
        maxValuesToPlot
    ), [svdData, maxValuesToPlot]);

    // Prepare chart data with R_value, G_value, B_value keys
    const chartData = useMemo(() => {
        return Array.from({ length: xMax }, (_, index) => {
            const k = index + 1;
            return {
                k: k,
                R_value: svdData.r.s[index] ?? 0,
                G_value: svdData.g.s[index] ?? 0,
                B_value: svdData.b.s[index] ?? 0,
            };
        });
    }, [svdData, xMax]);

    // Calculate Y-axis maximum based on the plotted data
    const yMax = useMemo(() => {
        if (chartData.length === 0) return 0;
        // If stacking, yMax is the sum of values at each k.
        // If not stacking (overlapping), yMax is the max of any individual value.
        // For this example with stacking, we'll let Recharts 'auto' handle it well.
        // If precise control is needed for stacked yMax:
        // const stackedValues = chartData.map(d => d.R_value + d.G_value + d.B_value);
        // return Math.max(...stackedValues.filter(v => typeof v === 'number' && !isNaN(v)), 0);
        const allIndividualValues = chartData.flatMap(d => [d.R_value, d.G_value, d.B_value]);
        return Math.max(...allIndividualValues.filter(v => typeof v === 'number' && !isNaN(v)), 0);
    }, [chartData]);

    // Calculate gradient stop offset (0 to 1 range)
    const gradientStopOffset = useMemo(() => {
        if (xMax <= 1) return 0.5; // Default for single point
        const normalizedUsedValues = Math.max(1, Math.min(xMax, usedValues));
        return (normalizedUsedValues - 1) / Math.max(1, xMax - 1);
    }, [usedValues, xMax]);

    // Memoized SVG gradient definitions for R, G, B
    const svgGradientDefinitions = useMemo(() => {
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        const stop2Pct = Math.min(100, stop1Pct + 0.01); // Sharp transition point

        return (['R', 'G', 'B'] as const).map(channel => {
            // Unique ID for each gradient, changing with usedValues
            const gradientId = `areaGradient-${channel}-${usedValues}-${xMax}`;
            const baseColorVar = baseChannelColorsHSL[channel];
            return (
                <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={buildHslaString(baseColorVar, ACTIVE_PART_OPACITY_START)} />
                    <stop offset={`${stop1Pct}%`} stopColor={buildHslaString(baseColorVar, ACTIVE_PART_OPACITY_END)} />
                    <stop offset={`${stop2Pct}%`} stopColor={buildHslaString(baseColorVar, INACTIVE_PART_OPACITY_START)} />
                    <stop offset="100%" stopColor={buildHslaString(baseColorVar, INACTIVE_PART_OPACITY_END)} />
                </linearGradient>
            );
        });
    }, [gradientStopOffset, usedValues, xMax]); // Dependencies for re-calculation

    const xTicks = Array.from({ length: xMax }, (_, i) => i + 1);
    const yTickFormatter = (value: number): string => {
        if (value === 0) return "0"; if (isNaN(value)) return "";
        if (Math.abs(value) >= 1000) return `${(value / 1000).toPrecision(3)}K`;
        return value.toPrecision(2);
    };
    const yAxisLabel = `Magnitude${yMax >= 1000 ? " (K)" : ""}`;


    return (
        <>
            {/* Render SVG defs to make gradients available in the DOM */}
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>
                    {svgGradientDefinitions}
                </defs>
            </svg>

            <ChartContainer config={initialChartConfigRGB} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 15, bottom: 25 }}
                    // stackOffset="silhouette" // Alternative stacking presentation
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={BORDER_COLOR_HSL} />
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[1, xMax > 0 ? xMax : 1]} allowDataOverflow={false} ticks={xTicks}
                            interval={xMax > 20 ? Math.floor(xMax / 10) : 0}
                            label={{ value: "Singular Value Index (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: FOREGROUND_COLOR_HSL }}
                            stroke={FOREGROUND_COLOR_HSL}
                        />
                        <YAxis
                            type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[0, yMax > 0 ? 'auto' : 1]} // 'auto' works well for stacked too
                            allowDataOverflow={false}
                            label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -10, fontSize: 12, fill: FOREGROUND_COLOR_HSL }}
                            tickFormatter={yTickFormatter}
                            stroke={FOREGROUND_COLOR_HSL}
                        />
                        <ChartTooltip
                            cursor={{ stroke: MUTED_FOREGROUND_COLOR_HSL, strokeDasharray: "3 3" }}
                            content={({ active, payload, label }: TooltipProps<number, string>) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <ChartTooltipContent className="w-[max-content]" hideIndicator>
                                            <div className="text-sm px-2 py-1">
                                                <div className="font-semibold mb-1">k = {label}</div>
                                                {payload.map((item) => {
                                                    // Extract channel from dataKey (e.g., "R_value" -> "R")
                                                    const channelKey = (item.dataKey as string).split('_')[0] as keyof typeof initialChartConfigRGB;
                                                    if (initialChartConfigRGB[channelKey] && typeof item.value === 'number') {
                                                        return (
                                                            <div key={item.dataKey} className="flex items-center justify-between">
                                                                <span style={{ color: initialChartConfigRGB[channelKey]?.color }}>
                                                                    {initialChartConfigRGB[channelKey]?.label || channelKey}:
                                                                </span>
                                                                <span className="font-semibold ml-2">
                                                                    {yTickFormatter(item.value as number)}
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })}
                                            </div>
                                        </ChartTooltipContent>
                                    );
                                }
                                return null;
                            }}
                        />
                        <ChartLegend content={<ChartLegendContent verticalAlign="top" />} />

                        {/* Render Area for each channel with stacking and dynamic gradient fill */}
                        {(['R', 'G', 'B'] as const).map((channel) => {
                            const gradientId = `areaGradient-${channel}-${usedValues}-${xMax}`;
                            const channelBaseColorVar = baseChannelColorsHSL[channel];
                            return (
                                <Area
                                    key={gradientId} // CRITICAL: Force re-render of Area when its gradientId changes
                                    dataKey={`${channel}_value`}
                                    type="natural"
                                    fill={`url(#${gradientId})`}
                                    stroke={buildHslString(channelBaseColorVar)}
                                    strokeWidth={1} // Thinner stroke for stacked areas can look cleaner
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 2, stroke: buildHslString(channelBaseColorVar), fill: BACKGROUND_COLOR_HSL }}
                                    isAnimationActive={false}
                                    name={initialChartConfigRGB[channel].label} // For legend and tooltip
                                    stackId="rgb" // Apply stacking
                                    fillOpacity={1}   // Full opacity for stacked layers
                                />
                            );
                        })}

                        {usedValues > 0 && usedValues <= xMax && (
                            <ReferenceLine
                                x={usedValues} stroke={PRIMARY_THEME_COLOR_HSL}
                                strokeDasharray="2 2" strokeWidth={1.5} ifOverflow="extendDomain"
                                label={{
                                    value: `k=${usedValues}`, position: "insideTopRight",
                                    fill: PRIMARY_THEME_COLOR_HSL, fontSize: 11, dy: -5,
                                }}
                            />
                        )}
                    </RechartsAreaChart>
                </ResponsiveContainer>
            </ChartContainer>
        </>
    );
}
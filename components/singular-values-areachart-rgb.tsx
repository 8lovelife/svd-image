"use client"

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid, // You had this commented out under XAxis
    ReferenceLine,
    ResponsiveContainer,
    TooltipProps,
    Legend, // You imported this
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend, // You imported this too
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { ColorSvdData } from '@/lib/utils'
import { useMemo, useState, useRef, useCallback } from "react"
import React from "react"
import { Payload } from "recharts/types/component/DefaultLegendContent"


interface SingularValuesAreaChartRGBProps {
    svdData: ColorSvdData | null
    usedValues: number
    maxValuesToPlot?: number // This prop will be used to cap xMaxDataLength if provided
}

// ---  COLOR DEFINITIONS ---
const COLORS = {
    R: { baseHslValue: "0 84.2% 60.2%", label: "Red" },
    G: { baseHslValue: "120 60% 45%", label: "Green" },
    B: { baseHslValue: "240 70% 60%", label: "Blue" },
};

const PRIMARY_THEME_COLOR_HSL_VAL = "262.1 83.3% 57.8%";
const BACKGROUND_COLOR_HSL_VAL = "0 0% 100%"; // For activeDot fill
const FOREGROUND_COLOR_HSL_VAL = "240 10% 3.9%";
const BORDER_COLOR_HSL_VAL = "240 5.9% 90%"; // For CartesianGrid
const MUTED_FOREGROUND_COLOR_HSL_VAL = "240 5% 64.9%";

const buildHslString = (hslValue: string) => `hsl(${hslValue})`;
const buildHslaString = (hslValue: string, alpha: number) => `hsla(${hslValue} / ${alpha})`;

// chartConfigRGB using keys that match dataKey "X_value" for easier lookup
const chartConfigRGB: ChartConfig = {
    R_value: { label: COLORS.R.label, color: buildHslString(COLORS.R.baseHslValue) },
    G_value: { label: COLORS.G.label, color: buildHslString(COLORS.G.baseHslValue) },
    B_value: { label: COLORS.B.label, color: buildHslString(COLORS.B.baseHslValue) },
};

const ACTIVE_PART_OPACITY_START = 0.7;
const ACTIVE_PART_OPACITY_END = 0.6;
const INACTIVE_PART_OPACITY_START = 0.25;
const INACTIVE_PART_OPACITY_END = 0.1;
// --- End of Color Definitions ---


export function SingularValuesAreaChartRGB({
    svdData,
    usedValues,
}: SingularValuesAreaChartRGBProps) {

    const [visibleChannels, setVisibleChannels] = useState<{ R: boolean; G: boolean; B: boolean }>({
        R: true, // Initially all visible
        G: true,
        B: true,
    });

    if (!svdData || !svdData.r?.s?.length || !svdData.g?.s?.length || !svdData.b?.s?.length) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">Insufficient SVD data for RGB chart.</div>
    }

    const legendPayload = useMemo((): Payload[] => {
        return (['R', 'G', 'B'] as const).map(channel => ({
            value: channel, // This will be passed to handleLegendClick
            type: "circle",
            id: channel.toLowerCase(),
            color: visibleChannels[channel] ? buildHslString(COLORS[channel].baseHslValue) : MUTED_FOREGROUND_COLOR_HSL_VAL, // Dim if inactive
            inactive: !visibleChannels[channel]
        }));
    }, [visibleChannels]);

    const handleLegendClick = useCallback((data: any) => {
        // data object will be one of the items from the Legend's payload prop
        // e.g., { value: "R", type: "circle", id: "r", color: "#EF4444" }
        const channelKey = data.value as keyof typeof visibleChannels; // Assuming value is "R", "G", or "B"
        if (channelKey && visibleChannels.hasOwnProperty(channelKey)) {
            setVisibleChannels(prev => ({
                ...prev,
                [channelKey]: !prev[channelKey],
            }));
        }
    }, [visibleChannels]);

    // xMaxOriginalDataLength is the shortest of R,G,B singular value arrays, capped by maxValuesToPlot
    const xMaxOriginalDataLength = useMemo(() => {
        if (!svdData.r?.s || !svdData.g?.s || !svdData.b?.s) return 0;
        let maxLength = Math.min(
            svdData.r.s.length,
            svdData.g.s.length,
            svdData.b.s.length
        );
        return maxLength;
    }, [svdData]);

    // yMax based on all data up to xMaxOriginalDataLength for consistent Y scale
    const yMax = useMemo(() => {
        if (xMaxOriginalDataLength === 0 || !svdData.r?.s || !svdData.g?.s || !svdData.b?.s) return 0;
        const allRelevantValues = [];
        for (let i = 0; i < xMaxOriginalDataLength; i++) {
            const rVal = svdData.r.s[i] ?? 0;
            const gVal = svdData.g.s[i] ?? 0;
            const bVal = svdData.b.s[i] ?? 0;
            allRelevantValues.push(rVal);
            allRelevantValues.push(gVal);
            allRelevantValues.push(bVal);
        }
        const maxVal = Math.max(...allRelevantValues.filter(v => typeof v === 'number' && !isNaN(v)), 0);
        const finalYMax = maxVal > 0 ? maxVal * 1.05 : 1;
        return finalYMax;
    }, [svdData, visibleChannels]);


    // xDomainEnd determines the current visible range of the X-axis
    const xDomainEnd = useMemo(() => {
        if (xMaxOriginalDataLength <= 0) return 1; // Default if no data
        // If total data points are few (e.g., <= 20), always show all of them.
        if (xMaxOriginalDataLength <= 20) return xMaxOriginalDataLength;

        const zoomThresholdRatio = 0.5; // Zoom if usedValues is less than 50% of total visible
        // (can be xMaxOriginalDataLength or a smaller maxValuesToPlot if you re-introduce it)
        const minZoomedViewPoints = 15; // When zoomed, try to show at least this many k-values
        const zoomPaddingFactor = 1.8;  // Show up to usedValues * this factor
        const zoomPaddingAbsolute = 7;  // And add this many absolute k-values

        // We consider zooming only if usedValues is significantly smaller than the total data length
        if (
            usedValues < xMaxOriginalDataLength * zoomThresholdRatio &&
            usedValues > 0
        ) {
            let zoomedUpperBound = Math.ceil(usedValues * zoomPaddingFactor + zoomPaddingAbsolute);
            zoomedUpperBound = Math.max(minZoomedViewPoints, zoomedUpperBound);
            return Math.min(xMaxOriginalDataLength, zoomedUpperBound); // Cap at actual data length
        }
        return xMaxOriginalDataLength; // Default: show all available data points
    }, [usedValues, xMaxOriginalDataLength]);


    // Chart data is now sliced based on xDomainEnd
    const chartData = useMemo(() => {
        if (xDomainEnd === 0 || !svdData.r?.s || !svdData.g?.s || !svdData.b?.s) return [];
        return Array.from({ length: xDomainEnd }, (_, index) => ({
            k: index + 1,
            R_value: svdData.r.s[index] ?? 0,
            G_value: svdData.g.s[index] ?? 0,
            B_value: svdData.b.s[index] ?? 0,
        }));
    }, [svdData, xDomainEnd]);


    // Gradient stop offset is relative to xDomainEnd
    const gradientStopOffset = useMemo(() => {
        if (xDomainEnd <= 0) return 0;
        if (xDomainEnd === 1 && usedValues >= 1) return 1;
        const relevantUsedValues = Math.min(usedValues, xDomainEnd);
        const normalizedUsedValues = Math.max(1, relevantUsedValues);
        if (xDomainEnd === 1) return normalizedUsedValues >= 1 ? 1 : 0;
        return (normalizedUsedValues - 1) / (xDomainEnd - 1);
    }, [usedValues, xDomainEnd]);

    // gradientId depends on xDomainEnd as well
    const gradientId = (channelKey: 'R' | 'G' | 'B') => `areaGradient-${channelKey}-${usedValues}-${xDomainEnd}`;

    const svgGradientDefinitions = useMemo(() => {
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        const stop2Pct = stop1Pct < 100 ? Math.min(100, stop1Pct + 0.001) : stop1Pct;
        return (['R', 'G', 'B'] as const).map(channelKey => {
            const currentGradientId = gradientId(channelKey); // Use the helper function
            const baseHsl = COLORS[channelKey].baseHslValue;
            return (
                <linearGradient key={currentGradientId} id={currentGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={buildHslaString(baseHsl, ACTIVE_PART_OPACITY_START)} />
                    <stop offset={`${stop1Pct}%`} stopColor={buildHslaString(baseHsl, ACTIVE_PART_OPACITY_END)} />
                    {stop1Pct < 100 && (
                        <>
                            <stop offset={`${stop2Pct}%`} stopColor={buildHslaString(baseHsl, INACTIVE_PART_OPACITY_START)} />
                            <stop offset="100%" stopColor={buildHslaString(baseHsl, INACTIVE_PART_OPACITY_END)} />
                        </>
                    )}
                </linearGradient>
            );
        });
    }, [gradientStopOffset, usedValues, xDomainEnd]); // Removed gradientId from here, it's generated inside

    // xTicks calculation based on xDomainEnd
    const xTicks = useMemo(() => {
        if (xDomainEnd <= 0) return [];
        if (xDomainEnd === 1) return [1];
        if (xDomainEnd <= 10) return Array.from({ length: xDomainEnd }, (_, i) => i + 1);

        const ticks = [1];
        const desiredTickCount = Math.min(7, xDomainEnd); // Aim for up to 7 ticks for clarity

        if (xDomainEnd > 1) {
            if (desiredTickCount <= 2) {
                if (xDomainEnd > 1) ticks.push(xDomainEnd);
            } else {
                const interval = (xDomainEnd - 1) / (desiredTickCount - 1);
                for (let i = 1; i < desiredTickCount - 1; i++) {
                    ticks.push(Math.round(1 + i * interval));
                }
                ticks.push(xDomainEnd);
            }
        }
        return [...new Set(ticks.filter(t => t >= 1 && t <= xDomainEnd))].sort((a, b) => a - b);
    }, [xDomainEnd]);


    const yTickFormatter = (value: number): string => { /*  yTickFormatter */
        if (value === 0) return "0"; if (isNaN(value)) return "";
        if (Math.abs(value) >= 1000) return `${(value / 1000).toPrecision(3)}K`;
        const absVal = Math.abs(value);
        if (absVal < 1 && absVal > 0) return value.toPrecision(2);
        if (absVal < 10) return value.toPrecision(3);
        return value.toPrecision(4);
    };
    const yAxisLabel = `Singular Value${yMax >= 1000 ? " (K)" : ""}`; // yMax is based on all data

    if (chartData.length === 0) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No data to plot for current view.</div>
    }

    return (
        <>
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>{svgGradientDefinitions}</defs>
            </svg>

            <ChartContainer config={chartConfigRGB} className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={chartData} // Data is now sliced up to xDomainEnd
                        margin={{ top: 5, right: 30, left: 15, bottom: 25 }} //  margin
                        stackOffset="none" // Default for overlapping areas if you prefer, or "expand", "silhouette"
                    >
                        {/* <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={buildHslString(BORDER_COLOR_HSL_VAL)} /> */}
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[1, xDomainEnd]} // Use dynamic xDomainEnd
                            allowDataOverflow={false}
                            ticks={xTicks}
                            interval={0} // Force using your ticks array
                            label={{ value: "Singular Value Index (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: buildHslString(FOREGROUND_COLOR_HSL_VAL) }}
                            stroke={buildHslString(FOREGROUND_COLOR_HSL_VAL)}
                        // tick={{ fontSize: 10, fill: buildHslString(MUTED_FOREGROUND_COLOR_HSL_VAL) }}
                        />
                        <YAxis
                            type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[0, yMax > 0 ? 'auto' : 1]} // Y domain uses overall yMax
                            allowDataOverflow={false}
                            label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -10, fontSize: 12, fill: buildHslString(FOREGROUND_COLOR_HSL_VAL) }}
                            tickFormatter={yTickFormatter}
                            stroke={buildHslString(FOREGROUND_COLOR_HSL_VAL)}
                        // tick={{ fontSize: 10, fill: buildHslString(MUTED_FOREGROUND_COLOR_HSL_VAL) }}
                        // width={60}
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
                                            labelFormatter={() => `Singular Value at k = ${kValue}`}
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
                            onClick={handleLegendClick}
                            layout="horizontal"
                            verticalAlign="middle"
                            wrapperStyle={{
                                position: 'relative',
                                bottom: 24,
                                right: 80,
                                margin: 0,
                            }}
                            payload={legendPayload}
                        />

                        {(['R', 'G', 'B'] as const).map((channel) => {
                            if (!visibleChannels[channel]) { // Check visibility state
                                return null; // Don't render Area if not visible
                            }
                            const dataKeyValue = `${channel}_value` as keyof typeof chartConfigRGB;
                            const currentGradientId = gradientId(channel); // Use helper
                            const baseHsl = COLORS[channel].baseHslValue;
                            return (
                                <Area
                                    key={dataKeyValue} // Key should be stable for the series itself
                                    dataKey={dataKeyValue}
                                    type="natural"
                                    fill={`url(#${currentGradientId})`} // Dynamic gradient ID
                                    stroke={buildHslString(baseHsl)}
                                    strokeWidth={1.5} // 
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 2, stroke: buildHslString(baseHsl), fill: buildHslString(BACKGROUND_COLOR_HSL_VAL) }}
                                    isAnimationActive={false}
                                // stackId="1" // Enable stacking
                                />
                            );
                        })}

                        {usedValues > 0 && usedValues <= xMaxOriginalDataLength && ( //  data length
                            <ReferenceLine
                                x={usedValues}
                                stroke={"#4B5563"} // 
                                strokeDasharray="3 3" strokeWidth={1.5} ifOverflow="extendDomain"
                                label={{
                                    value: `k=${usedValues}`, position: "insideTopRight", // 
                                    fill: "#4B5563", fontSize: 11, dy: -5, dx: -2 // 
                                }}
                            />
                        )}
                    </RechartsAreaChart>
                </ResponsiveContainer>

            </ChartContainer>

            {/* <p className="text-xs text-muted-foreground text-center mt-3 mb-2 leading-relaxed">
                Singular values are sorted by importance, with each successive one contributing less to the data’s structure.
            </p> */}

        </>
    );
}
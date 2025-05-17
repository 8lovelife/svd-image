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
    Legend, // For Recharts Legend
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend, // Using shadcn/ui for custom legend if preferred
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { ColorSvdData, LegendPayload, SvdData } from '@/lib/utils' // Assuming SvdComponents is {u,s,v}
import { useMemo, useState, useCallback } from "react"
import React from "react"
import { Payload } from "recharts/types/component/DefaultLegendContent"

interface CumulativeEnergyChartRGBProps {
    svdData: ColorSvdData | null // Now expects ColorSvdData
    usedValues: number
    maxValuesToPlot?: number // Optional: cap the number of k-values shown
}

// --- Color Definitions (Ensure these match your RGB chart for consistency) ---
const COLORS = {
    R: { baseHslValue: "0 84.2% 60.2%", label: "Red" },
    G: { baseHslValue: "120 60% 45%", label: "Green" },
    B: { baseHslValue: "240 70% 60%", label: "Blue" },
};

const PRIMARY_THEME_COLOR_HSL_VAL = "262.1 83.3% 57.8%"; // For usedValues line
const REFERENCE_LINE_95_COLOR = "#4B5563"; // Gray-600
const TEXT_COLOR = "hsl(var(--foreground))";
const MUTED_TEXT_COLOR = "hsl(var(--muted-foreground))";
const BORDER_COLOR = "hsl(var(--border))";

const buildHslString = (hslValue: string) => `hsl(${hslValue})`;
const buildHslaString = (hslValue: string, alpha: number) => `hsla(${hslValue} / ${alpha})`;

// ChartConfig needs to be for R, G, B energy percentages
const chartConfigEnergyRGB: ChartConfig = {
    R_energyPercent: { label: "Red", color: buildHslString(COLORS.R.baseHslValue) },
    G_energyPercent: { label: "Green", color: buildHslString(COLORS.G.baseHslValue) },
    B_energyPercent: { label: "Blue", color: buildHslString(COLORS.B.baseHslValue) },
};

// Opacity for gradients
const ACTIVE_PART_OPACITY_FILL = 0.6; // Slightly more transparent for overlapping areas
const INACTIVE_PART_OPACITY_FILL = 0.15;
// --- End Color Definitions ---

// Helper to calculate cumulative energy for a single channel's SvdComponents
const calculateChannelCumulativeEnergy = (channelSvdData: SvdData | undefined | null) => {
    if (!channelSvdData || !channelSvdData.s?.length) {
        return [];
    }
    const singularValues = channelSvdData.s.filter(v => typeof v === 'number' && !isNaN(v) && v >= 0);
    if (singularValues.length === 0) return [];

    const squaredSingularValues = singularValues.map(s_val => s_val * s_val);
    const totalEnergy = squaredSingularValues.reduce((sum, current) => sum + current, 0);

    if (totalEnergy === 0) {
        return singularValues.map((s_val, index) => ({
            k: index + 1,
            energyPercent: 0,
            rawValue: s_val
        }));
    }
    let accumulatedEnergy = 0;
    return squaredSingularValues.map((s_sq, index) => {
        accumulatedEnergy += s_sq;
        return {
            k: index + 1,
            energyPercent: (accumulatedEnergy / totalEnergy) * 100,
            rawValue: singularValues[index]
        };
    });
};


export function CumulativeEnergyChartRGB({
    svdData,
    usedValues,
}: CumulativeEnergyChartRGBProps) {

    const [visibleChannels, setVisibleChannels] = useState<{ R: boolean; G: boolean; B: boolean }>({
        R: true, G: true, B: true,
    });

    if (!svdData || !svdData.r?.s?.length || !svdData.g?.s?.length || !svdData.b?.s?.length) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">Insufficient SVD data for RGB energy chart.</div>
    }

    const rEnergyData = useMemo(() => calculateChannelCumulativeEnergy(svdData.r), [svdData.r]);
    const gEnergyData = useMemo(() => calculateChannelCumulativeEnergy(svdData.g), [svdData.g]);
    const bEnergyData = useMemo(() => calculateChannelCumulativeEnergy(svdData.b), [svdData.b]);

    const xMaxDataLength = useMemo(() => {
        let maxLength = Math.min(
            rEnergyData.length,
            gEnergyData.length,
            bEnergyData.length
        );
        return maxLength;
    }, [rEnergyData, gEnergyData, bEnergyData]);

    const xDomainEnd = useMemo(() => { /* ... (same dynamic X-axis logic as before, using xMaxDataLength) ... */
        if (xMaxDataLength <= 0) return 1;
        if (xMaxDataLength <= 20) return xMaxDataLength;
        const zoomThresholdRatio = 0.5, minZoomedViewPoints = 15, zoomPaddingFactor = 1.8, zoomPaddingAbsolute = 7;
        if (usedValues < xMaxDataLength * zoomThresholdRatio && usedValues > 0) {
            let zoomedUpperBound = Math.ceil(usedValues * zoomPaddingFactor + zoomPaddingAbsolute);
            zoomedUpperBound = Math.max(minZoomedViewPoints, zoomedUpperBound);
            return Math.min(xMaxDataLength, zoomedUpperBound);
        }
        return xMaxDataLength;
    }, [usedValues, xMaxDataLength]);

    const chartData = useMemo(() => {
        if (xDomainEnd === 0) return [];
        return Array.from({ length: xDomainEnd }, (_, index) => ({
            k: index + 1,
            R_energyPercent: rEnergyData[index]?.energyPercent ?? 0,
            G_energyPercent: gEnergyData[index]?.energyPercent ?? 0,
            B_energyPercent: bEnergyData[index]?.energyPercent ?? 0,
            // Store raw values if needed by tooltip
            R_rawValue: rEnergyData[index]?.rawValue,
            G_rawValue: gEnergyData[index]?.rawValue,
            B_rawValue: bEnergyData[index]?.rawValue,
        }));
    }, [rEnergyData, gEnergyData, bEnergyData, xDomainEnd]);

    const yDomainMax = 100; // Percentage

    const gradientStopOffset = useMemo(() => { /* ... (same as before, based on xDomainEnd) ... */
        if (xDomainEnd <= 0) return 0; if (xDomainEnd === 1 && usedValues >= 1) return 1;
        const relevantUsedValues = Math.min(usedValues, xDomainEnd);
        const normalizedUsedValues = Math.max(1, relevantUsedValues);
        if (xDomainEnd === 1) return normalizedUsedValues >= 1 ? 1 : 0;
        return (normalizedUsedValues - 1) / (xDomainEnd - 1);
    }, [usedValues, xDomainEnd]);

    const gradientId = useCallback((channelKey: 'R' | 'G' | 'B') => `rgbEnergyGradient-${channelKey}-${usedValues}-${xDomainEnd}`, [usedValues, xDomainEnd]);

    const svgGradientDefinitions = useMemo(() => { /* ... (same as before, looping R,G,B and using gradientId(channelKey)) ... */
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        const stop2Pct = stop1Pct < 100 ? Math.min(100, stop1Pct + 0.001) : stop1Pct;
        return (['R', 'G', 'B'] as const).map(channelKey => {
            const currentGradientId = gradientId(channelKey);
            const baseHsl = COLORS[channelKey].baseHslValue;
            return (
                <linearGradient key={currentGradientId} id={currentGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={buildHslaString(baseHsl, ACTIVE_PART_OPACITY_FILL)} />
                    <stop offset={`${stop1Pct}%`} stopColor={buildHslaString(baseHsl, ACTIVE_PART_OPACITY_FILL)} />
                    {stop1Pct < 100 && (<>
                        <stop offset={`${stop2Pct}%`} stopColor={buildHslaString(baseHsl, INACTIVE_PART_OPACITY_FILL)} />
                        <stop offset="100%" stopColor={buildHslaString(baseHsl, INACTIVE_PART_OPACITY_FILL)} />
                    </>)}
                </linearGradient>
            );
        });
    }, [gradientStopOffset, usedValues, xDomainEnd, gradientId]);

    const xTicks = useMemo(() => { /* ... (same as before, based on xDomainEnd) ... */
        if (xDomainEnd <= 0) return []; if (xDomainEnd === 1) return [1];
        if (xDomainEnd <= 10) return Array.from({ length: xDomainEnd }, (_, i) => i + 1);
        const ticks = [1]; const desiredTickCount = Math.min(7, xDomainEnd);
        if (xDomainEnd > 1) {
            if (desiredTickCount <= 2) { if (xDomainEnd > 1) ticks.push(xDomainEnd); }
            else {
                const interval = (xDomainEnd - 1) / (desiredTickCount - 1);
                for (let i = 1; i < desiredTickCount - 1; i++) { ticks.push(Math.round(1 + i * interval)); }
                ticks.push(xDomainEnd);
            }
        }
        return [...new Set(ticks.filter(t => t <= xDomainEnd))].sort((a, b) => a - b);
    }, [xDomainEnd]);

    const yTickFormatter = (value: number): string => `${value.toFixed(0)}%`;
    const yAxisLabel = "Cumulative Energy (%)";


    const handleLegendClick = useCallback((data: any) => {
        const channelKey = data.value as keyof typeof visibleChannels;
        if (channelKey && visibleChannels.hasOwnProperty(channelKey)) {
            setVisibleChannels(prev => ({ ...prev, [channelKey]: !prev[channelKey] }));
        }
    }, [visibleChannels]); // Important: Include visibleChannels in deps

    const legendPayload = useMemo((): Payload[] => {
        return (['R', 'G', 'B'] as const).map(channel => ({
            value: channel, // Corresponds to channelKey in handleLegendClick
            type: "circle",
            id: channel.toLowerCase(),
            color: visibleChannels[channel] ? buildHslString(COLORS[channel].baseHslValue) : MUTED_TEXT_COLOR,
            inactive: !visibleChannels[channel]
        }));
    }, [visibleChannels]);


    if (chartData.length === 0) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No data to plot.</div>
    }

    return (
        <>
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>{svgGradientDefinitions}</defs>
            </svg>

            <ChartContainer config={chartConfigEnergyRGB} className="flex-grow w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 15, bottom: 25 }} //  margin
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={BORDER_COLOR} />
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={{ stroke: BORDER_COLOR }} tickMargin={8}
                            domain={[1, xDomainEnd]} allowDataOverflow={false} ticks={xTicks} interval={0}
                            label={{ value: "Singular Value Index (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: TEXT_COLOR }}
                            stroke={TEXT_COLOR}
                        // tick={{ fontSize: 10, fill: MUTED_TEXT_COLOR }}
                        />
                        <YAxis
                            type="number" tickLine={false} axisLine={{ stroke: BORDER_COLOR }} tickMargin={8}
                            domain={[0, yDomainMax]} allowDataOverflow={false}
                            tickFormatter={yTickFormatter}
                            label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -10, fontSize: 12, fill: TEXT_COLOR, dy: 25 }}
                            stroke={TEXT_COLOR}
                        // tick={{ fontSize: 10, fill: MUTED_TEXT_COLOR }}
                        // width={60}
                        />
                        <ChartTooltip
                            cursor={{ stroke: MUTED_TEXT_COLOR, strokeDasharray: "3 3" }}
                            content={({ active, payload, label }: TooltipProps<number, string>) => {
                                if (active && payload && payload.length) {
                                    // Get k value directly from the payload's first item
                                    const kValue = payload[0]?.payload?.k

                                    return (
                                        <ChartTooltipContent
                                            active={active}
                                            payload={payload}
                                            label={label}
                                            className="w-auto"
                                            hideIndicator={false}
                                            // Use kValue directly from the payload
                                            labelFormatter={() => `Cumulative Energy at k = ${kValue !== undefined ? kValue : label}`}
                                            formatter={(value, name, itemProps) => {
                                                const configEntry = chartConfigEnergyRGB[name as keyof typeof chartConfigEnergyRGB]
                                                const displayName = configEntry?.label || name

                                                if (typeof value === "number") {
                                                    return (
                                                        // <div className="flex items-center justify-between gap-x-2 text-xs">
                                                        //     <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: itemProps.color }} />
                                                        //     <span className="text-muted-foreground">{displayName}:</span>
                                                        //     <span className="font-bold">{value.toFixed(2)}%</span>
                                                        // </div>

                                                        <div className="flex items-center justify-between gap-x-2">
                                                            <span className="text-muted-foreground" style={{ color: itemProps.color }}>
                                                                {displayName}:
                                                            </span>
                                                            <span className="font-semibold text-right tabular-nums">{value.toFixed(2)}%</span>
                                                        </div>
                                                    )
                                                }
                                                return String(value)
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
                            if (!visibleChannels[channel]) return null; // Conditional rendering

                            const dataKeyValue = `${channel}_energyPercent` as keyof typeof chartConfigEnergyRGB;
                            const currentGradientId = gradientId(channel);
                            const baseHsl = COLORS[channel].baseHslValue;

                            return (
                                <Area
                                    key={dataKeyValue}
                                    dataKey={dataKeyValue}
                                    type="monotone"
                                    fill={`url(#${currentGradientId})`}
                                    stroke={buildHslString(baseHsl)}
                                    strokeWidth={1.5}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 2, stroke: buildHslString(baseHsl), fill: "var(--background)" }}
                                    isAnimationActive={false}
                                // stackId="1" // Remove stackId for overlapping areas
                                />
                            );
                        })}

                        {/* {usedValues > 0 && usedValues <= xMaxDataLength && (
                            <ReferenceLine
                                x={usedValues}
                                stroke={PRIMARY_THEME_COLOR_HSL_VAL}
                                strokeDasharray="3 3" strokeWidth={1.5} ifOverflow="extendDomain"
                                label={{
                                    value: `k=${usedValues}`,
                                    position: (usedValues > xDomainEnd * 0.85 && xDomainEnd > 10) ? "insideLeft" : "insideTopRight",
                                    fill: PRIMARY_THEME_COLOR_HSL_VAL, fontSize: 10, fontWeight: 500, dy: -5, // Adjusted dy
                                    dx: (usedValues > xDomainEnd * 0.85 && xDomainEnd > 10) ? 5 : -5, // Adjusted dx
                                }}
                            />
                        )} */}


                        {usedValues > 0 && usedValues <= xMaxDataLength && (
                            <ReferenceLine
                                x={usedValues}
                                stroke={REFERENCE_LINE_95_COLOR} // Using a distinct color for k-marker
                                strokeDasharray="3 3"
                                strokeWidth={1.5}
                                ifOverflow="extendDomain"
                                label={{
                                    value: `k=${usedValues}`,
                                    position: (usedValues > xDomainEnd * 0.85 && xDomainEnd > 10) ? "insideLeft" : "insideTopRight",
                                    fill: REFERENCE_LINE_95_COLOR,
                                    fontSize: 10, fontWeight: 500, dy: 15,
                                    dx: (usedValues > xDomainEnd * 0.85 && xDomainEnd > 10) ? 0 : 40,
                                }}
                            />
                        )}

                        <ReferenceLine
                            y={95}
                            label={{ value: "95% Energy", position: "insideTopRight", fill: REFERENCE_LINE_95_COLOR, fontSize: 10, dy: -5, dx: -3 }}
                            stroke={REFERENCE_LINE_95_COLOR}
                            strokeDasharray="4 2"
                            strokeWidth={1} // Thinner for Y-axis reference
                            ifOverflow="visible"
                        />
                    </RechartsAreaChart>
                </ResponsiveContainer>
            </ChartContainer>
        </>
    );
}
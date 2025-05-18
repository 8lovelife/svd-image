"use client"

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    TooltipProps, // Keep this if your ChartTooltipContent needs it
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { GraySvdData, SvdData } from '@/lib/utils'
import { useMemo } from "react"
import React from "react"

interface CumulativeEnergyChartProps {
    svdData: GraySvdData | null
    usedValues: number // k value currently selected by user
}

// --- YOUR ORIGINAL COLOR SCHEME FOR ENERGY CHART ---
const ENERGY_ACTIVE_COLOR_FILL = "hsl(0, 0%, 15%)";
const ENERGY_ACTIVE_COLOR_STROKE = "hsl(0, 0%, 15%)";
const ENERGY_INACTIVE_COLOR_FILL = "hsla(0, 0%, 50%, 0.35)";
// For ReferenceLine and text (assuming these are from your globals or define here)
const REFERENCE_LINE_95_COLOR = "#4B5563"; // Gray-600
const TEXT_COLOR = "hsl(var(--foreground))"; // from your globals
const MUTED_TEXT_COLOR = "hsl(var(--muted-foreground))"; // from your globals
const BORDER_COLOR = "hsl(var(--border))"; // from your globals
// --- End Color Definitions ---

const chartConfigEnergy: ChartConfig = {
    energyPercent: { label: "Cumulative Energy", color: ENERGY_ACTIVE_COLOR_STROKE }
}

export function CumulativeEnergyChart({
    svdData,
    usedValues,
}: CumulativeEnergyChartProps) {
    if (!svdData || !svdData.s?.length) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No SVD data to calculate energy.</div>
    }

    const singularValues = svdData.s.filter(v => typeof v === 'number' && !isNaN(v) && v >= 0);
    if (singularValues.length === 0) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No valid singular values.</div>
    }

    const xMaxDataLength = singularValues.length; // Total number of actual k values

    // Calculate cumulative energy based on ALL singular values
    const allCumulativeEnergyData = useMemo(() => {
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
    }, [singularValues]);


    // Determine the dynamic end of the x-axis domain
    const xDomainEnd = useMemo(() => {
        if (xMaxDataLength <= 0) return 1;
        if (xMaxDataLength <= 20) return xMaxDataLength; // If few points, show all

        const zoomThresholdRatio = 0.5; // Zoom if usedValues is less than 50% of total
        const minZoomedViewPoints = 15;
        const zoomPaddingFactor = 1.8;
        const zoomPaddingAbsolute = 7;

        if (
            usedValues < xMaxDataLength * zoomThresholdRatio &&
            usedValues > 0
        ) {
            let zoomedUpperBound = Math.ceil(usedValues * zoomPaddingFactor + zoomPaddingAbsolute);
            zoomedUpperBound = Math.max(minZoomedViewPoints, zoomedUpperBound);
            return Math.min(xMaxDataLength, zoomedUpperBound);
        }
        return xMaxDataLength;
    }, [usedValues, xMaxDataLength]);


    // Chart data is now sliced based on xDomainEnd from allCumulativeEnergyData
    const chartData = useMemo(() => {
        if (xDomainEnd <= 0) return [];
        return allCumulativeEnergyData.slice(0, xDomainEnd);
    }, [allCumulativeEnergyData, xDomainEnd]);


    // Y-axis max is always 100 (or slightly more for padding) for percentage
    const yDomainMax = 100; // For energy percentage

    // Gradient stop offset is relative to the currently displayed x-axis (1 to xDomainEnd)
    const gradientStopOffset = useMemo(() => {
        if (xDomainEnd <= 0) return 0;
        if (xDomainEnd === 1 && usedValues >= 1) return 1;
        const relevantUsedValues = Math.min(usedValues, xDomainEnd);
        const normalizedUsedValues = Math.max(1, relevantUsedValues);
        if (xDomainEnd === 1) return normalizedUsedValues >= 1 ? 1 : 0;
        return (normalizedUsedValues - 1) / (xDomainEnd - 1);
    }, [usedValues, xDomainEnd]);

    const gradientId = useMemo(() => `cumulativeEnergyGradient-${usedValues}-${xDomainEnd}`, [usedValues, xDomainEnd]);

    const svgGradientDefinition = useMemo(() => {
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        const stop2Pct = stop1Pct < 100 ? Math.min(100, stop1Pct + 0.001) : stop1Pct;
        return (
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={ENERGY_ACTIVE_COLOR_FILL} />
                        <stop offset={`${stop1Pct}%`} stopColor={ENERGY_ACTIVE_COLOR_FILL} />
                        {stop1Pct < 100 && (
                            <>
                                <stop offset={`${stop2Pct}%`} stopColor={ENERGY_INACTIVE_COLOR_FILL} />
                                <stop offset="100%" stopColor={ENERGY_INACTIVE_COLOR_FILL} />
                            </>
                        )}
                    </linearGradient>
                </defs>
            </svg>
        );
    }, [gradientId, gradientStopOffset]);


    const xTicks = useMemo(() => { // Your original xTicks logic, based on xDomainEnd
        if (xDomainEnd <= 0) return [];
        if (xDomainEnd === 1) return [1];
        if (xDomainEnd <= 10) return Array.from({ length: xDomainEnd }, (_, i) => i + 1);

        const ticks = [1];
        const desiredTickCount = Math.min(7, xDomainEnd);
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
        return [...new Set(ticks.filter(t => t <= xDomainEnd))].sort((a, b) => a - b);
    }, [xDomainEnd]);


    const yTickFormatter = (value: number): string => `${value.toFixed(0)}%`; // Your original


    if (chartData.length === 0) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No data points to plot for current view.</div>;
    }

    return (
        <>
            {svgGradientDefinition}
            <ChartContainer config={chartConfigEnergy} className="flex-grow w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={chartData} // Use data sliced up to xDomainEnd
                        margin={{ top: 5, right: 30, left: 15, bottom: 25 }} //  margin
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={BORDER_COLOR} />
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[1, xDomainEnd > 0 ? xDomainEnd : 1]} // Use dynamic xDomainEnd
                            allowDataOverflow={false}
                            ticks={xTicks}
                            interval={0} // Use all ticks from your array
                            label={{ value: "Singular Value Index (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: TEXT_COLOR }}
                            stroke={TEXT_COLOR}
                        // tick={{ fontSize: 10, fill: MUTED_TEXT_COLOR }} // Added tick style for consistency
                        />
                        <YAxis
                            type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[0, yDomainMax]} // Y-axis domain is 0-100%
                            allowDataOverflow={false}
                            tickFormatter={yTickFormatter}
                            label={{ value: "Cumulative Energy (%)", angle: -90, position: "insideLeft", offset: -10, fontSize: 12, fill: TEXT_COLOR, dy: 25 }}

                            stroke={TEXT_COLOR}
                        // tick={{ fontSize: 10, fill: MUTED_TEXT_COLOR }} // Added tick style
                        // width={60} // Added for Y-axis label space
                        />
                        <ChartTooltip
                            cursor={{ stroke: MUTED_TEXT_COLOR, strokeDasharray: "3 3" }}
                            content={
                                <ChartTooltipContent
                                    // labelFormatter={(label) => `k = ${label}`}
                                    formatter={(value, name, itemProps) => {
                                        // 'name' will be 'energyPercent'
                                        // 'value' will be the energyPercent value
                                        const kValue = itemProps.payload?.k; // k from the original data point
                                        const rawSingularValue = itemProps.payload?.rawValue;

                                        if (typeof value === 'number') {

                                            return [`${value.toFixed(2)}% at k=${kValue} `];

                                            // let displayItems = [
                                            //     <div key="energy" className="flex items-center gap-2">
                                            //         <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: itemProps.color || ENERGY_ACTIVE_COLOR_STROKE }} />
                                            //         <div className="flex flex-1 justify-between">
                                            //             <span className="text-muted-foreground">Energy:</span>
                                            //             <span className="font-bold">{value.toFixed(2)}%</span>
                                            //         </div>
                                            //     </div>
                                            // ];
                                            // if (typeof rawSingularValue === 'number') {
                                            //     displayItems.push(
                                            //         <div key="s_value" className="flex items-center gap-2 opacity-70 text-xs">
                                            //             <div className="w-2.5 h-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: "transparent" }} />
                                            //             <div className="flex flex-1 justify-between">
                                            //                 <span className="text-muted-foreground">Singular Value:</span>
                                            //                 <span className="font-bold">{rawSingularValue.toPrecision(3)}</span>
                                            //             </div>
                                            //         </div>
                                            //     );
                                            // }
                                            // return displayItems;
                                        }
                                        return [String(value)];
                                    }}
                                // hideLabel={true}
                                />
                            }
                        />
                        <Area
                            key={gradientId}
                            dataKey="energyPercent"
                            type="monotone"
                            fill={`url(#${gradientId})`}
                            stroke={ENERGY_ACTIVE_COLOR_STROKE}
                            strokeWidth={1.5}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2, stroke: ENERGY_ACTIVE_COLOR_STROKE, fill: "var(--background)" }}
                            isAnimationActive={false}
                        // name={chartConfigEnergy.energyPercent.label} // For tooltip/legend via config
                        />
                        {/* ReferenceLine for usedValues on X-axis */}
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
                        {/* Reference line for 95% energy on Y-axis */}
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
                {/* <p className="text-xs text-muted-foreground text-center mt-3 mb-2 leading-relaxed">
                    Adding more singular values gradually preserves more of the original data’s information.
                </p> */}
            </ChartContainer>
        </>
    );
}
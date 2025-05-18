"use client"

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid, // You had this commented out, uncomment if you want it
    ReferenceLine,
    ResponsiveContainer,
    TooltipProps,
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { SvdData } from '@/lib/utils'
import { useMemo } from "react"
import React from "react" // Keep React import

interface SingularValuesLineChartGrayscaleProps {
    svdData: SvdData | null
    usedValues: number
}

//  GRAYSCALE COLOR SCHEME
const ACTIVE_COLOR_FILL = "hsl(0, 0%, 15%)";
const ACTIVE_COLOR_STROKE = "hsl(0, 0%, 15%)";
const INACTIVE_COLOR_FILL = "hsla(0, 0%, 50%, 0.35)";

const chartConfigGrayscale: ChartConfig = {
    value: { label: "Singular Value", color: ACTIVE_COLOR_STROKE }
}

export function SingularValuesAreaChartGrayscale({
    svdData,
    usedValues,
}: SingularValuesLineChartGrayscaleProps) {
    if (!svdData || !svdData.s?.length) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No SVD data.</div>
    }

    // xMax still represents the total number of available singular values
    const xMaxOriginalDataLength = svdData.s.length;
    const allSingularValues = svdData.s; // For yMax calculation

    // yMax calculation remains based on all available data for consistent Y-axis scale
    const yMax = xMaxOriginalDataLength > 0 ? Math.max(...allSingularValues.filter(v => typeof v === 'number' && !isNaN(v)), 0) : 0;

    // NEW: Calculate the dynamic end of the x-axis domain based on usedValues
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


    // chartData is now sliced based on xDomainEnd
    const chartData = useMemo(() => {
        if (xDomainEnd <= 0) return [];
        return svdData.s.slice(0, xDomainEnd).map((val, index) => ({
            k: index + 1,
            value: val,
        }));
    }, [svdData.s, xDomainEnd]);


    // gradientStopOffset is now relative to xDomainEnd
    const gradientStopOffset = useMemo(() => {
        if (xDomainEnd <= 0) return 0;
        if (xDomainEnd === 1 && usedValues >= 1) return 1;

        const relevantUsedValues = Math.min(usedValues, xDomainEnd);
        const normalizedUsedValues = Math.max(1, relevantUsedValues);

        if (xDomainEnd === 1) return normalizedUsedValues >= 1 ? 1 : 0;
        return (normalizedUsedValues - 1) / (xDomainEnd - 1);
    }, [usedValues, xDomainEnd]);

    // gradientId depends on xDomainEnd as well
    const gradientId = useMemo(() => `areaFillGradient-${usedValues}-${xDomainEnd}`, [usedValues, xDomainEnd]);

    const svgGradientDefinition = useMemo(() => {
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        const stop2Pct = stop1Pct < 100 ? Math.min(100, stop1Pct + 0.001) : stop1Pct;

        return (
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={ACTIVE_COLOR_FILL} />
                        <stop offset={`${stop1Pct}%`} stopColor={ACTIVE_COLOR_FILL} />
                        {stop1Pct < 100 && (
                            <>
                                <stop offset={`${stop2Pct}%`} stopColor={INACTIVE_COLOR_FILL} />
                                <stop offset="100%" stopColor={INACTIVE_COLOR_FILL} />
                            </>
                        )}
                    </linearGradient>
                </defs>
            </svg>
        );
    }, [gradientId, gradientStopOffset]);

    // xTicks calculation now based on xDomainEnd
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


    const yTickFormatter = (value: number): string => {
        if (value === 0) return "0"; if (isNaN(value)) return "";
        if (Math.abs(value) >= 1000) return `${(value / 1000).toPrecision(3)}K`;
        const absVal = Math.abs(value);
        if (absVal < 1 && absVal > 0) return value.toPrecision(2);
        if (absVal < 10) return value.toPrecision(3);
        return value.toPrecision(4);
    };
    const yAxisLabel = `Singular Value${yMax >= 1000 ? " (K)" : ""}`;

    if (chartData.length === 0) {
        return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No data to plot for current view.</div>;
    }

    return (
        <>
            {svgGradientDefinition}
            <ChartContainer config={chartConfigGrayscale} className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={chartData} // Use data sliced up to xDomainEnd
                        margin={{ top: 5, right: 30, left: 15, bottom: 25 }} //  margin
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={"hsl(var(--border))"} /> {/* Uncommented your grid */}
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[1, xDomainEnd > 0 ? xDomainEnd : 1]} // Use dynamic xDomainEnd
                            allowDataOverflow={false}
                            ticks={xTicks} // Use dynamically generated ticks
                            interval={0}   // Force Recharts to use all ticks from your ticks array
                            label={{ value: "Singular Value Index (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: "hsl(var(--foreground))" }}
                            stroke={"hsl(var(--foreground))"}
                        //  XAxis did not have custom tick styling, so I removed it to match
                        />
                        <YAxis
                            type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[0, yMax > 0 ? 'auto' : 1]} // yMax is based on all data
                            allowDataOverflow={false}
                            label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -10, fontSize: 12, fill: "hsl(var(--foreground))" }}
                            tickFormatter={yTickFormatter}
                            stroke={"hsl(var(--foreground))"}
                        //  YAxis did not have custom tick styling or width, so I removed them to match
                        />
                        <ChartTooltip
                            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                            content={<ChartTooltipContent
                                formatter={(value, name, item) => {
                                    const originalValue = item.payload?.value;
                                    const kValue = item.payload?.k;
                                    if (typeof originalValue === 'number') {
                                        return [`${yTickFormatter(originalValue)} at k=${kValue} `];
                                    }

                                    return [String(value), String(name)];
                                }}
                            // hideLabel={true}
                            />}
                        />
                        <Area
                            key={gradientId}
                            dataKey="value" type="natural"
                            fill={`url(#${gradientId})`}
                            stroke={ACTIVE_COLOR_STROKE}
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                        // name={chartConfigGrayscale.value.label} // Not strictly needed if only one area
                        />
                        {/* ReferenceLine's x is still based on the actual usedValues */}
                        {/* It will be drawn correctly even if xDomainEnd is smaller, thanks to ifOverflow */}
                        {usedValues > 0 && usedValues <= xMaxOriginalDataLength && (
                            <ReferenceLine
                                x={usedValues}
                                stroke={ACTIVE_COLOR_STROKE} //  color
                                strokeDasharray="3 3"
                                strokeWidth={1.5}
                                ifOverflow="extendDomain"
                                label={{
                                    value: `k=${usedValues}`,
                                    position: "insideTopRight", //  position
                                    // fill: ACTIVE_COLOR_STROKE, // Optional: if you want label color same as line
                                    // fontSize: 11, fontWeight: 500, dy: -6, dx: -2 // Optional styling
                                }}
                            />
                        )}
                    </RechartsAreaChart>
                </ResponsiveContainer>
            </ChartContainer>
            <p className="text-xs text-muted-foreground text-center mt-3 mb-2 leading-relaxed">
                Singular values are sorted by importance, with each successive one contributing less to the data’s structure.
            </p>
        </>
    );
}
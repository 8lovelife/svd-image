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
    type ChartConfig,
} from "@/components/ui/chart"
import { SvdData } from '@/lib/utils'
import { useMemo } from "react"

interface SingularValuesLineChartGrayscaleProps {
    svdData: SvdData | null
    usedValues: number
}

// const ACTIVE_COLOR_FILL = "hsla(222, 83%, 53%, 0.5)"; // Example: Blueish with alpha
// const ACTIVE_COLOR_STROKE = "hsl(222, 83%, 53%)";

// const INACTIVE_COLOR_FILL = "hsla(0, 100%, 50%, 0.4)"; // Red with alpha for usedValue ~ max
// // const INACTIVE_COLOR_STROKE = "hsl(0, 100%, 50%)"; // Not used for Area stroke if one overall stroke

// const BACKGROUND_COLOR_HSL = "hsl(var(--background))";


// Active part: A medium-dark gray, relatively opaque
const ACTIVE_COLOR_FILL = "hsl(0, 0%, 15%)";    // Dark Gray, fairly opaque
const ACTIVE_COLOR_STROKE = "hsl(0, 0%, 15%)";       // Even Darker Gray for stroke

// Inactive part: A lighter gray, more transparent
const INACTIVE_COLOR_FILL = "hsla(0, 0%, 50%, 0.35)"; // Medium Gray, more transparent

const BACKGROUND_COLOR_HSL = "hsl(var(--background))"; // For activeDot fill (from your theme)


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
    const xMax = svdData.s.length;
    const yMax = xMax > 0 ? Math.max(...svdData.s.filter(v => typeof v === 'number' && !isNaN(v)), 0) : 0;

    const chartData = svdData.s.map((val, index) => ({
        k: index + 1,
        value: val,
    }));

    const gradientStopOffset = useMemo(() => {
        if (xMax <= 1) return 0.5;
        const normalizedUsedValues = Math.max(1, Math.min(xMax, usedValues));
        return (normalizedUsedValues - 1) / Math.max(1, xMax - 1);
    }, [usedValues, xMax]);

    const gradientId = useMemo(() => `areaFillGradient-${usedValues}-${xMax}`, [usedValues, xMax]);

    const svgGradientDefinition = useMemo(() => {
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        const stop2Pct = Math.min(100, stop1Pct + 0.01);

        // Log to verify gradient parameters
        // console.log(`SVGDEF: Gradient ID: ${gradientId}, Stop1: ${stop1Pct}%, Stop2: ${stop2Pct}%`);

        return (
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={ACTIVE_COLOR_FILL} />
                        <stop offset={`${stop1Pct}%`} stopColor={ACTIVE_COLOR_FILL} />
                        <stop offset={`${stop2Pct}%`} stopColor={INACTIVE_COLOR_FILL} /> {/* Red part */}
                        <stop offset="100%" stopColor={INACTIVE_COLOR_FILL} /> {/* Red part */}
                    </linearGradient>
                </defs>
            </svg>
        );
    }, [gradientId, gradientStopOffset]);

    const xTicks = Array.from({ length: xMax }, (_, i) => i + 1);
    const yTickFormatter = (value: number): string => {
        if (value === 0) return "0"; if (isNaN(value)) return "";
        if (Math.abs(value) >= 1000) return `${(value / 1000).toPrecision(3)}K`;
        return value.toPrecision(2);
    };
    const yAxisLabel = `Singular Value${yMax >= 1000 ? " (K)" : ""}`;

    // Log to verify the fill prop being passed to Area
    // console.log(`AREA: Using fill: url(#${gradientId}) with key: ${gradientId}`);

    return (
        <>
            {svgGradientDefinition}
            <ChartContainer config={chartConfigGrayscale} className="min-h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 15, bottom: 25 }}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={"hsl(var(--border))"} />
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[1, xMax > 0 ? xMax : 1]}
                            allowDataOverflow={false} ticks={xTicks}
                            interval={xMax > 20 ? Math.floor(xMax / 10) : 0}
                            label={{ value: "Singular Value Index (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: "hsl(var(--foreground))" }}
                            stroke={"hsl(var(--foreground))"}
                        />

                        <YAxis
                            type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[0, yMax > 0 ? 'auto' : 1]} allowDataOverflow={false}
                            label={{ value: yAxisLabel, angle: -90, position: "insideLeft", offset: -10, fontSize: 12, fill: "hsl(var(--foreground))" }}
                            tickFormatter={yTickFormatter}
                            stroke={"hsl(var(--foreground))"}
                        />
                        <ChartTooltip
                            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                            content={<ChartTooltipContent
                                formatter={(value, name, item) => {
                                    // Use the original 'value' from payload for tooltip display, regardless of which series triggered it
                                    const originalValue = item.payload?.value;
                                    const kValue = item.payload?.k;
                                    // ; // Format the value for display
                                    if (typeof originalValue === 'number') {
                                        return [`${yTickFormatter(originalValue)} at k=${kValue} `, chartConfigGrayscale.value.label];
                                    }
                                    return [String(value), String(name)]; // Fallback
                                }}
                                hideLabel={true}
                            />}
                        />
                        <Area
                            key={gradientId} // Force re-render of Area when gradientId changes
                            dataKey="value" type="natural"
                            fill={`url(#${gradientId})`} // Use the dynamic gradient ID
                            stroke={ACTIVE_COLOR_STROKE}
                            strokeWidth={1.5}
                            dot={false}
                            // activeDot={{ r: 4, strokeWidth: 2, stroke: ACTIVE_COLOR_STROKE, fill: BACKGROUND_COLOR_HSL }}
                            isAnimationActive={false}
                        // name={chartConfigGrayscale.value.label}
                        />
                        {/* {usedValues > 0 && usedValues <= xMax && (
                            <ReferenceLine
                                x={usedValues} stroke={ACTIVE_COLOR_STROKE} // Or a distinct color like "orange" for debugging
                                strokeDasharray="3 3" strokeWidth={1.5} ifOverflow="extendDomain"
                            />
                        )} */}
                    </RechartsAreaChart>
                </ResponsiveContainer>
            </ChartContainer>
        </>
    )
}
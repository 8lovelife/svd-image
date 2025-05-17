"use client"

import {
    AreaChart as RechartsAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart" // Assuming these are shadcn/ui chart components
import { SvdData } from '@/lib/utils' // Assuming this is your SVD data type { u, s, v }
import { useMemo } from "react"

interface CumulativeEnergyChartProps {
    svdData: SvdData | null
    usedValues: number // k value currently selected by user
}

const ENERGY_ACTIVE_COLOR_FILL = "hsl(0, 0%, 15%)"; // Use your theme's primary chart color
const ENERGY_ACTIVE_COLOR_STROKE = "hsl(0, 0%, 15%)";

// Optional: for the part of the curve beyond usedValues, if you want different styling
const ENERGY_INACTIVE_COLOR_FILL = "hsla(0, 0%, 50%, 0.35)"; // Lighter/transparent version


const chartConfigEnergy: ChartConfig = {
    energyPercent: { label: "Cumulative Energy", color: ENERGY_ACTIVE_COLOR_STROKE }
    // You can add more series here if needed later
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

    const cumulativeEnergyData = useMemo(() => {
        const squaredSingularValues = singularValues.map(s_val => s_val * s_val);
        const totalEnergy = squaredSingularValues.reduce((sum, current) => sum + current, 0);

        if (totalEnergy === 0) { // Avoid division by zero if all singular values are 0
            return singularValues.map((_, index) => ({
                k: index + 1,
                energyPercent: 0,
                rawValue: singularValues[index] // Keep raw singular value for tooltip if needed
            }));
        }

        let accumulatedEnergy = 0;
        return squaredSingularValues.map((s_sq, index) => {
            accumulatedEnergy += s_sq;
            return {
                k: index + 1,
                energyPercent: (accumulatedEnergy / totalEnergy) * 100,
                rawValue: singularValues[index] // Store original singular value if needed for tooltip
            };
        });
    }, [singularValues]);

    const xMax = cumulativeEnergyData.length;
    // Y-axis max is always 100 (or slightly more for padding) for percentage
    const yMax = 100;

    // --- Gradient for fill based on usedValues ---
    const gradientStopOffset = useMemo(() => {
        if (xMax <= 1) return 0.5; // Or 1 if only one point
        const normalizedUsedValues = Math.max(1, Math.min(xMax, usedValues));
        return (normalizedUsedValues - 1) / Math.max(1, xMax - 1);
    }, [usedValues, xMax]);

    const gradientId = useMemo(() => `cumulativeEnergyGradient-${usedValues}-${xMax}`, [usedValues, xMax]);

    const svgGradientDefinition = useMemo(() => {
        const stop1Pct = Math.max(0, Math.min(100, gradientStopOffset * 100));
        // Ensure a tiny gap for the second color to start if desired, or make them same for sharp transition
        const stop2Pct = Math.min(100, stop1Pct + 0.01);

        return (
            <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden', zIndex: -1 }}>
                <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={ENERGY_ACTIVE_COLOR_FILL} />
                        <stop offset={`${stop1Pct}%`} stopColor={ENERGY_ACTIVE_COLOR_FILL} />
                        <stop offset={`${stop2Pct}%`} stopColor={ENERGY_INACTIVE_COLOR_FILL} />
                        <stop offset="100%" stopColor={ENERGY_INACTIVE_COLOR_FILL} />
                    </linearGradient>
                </defs>
            </svg>
        );
    }, [gradientId, gradientStopOffset]);
    // --- End Gradient ---


    const yTickFormatter = (value: number): string => `${value.toFixed(0)}%`; // Format as percentage
    const xTicks = Array.from({ length: xMax }, (_, i) => i + 1);


    return (
        <>
            {svgGradientDefinition}
            <ChartContainer config={chartConfigEnergy} className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RechartsAreaChart
                        data={cumulativeEnergyData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 25 }} // Adjusted left margin for Y-axis label
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={"hsl(var(--border))"} />
                        <XAxis
                            dataKey="k" type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[1, xMax > 0 ? xMax : 1]}
                            allowDataOverflow={false} ticks={xTicks}
                            interval={xMax > 20 ? Math.floor(xMax / 10) : (xMax > 10 ? 1 : 0)} // Adjust interval
                            label={{ value: "Number of Singular Values (k)", position: "insideBottom", offset: -15, fontSize: 12, fill: "hsl(var(--foreground))" }}
                            stroke={"hsl(var(--foreground))"}
                        />
                        <YAxis
                            type="number" tickLine={false} axisLine={false} tickMargin={8}
                            domain={[0, yMax]} allowDataOverflow={false}
                            tickFormatter={yTickFormatter}
                            label={{ value: "Cumulative Energy (%)", angle: -90, position: "insideLeft", offset: -15, fontSize: 12, fill: "hsl(var(--foreground))" }}
                            stroke={"hsl(var(--foreground))"}
                        />
                        <ChartTooltip
                            cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                            content={<ChartTooltipContent
                                formatter={(value, name, item) => {
                                    const kValue = item.payload?.k;
                                    const energy = item.payload?.energyPercent;
                                    if (typeof energy === 'number') {
                                        return [`${energy.toFixed(2)}% with k=${kValue} `, chartConfigEnergy.energyPercent.label];
                                    }
                                    return [String(value), String(name)];
                                }}
                                hideLabel={true} // Label is part of the formatted string now
                            />}
                        />
                        <Area
                            key={gradientId} // Force re-render of Area if gradient changes
                            dataKey="energyPercent" type="monotone" // "monotone" often looks good for cumulative curves
                            fill={`url(#${gradientId})`}
                            stroke={ENERGY_ACTIVE_COLOR_STROKE} // Or use a conditional stroke if you want active/inactive distinction
                            strokeWidth={1.5}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                        {/* {usedValues > 0 && usedValues <= xMax && (
                            <ReferenceLine
                                x={usedValues}
                                stroke={"hsl(var(--destructive))"} // A contrasting color for the marker
                                strokeDasharray="3 3"
                                strokeWidth={1.5}
                                ifOverflow="extendDomain"
                                label={{ value: `k=${usedValues}`, position: "insideTopRight", fill: "hsl(var(--destructive))", fontSize: 10, dy: -5 }}
                            />
                        )} */}
                        {/* Optional: Reference line for 90% or 95% energy */}
                        <ReferenceLine
                            y={95}
                            label={{
                                value: "95% Energy",
                                position: "insideTopRight",
                                fill: "#4B5563",
                                fontSize: 10,
                                dy: -5
                            }}
                            stroke="#4B5563"
                            strokeDasharray="4 2"
                            strokeWidth={1.5}
                            ifOverflow="visible"
                        />


                    </RechartsAreaChart>
                </ResponsiveContainer>
            </ChartContainer>
        </>
    );
}
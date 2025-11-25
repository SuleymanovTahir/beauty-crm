// frontend/src/components/shared/StatCard.tsx
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    bg: string;
    growthPercentage?: number;
    trendDirection?: 'up' | 'down' | 'stable';
    comparisonContext?: string;
    planProgress?: {
        current: number;
        target: number;
        percentage: number;
        message: string;
    };
}

export function StatCard({
    label,
    value,
    icon: Icon,
    color,
    bg,
    growthPercentage,
    trendDirection,
    comparisonContext,
    planProgress
}: StatCardProps) {
    const getTrendIcon = () => {
        if (!trendDirection || trendDirection === 'stable') {
            return <Minus className="w-4 h-4" />;
        }
        return trendDirection === 'up' ?
            <TrendingUp className="w-4 h-4" /> :
            <TrendingDown className="w-4 h-4" />;
    };

    const getTrendColor = () => {
        if (!trendDirection || trendDirection === 'stable') {
            return 'text-gray-500';
        }
        return trendDirection === 'up' ? 'text-green-600' : 'text-red-600';
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs md:text-sm text-gray-600 mb-2">{label}</p>
                    <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                        {value}
                    </h3>

                    {/* Growth Indicator */}
                    {growthPercentage !== undefined && trendDirection && (
                        <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
                            {getTrendIcon()}
                            <span className="font-medium">
                                {growthPercentage > 0 ? '+' : ''}{growthPercentage}%
                            </span>
                            {comparisonContext && (
                                <span className="text-gray-500 ml-1">{comparisonContext}</span>
                            )}
                        </div>
                    )}

                    {/* Plan Progress */}
                    {planProgress && (
                        <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                <span>{planProgress.message}</span>
                                <span className="font-medium">{planProgress.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                    className={`h-1.5 rounded-full transition-all ${planProgress.percentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${Math.min(planProgress.percentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className={`w-12 h-12 md:w-14 md:h-14 ${bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 md:w-7 md:h-7 ${color}`} />
                </div>
            </div>
        </div>
    );
}

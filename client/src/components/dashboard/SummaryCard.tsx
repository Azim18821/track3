
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  icon: string;
  iconColor: "primary" | "secondary" | "accent" | "gray";
  current?: number;
  target?: number;
  unit?: string;
  value?: string;
  change?: number;
  changeUnit?: string;
  showProgress?: boolean;
  linkText?: string;
  linkHref?: string;
  className?: string;
  compact?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  icon,
  iconColor,
  current = 0,
  target,
  unit = "",
  value,
  change,
  changeUnit = "",
  showProgress = true,
  linkText,
  linkHref,
  className = "",
  compact = false
}) => {
  // Calculate progress percentage safely
  const progressPercent = target ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  
  // Color classes for different states
  const colorClasses = {
    primary: {
      icon: "text-primary-600 dark:text-primary-400",
      bg: "bg-primary-50 dark:bg-primary-900",
      progress: "bg-primary-600 dark:bg-primary-500"
    },
    secondary: {
      icon: "text-secondary-600 dark:text-secondary-400",
      bg: "bg-secondary-50 dark:bg-secondary-900",
      progress: "bg-secondary-600 dark:bg-secondary-500"
    },
    accent: {
      icon: "text-accent-600 dark:text-accent-400",
      bg: "bg-accent-50 dark:bg-accent-900",
      progress: "bg-accent-600 dark:bg-accent-500"
    },
    gray: {
      icon: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-800",
      progress: "bg-gray-600 dark:bg-gray-500"
    }
  };

  const colors = colorClasses[iconColor];

  return (
    <Card className={cn("overflow-hidden dark:bg-gray-800 border-border dark:border-gray-700", className)}>
      <div className={compact ? "p-3" : "p-4 sm:p-5"}>
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md", colors.bg, compact ? "p-1.5" : "p-2 sm:p-3")}>
            <i className={cn(`fas fa-${icon}`, colors.icon, compact ? "text-sm" : "text-lg sm:text-xl")}></i>
          </div>
          <div className={cn("w-0 flex-1", compact ? "ml-2" : "ml-3 sm:ml-5")}>
            <dl>
              <dt className={cn("font-medium text-gray-500 dark:text-gray-400 truncate", compact ? "text-xs" : "text-xs sm:text-sm")}>{title}</dt>
              <dd>
                <div className="flex flex-wrap justify-between items-baseline gap-1">
                  <div className={cn("font-semibold text-gray-900 dark:text-white", compact ? "text-lg" : "text-xl sm:text-2xl")}>
                    {value || (current !== undefined ? `${current}${unit}` : "N/A")}
                  </div>
                  {target && (
                    <div className={cn("text-gray-500 dark:text-gray-400", compact ? "text-xs" : "text-xs sm:text-sm")}>
                      of {target}{unit}
                    </div>
                  )}
                  {change !== undefined && (
                    <div className={cn("flex items-baseline font-semibold", change > 0 ? "text-green-600" : "text-red-600", compact ? "text-xs" : "text-xs sm:text-sm")}>
                      <i className={cn(
                        "fas self-center flex-shrink-0 mr-1",
                        compact ? "h-2.5 w-2.5" : "h-3 w-3 sm:h-4 sm:w-4",
                        change > 0 ? "fa-arrow-up" : "fa-arrow-down"
                      )}></i>
                      <span className="sr-only">{change > 0 ? "Increased by" : "Decreased by"}</span>
                      {Math.abs(change)}{changeUnit}
                    </div>
                  )}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className={cn("bg-gray-50 dark:bg-gray-700", compact ? "px-3 py-1.5" : "px-4 sm:px-5 py-2 sm:py-3")}>
        {showProgress && target > 0 ? (
          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className={cn("h-2.5 rounded-full transition-all duration-300 ease-in-out", colors.progress)} 
              style={{ 
                width: `${Math.min(100, Math.max(0, (current / target) * 100))}%`,
                transition: 'width 0.3s ease-in-out'
              }}
            ></div>
          </div>
        ) : (
          linkText && linkHref && (
            <div className={cn("text-gray-500 dark:text-gray-400", compact ? "text-xs" : "text-xs sm:text-sm")}>
              <Link 
                href={linkHref} 
                className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 hover:dark:text-primary-300 flex items-center justify-center sm:justify-start gap-1"
              >
                <i className="fas fa-chart-line text-xs"></i>
                {linkText}
              </Link>
            </div>
          )
        )}
      </div>
    </Card>
  );
};

export default SummaryCard;

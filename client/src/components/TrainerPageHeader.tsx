import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';

interface TrainerPageHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  backLabel?: string;
  action?: React.ReactNode;
}

const TrainerPageHeader: React.FC<TrainerPageHeaderProps> = ({
  title,
  subtitle,
  backUrl,
  backLabel = 'Back',
  action
}) => {
  return (
    <div className="flex flex-col space-y-2 pb-4 mb-5 border-b">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col space-y-1">
          {backUrl && (
            <Link href={backUrl}>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent/30 mb-1"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {backLabel}
              </Button>
            </Link>
          )}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerPageHeader;
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  retry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  title = "Error", 
  message, 
  retry 
}) => {
  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          {message}
        </AlertDescription>
      </Alert>
      
      {retry && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={retry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;
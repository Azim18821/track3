import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  fullPage?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ 
  message = "Loading...", 
  fullPage = false 
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-2 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;
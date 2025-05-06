import React, { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ 
  children,
  className = "" 
}) => {
  return (
    <main className={`container py-6 px-4 max-w-5xl mx-auto ${className}`}>
      {children}
    </main>
  );
};

export default PageContainer;
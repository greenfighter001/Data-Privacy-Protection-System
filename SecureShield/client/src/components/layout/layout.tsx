
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

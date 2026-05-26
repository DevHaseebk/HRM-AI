"use client";

interface PageWrapperProps {
  children: React.ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
  );
}

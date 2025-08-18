"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Optimize session refetch
      refetchInterval={5 * 60} // 5 minutes
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  );
}

"use client";

import { getProviders, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import SignInComponent from "./SignInComponent";

export default function SignInWrapper() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Get providers
  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    fetchProviders();
  }, []);

  // Handle redirect for authenticated users - ONLY if they came from signin flow
  useEffect(() => {
    if (status === "authenticated" && session && !hasRedirected) {
      const callbackUrl = searchParams?.get("callbackUrl");
      if (callbackUrl) {
        setHasRedirected(true);
        let redirectTo = "/chat"; // Default
        try {
          const decodedUrl = decodeURIComponent(callbackUrl);
          redirectTo = decodedUrl;
        } catch (e) {
          console.error("Error decoding callback URL:", e);
        }
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 100);
      }
    }
  }, [session, status, searchParams, hasRedirected]);

  // Show loading while checking session or fetching providers
  if (status === "loading" || !providers) {
    return (
      <div className="flex justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show redirecting message for authenticated users
  if (status === "authenticated") {
    return (
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">
          You're already signed in. Redirecting...
        </p>
      </div>
    );
  }

  const error = searchParams?.get("error");

  return (
    <>
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>Authentication error: {error}</p>
        </div>
      )}
      <SignInComponent providers={providers} />
    </>
  );
}

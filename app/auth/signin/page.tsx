"use client";

import { Suspense } from "react";
import SignInWrapper from "./SignInWrapper";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            </div>
          }>
          <SignInWrapper />
        </Suspense>
      </div>
    </div>
  );
}

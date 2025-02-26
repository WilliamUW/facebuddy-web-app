"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to register page by default
    router.push("/register");
  }, [router]);

  return null; // No UI needed as we're redirecting
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientRedirect({ url, delay }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(delay);

  useEffect(() => {
    if (countdown <= 0) {
      router.push(url);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, url, router]);

  return (
    <p className="text-xs text-slate-400 mt-6">
      Redirecting to <span className="font-mono text-slate-600">{url}</span> in{" "}
      <span className="font-bold text-slate-600">{countdown}</span> second
      {countdown !== 1 ? "s" : ""}...
    </p>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiRequestError, type Me } from "@/lib/api";

export function useMe(options?: { requireRole?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<Me>("/api/me")
      .then((user) => {
        if (cancelled) {
          return;
        }
        if (user.role === "PENDING") {
          router.replace("/role");
          return;
        }
        setMe(user);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        if (error instanceof ApiRequestError && error.status === 401) {
          router.replace("/login");
          return;
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, options?.requireRole]);

  return { me, loading };
}

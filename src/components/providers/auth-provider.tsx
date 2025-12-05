"use client";

import { PropsWithChildren, useEffect } from "react";
import { Role } from "@/generated/prisma/enums";

export function AuthProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    // Initialize default auth for development if not set
    if (typeof window !== "undefined") {
      const userId = localStorage.getItem("userId");
      const userRole = localStorage.getItem("userRole");
      const userName = localStorage.getItem("userName");

      if (!userId || !userRole) {
        // Set default dev admin user
        localStorage.setItem("userId", "dev-admin-1");
        localStorage.setItem("userRole", Role.ADMIN);
        localStorage.setItem("userName", "Dev Admin");
      }
    }
  }, []);

  return <>{children}</>;
}


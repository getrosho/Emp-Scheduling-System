"use client";

import { useEffect, useState } from "react";
import { Role } from "@/generated/prisma/enums";

export type AuthUser = {
  id: string;
  role: Role;
  name: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize auth for development
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");
    const userName = localStorage.getItem("userName");

    if (!userId || !userRole) {
      // Set default dev user
      const defaultUser: AuthUser = {
        id: "dev-user-1",
        role: Role.ADMIN,
        name: "Dev Admin",
      };
      localStorage.setItem("userId", defaultUser.id);
      localStorage.setItem("userRole", defaultUser.role);
      localStorage.setItem("userName", defaultUser.name);
      setUser(defaultUser);
    } else {
      setUser({
        id: userId,
        role: userRole as Role,
        name: userName || "User",
      });
    }
    setIsInitialized(true);
  }, []);

  return { user, isInitialized };
}


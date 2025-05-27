
"use client";

import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { signUpWithEmail, signInWithEmail, signOutUser } from "@/lib/firebase-auth"; 
import type { SignUpCredentials, SignInCredentials } from "@/lib/firebase-auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (credentials: SignUpCredentials) => Promise<User | null>;
  signIn: (credentials: SignInCredentials) => Promise<User | null>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignUp = async (credentials: SignUpCredentials) => {
    try {
      const firebaseUser = await signUpWithEmail(credentials.email, credentials.password);
      setUser(firebaseUser);
      return firebaseUser;
    } catch (error) {
      console.error("Signup error in AuthContext:", error);
      throw error; // Re-throw to be caught by form
    }
  };

  const handleSignIn = async (credentials: SignInCredentials) => {
     try {
      const firebaseUser = await signInWithEmail(credentials.email, credentials.password);
      setUser(firebaseUser);
      return firebaseUser;
    } catch (error) {
      console.error("Signin error in AuthContext:", error);
      throw error; // Re-throw to be caught by form
    }
  };

  const handleLogOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      router.push('/login'); // Redirect to login after logout
    } catch (error) {
       console.error("Logout error in AuthContext:", error);
       throw error; // Re-throw or handle as needed
    }
  };


  const value = {
    user,
    loading,
    signUp: handleSignUp,
    signIn: handleSignIn,
    logOut: handleLogOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

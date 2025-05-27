
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
  type User
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export const signUpWithEmail = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    // Handle specific Firebase errors or re-throw
    console.error("Firebase signup error:", error);
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already in use.');
    } else if (firebaseError.code === 'auth/weak-password') {
      throw new Error('The password is too weak. It should be at least 6 characters.');
    }
    throw new Error(firebaseError.message || "An unknown error occurred during sign up.");
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase signin error:", error);
    const firebaseError = error as FirebaseError;
     if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password.');
    }
    throw new Error(firebaseError.message || "An unknown error occurred during sign in.");
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase signout error:", error);
    const firebaseError = error as FirebaseError;
    throw new Error(firebaseError.message || "An unknown error occurred during sign out.");
  }
};

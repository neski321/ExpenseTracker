
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateEmail as firebaseUpdateEmail, // Added
  EmailAuthProvider, // Added
  reauthenticateWithCredential, // Added
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

export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Firebase password reset error:", error);
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 'auth/user-not-found') {
      // Avoid confirming if an email exists for security reasons by returning successfully.
      // The user will only get an email if the account exists.
      console.info("Password reset attempted for non-existent user or other issue, but acting as success for UI.");
      return;
    }
    throw new Error(firebaseError.message || "Could not send password reset email. Please try again.");
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

export const reauthenticateUser = async (password: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No user is currently signed in or user email is not available.");
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  try {
    await reauthenticateWithCredential(user, credential);
  } catch (error) {
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
      throw new Error('Incorrect password. Please try again.');
    } else if (firebaseError.code === 'auth/user-mismatch') {
       throw new Error('User credentials do not match the current user.');
    } else if (firebaseError.code === 'auth/requires-recent-login') {
        throw new Error('This operation is sensitive and requires recent authentication. Please sign out and sign back in to continue.');
    }
    console.error("Firebase reauthentication error:", firebaseError);
    throw new Error(firebaseError.message || 'Failed to re-authenticate. Please try again.');
  }
};

export const updateUserEmailFirebase = async (newEmail: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No user is currently signed in.");
  }
  try {
    await firebaseUpdateEmail(user, newEmail);
    // Firebase may send a verification email to the new address.
    // You might want to inform the user about this.
  } catch (error) {
    const firebaseError = error as FirebaseError;
    if (firebaseError.code === 'auth/requires-recent-login') {
      throw new Error('This operation is sensitive and requires recent authentication. Please re-enter your password or sign out and sign back in.');
    } else if (firebaseError.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already in use by another account.');
    } else if (firebaseError.code === 'auth/invalid-email') {
      throw new Error('The new email address is not valid.');
    }
    console.error("Firebase update email error:", firebaseError);
    throw new Error(firebaseError.message || 'Failed to update email. Please try again.');
  }
};

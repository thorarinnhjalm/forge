import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  User,
  OAuthCredential
} from "firebase/auth";
import { auth } from "./firebaseConfig";

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
// Request repo scope to be able to push code
githubProvider.addScope('repo');

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const linkWithGithub = async (user: User) => {
  try {
    const result = await linkWithPopup(user, githubProvider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    return {
      user: result.user,
      token: credential?.accessToken
    };
  } catch (error: any) {
    // If already linked, we might need to just sign in or handle differently
    if (error.code === 'auth/credential-already-in-use') {
       // A common workaround if they linked to another account is to sign in with that credential instead
       // but for simplicity we throw it here to handle in the UI.
    }
    console.error("Error linking with GitHub", error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    // Optionally trigger an API call to clear the server-side session cookie
    await fetch('/api/auth/session', { method: 'DELETE' });
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const setupAuthListener = (onUserChange: (user: User | null) => void) => {
  return onIdTokenChanged(auth, async (user) => {
    onUserChange(user);
    if (user) {
      const token = await user.getIdToken();
      // Send token to backend to create a session cookie
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: token }),
      });
      // Tryggjum að notandi sé alltaf stofnaður í gagnagrunni með 500 inneign
      await fetch('/api/users/init', { method: 'POST' }).catch(console.error);
    }
  });
};

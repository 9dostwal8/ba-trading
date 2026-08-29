import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyBMlgTBhWn7jGG1BjmUmU3fnG_tJbgcIzA",
  authDomain: "ba-trading-f49dd.firebaseapp.com",
  projectId: "ba-trading-f49dd",
  storageBucket: "ba-trading-f49dd.firebasestorage.app",
  messagingSenderId: "276525337005",
  appId: "1:276525337005:web:c8e6ab432fb889a19f7924",
  measurementId: "G-MCZLFSQDQM",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = typeof window !== "undefined" ? getAuth(app) : null!;

/** Invisible Recaptcha setup */
export function setupRecaptcha(containerId = "recaptcha-container") {
  if (typeof window === "undefined" || !auth) return null;
  const existingVerifier = (window as unknown as { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier;
  if (existingVerifier) {
    return existingVerifier;
  }
  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });
  (window as unknown as { recaptchaVerifier?: RecaptchaVerifier }).recaptchaVerifier = verifier;
  return verifier;
}

/** Send real SMS via Firebase Phone Auth */
export async function sendFirebaseSms(
  rawPhone: string,
  containerId = "recaptcha-container"
): Promise<ConfirmationResult> {
  let cleanPhone = rawPhone.replace(/\D/g, "");
  cleanPhone = cleanPhone.replace(/^00964/, "").replace(/^964/, "").replace(/^0/, "");
  const formattedIraqiPhone = `+964${cleanPhone}`;

  const appVerifier = setupRecaptcha(containerId);
  if (!appVerifier) throw new Error("Recaptcha verifier could not be initialized.");

  return await signInWithPhoneNumber(auth, formattedIraqiPhone, appVerifier);
}

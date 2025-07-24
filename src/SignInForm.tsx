"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface SignInFormProps {
  challengeInviteCode?: string | null;
}

export function SignInForm({ challengeInviteCode }: SignInFormProps) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  // Auto-switch to signup if there's a challenge invite
  useEffect(() => {
    if (challengeInviteCode) {
      setFlow("signUp");
    }
  }, [challengeInviteCode]);

  const handleSignIn = async (formData: FormData) => {
    try {
      await signIn("password", formData);
      
      // Don't try to join challenge here - let the main app handle it after auth is established
      if (challengeInviteCode) {
        toast.success("Welcome! Joining your challenge... 🎉");
      } else {
        toast.success("Welcome back!");
      }
    } catch (error: any) {
      let toastTitle = "";
      if (error.message.includes("Invalid password")) {
        toastTitle = "Invalid password. Please try again.";
      } else {
        toastTitle =
          flow === "signIn"
            ? "Could not sign in, did you mean to sign up?"
            : "Could not sign up, did you mean to sign in?";
      }
      toast.error(toastTitle);
    }
  };

  return (
    <div className="w-full">
      {challengeInviteCode && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🔥</span>
            <div>
              <p className="font-semibold text-blue-900">Challenge Invite!</p>
              <p className="text-sm text-blue-700">Create your account to join the challenge</p>
            </div>
          </div>
        </div>
      )}
      
      <form
        className="flex flex-col gap-form-field"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          
          await handleSignIn(formData);
          setSubmitting(false);
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "Sign in" : 
           challengeInviteCode ? "Create Account & Join Challenge" : "Sign up"}
        </button>
        
        {!challengeInviteCode && (
          <div className="text-center text-sm text-secondary">
            <span>
              {flow === "signIn"
                ? "Don't have an account? "
                : "Already have an account? "}
            </span>
            <button
              type="button"
              className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
              onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            >
              {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
            </button>
          </div>
        )}
      </form>
      
      {!challengeInviteCode && (
        <>
          <div className="flex items-center justify-center my-3">
            <hr className="my-4 grow border-gray-200" />
            <span className="mx-4 text-secondary">or</span>
            <hr className="my-4 grow border-gray-200" />
          </div>
          <button className="auth-button" onClick={() => void signIn("anonymous")}>
            Sign in anonymously
          </button>
        </>
      )}
    </div>
  );
}

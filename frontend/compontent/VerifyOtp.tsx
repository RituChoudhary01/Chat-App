"use client";
import { ArrowRight, ChevronLeft, Loader2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation"; // ✅ removed unused redirect
import React, { useEffect, useRef, useState } from "react";
import Cookie from "js-cookie";
import axios from "axios"; // ✅ Fixed: was missing — API calls would crash
import { useAppData, user_service } from "@/context/AppContext";
import toast from "react-hot-toast";


// ── Types ─────────────────────────────────────────────────────────────────────

interface VerifyApiResponse {
  message: string;
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    image: string;
  };
}

interface ResendApiResponse {
  message: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

function VerifyOtp() {
  const { isAuth, setIsAuth, setUser, loading: userLoading, fetchChats, fetchUsers } =
    useAppData();

  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>("");
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email: string = searchParams.get("email") || "";

  // ✅ Fixed: redirect() doesn't work in client components
  useEffect(() => {
    if (isAuth) router.replace("/chat");
  }, [isAuth, router]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // ── OTP input handlers ────────────────────────────────────────────────────

  const handleInputChange = (index: number, value: string): void => {
    if (!/^\d*$/.test(value)) return; // only allow digits
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) {
      setOtp(digits.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  // ── Submit OTP ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post<VerifyApiResponse>(
        `${user_service}/api/v1/verify`,
        { email, otp: otpString }
      );
      toast.success(data.message);
      Cookie.set("token", data.token, {
        expires: 15,
        secure: false,
        path: "/",
      });
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setUser(data.user);
      setIsAuth(true);
      fetchChats();
      fetchUsers();
      router.replace("/chat");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────

  const handleResendOtp = async (): Promise<void> => {
    setResendLoading(true);
    setError("");
    try {
      const { data } = await axios.post<ResendApiResponse>(
        `${user_service}/api/v1/login`,
        { email }
      );
      toast.success(data.message);
      setTimer(60);
    } catch (error) {
      console.log(error);
    } finally {
      setResendLoading(false);
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (userLoading) return (<div className='fixed inset-0 flex items-center justify-center bg-gray-900 min-h-screen'>
    <div className='h-12 w-12 border-4 border-white border-t-transparent rounded-full animate-spin'/>
  </div>);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">

          {/* Header */}
          <div className="text-center mb-8 relative">
            <button
              className="absolute top-0 left-0 p-2 text-gray-300 hover:text-white"
              onClick={() => router.push("/login")}
              type="button"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Lock size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Verify Your Email
            </h1>
            <p className="text-gray-400">We sent a 6-digit code to</p>
            <p className="text-blue-400 font-medium">{email}</p>
          </div>

          {/* Form */}
          {/* ✅ Fixed: removed onClick={handleResendOtp} from submit button */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4 text-center">
                Enter your 6-digit OTP
              </label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el: HTMLInputElement | null) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:border-blue-500 transition"
                  />
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition duration-200 text-white py-4 px-6 rounded-xl font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Verify</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm mb-4">
              Didn&apos;t receive the code?
            </p>
            {timer > 0 ? (
              <p className="text-gray-400 text-sm">
                Resend code in {timer} seconds
              </p>
            ) : (
              // ✅ Fixed: now correctly calls handleResendOtp
              <button
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-blue-400 hover:text-blue-300 font-medium text-sm disabled:opacity-50"
                type="button"
              >
                {resendLoading ? "Sending..." : "Resend Code"}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default VerifyOtp;
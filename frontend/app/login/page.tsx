"use client";
import React, { useEffect, useState } from "react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppData, user_service } from "@/context/AppContext";
import axios from "axios"; 
import toast from "react-hot-toast";




// ── Types ─────────────────────────────────────────────────────────────────────

interface LoginApiResponse {
  message: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const { isAuth, loading: userLoading } = useAppData();

  useEffect(() => {
    if (isAuth) router.replace("/chat");
  }, [isAuth, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post<LoginApiResponse>(
        `${user_service}/api/v1/login`,
        { email }
      );
      toast.success(data.message);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (error:any) {
        toast.error(error.response?.data?.message ?? "Something went wrong.");
      } finally {
      setLoading(false);
    }
  };
  if (userLoading) return <div className='fixed inset-0 flex items-center justify-center bg-gray-900 min-h-screen'>
  <div className='h-12 w-12 border-4 border-white border-t-transparent rounded-full animate-spin'/>
</div>;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Mail size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Welcome To ChatApp
            </h1>
            <p className="text-gray-400">
              Enter your email to continue your journey
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition duration-200 text-white py-4 px-6 rounded-xl font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending OTP to your mail...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default LoginPage;
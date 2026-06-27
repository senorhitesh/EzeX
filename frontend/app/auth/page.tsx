"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import bg from "@/public/01-bg-image-og.jpg";
import Image from "next/image";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace("/editor");
      } else {
        setCheckingSession(false);
      }
      checkSession();
    };
  }, [router]);
  const handleAuth = async () => {
    setLoading(true);
    setError("");
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) setError("Invalid Response");
    else router.replace("/editor");
    setLoading(false);
  };

  if (checkingSession) {
    <div className="flex relative flex-col min-h-screen flex-1 items-center justify-center font-sans bg-neutral-950">
      <p>Loading...</p>
    </div>;
  }
  return (
    <div className="flex relative flex-col min-h-screen flex-1 items-center justify-center font-sans bg-neutral-950">
      <div className="absolute z-0 inset-0 w-full h-full p-3 ">
        <Image
          src={bg}
          alt="Background"
          width={1920}
          height={1080}
          className="w-full h-full object-cover pointer-events-none rounded-2xl"
        />
      </div>
      <div className="relative z-10">
        <div className="bg-black/95 backdrop-blur-sm h-fit p-4 rounded-xl flex-col w-80 flex">
          <form>
            <p className="text-xl font-semibold">EzeY</p>
            <p className="text-medium text-neutral-500">
              {isLogin ? "Sign in your account" : "Create new account"}
            </p>
            <div className="flex flex-col mt-4 gap-2 ">
              <input
                type="email"
                name="email"
                id="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border bg-dark border-neutral-700 px-2 outline-none focus:border-neutral-600  rounded-md py-1.5"
              />
            </div>
            <div className="flex flex-col mt-4 gap-2 ">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                name="password"
                id="password"
                placeholder="Password"
                onKeyDown={(e) => e.key == "Enter" && handleAuth()}
                className="border bg-dark border-neutral-700 px-2 outline-none focus:border-neutral-600  rounded-md py-1.5"
              />
            </div>
            {error && <p className="mt-3 text-red-500">Invalid Credentials*</p>}
            <button
              disabled={loading}
              className={`w-full cursor-pointer mt-4 bg-white py-1.5 rounded-md text-neutral-900 font-semibold`}
              onClick={() => handleAuth()}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Get Started"}
            </button>
          </form>
          <div className="w-full items-center flex justify-center mt-2 ">
            <p
              onClick={() => setIsLogin(!isLogin)}
              className="font-light text-sm cursor-pointer text-neutral-200 hover:text-neutral-100"
            >
              {isLogin
                ? "Don't have an account ? Sign up"
                : "Already have an account ? Sign In"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

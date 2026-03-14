'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import toast from "react-hot-toast"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"
import zxcvbn from "zxcvbn"

export default function CredentialsModal({ open, onClose }: any) {

  const router = useRouter()
  const { login, register, user } = useAuth()

  const [active, setActive] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const strength = zxcvbn(password).score
  useEffect(() => {
    if (user) {
      onClose()
    }
  }, [user])
  function strengthColor() {
    if (strength === 0) return "bg-red-500"
    if (strength === 1) return "bg-orange-500"
    if (strength === 2) return "bg-yellow-500"
    if (strength === 3) return "bg-green-400"
    return "bg-green-600"
  }

  async function handleLogin(e: any) {
    e.preventDefault()
    try {
      setLoading(true)
      await login(email, password)
      toast.success("Welcome back 🚀")
      router.push("/dashboard")
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: any) {
    e.preventDefault()

    if (strength < 2) {
      toast.error("Password too weak")
      return
    }

    try {
      setLoading(true)
      await register(name, email, password)
      toast.success("Account created 🎉")

      router.push("/dashboard")
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center">

      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-[900px] max-w-full min-h-[550px] rounded-3xl overflow-hidden shadow-2xl">

        {/* glass container */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl" />

        {/* SIGN IN */}

        <div
          className={`absolute top-0 left-0 w-1/2 h-full flex items-center justify-center p-10 transition-all duration-700
${active ? "translate-x-full opacity-0" : ""}`}
        >

          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">

            <h1 className="text-3xl font-bold text-white text-center">Sign In</h1>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />

            <button
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-semibold hover:opacity-90"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* OAuth */}

            <div className="flex gap-3 pt-2">

              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full p-2 rounded-lg bg-white text-gray-700"
              >
                <FcGoogle size={20} /> Google
              </button>

              <button
                type="button"
                className="flex items-center justify-center gap-2 w-full p-2 rounded-lg bg-black text-white"
              >
                <FaGithub size={18} /> GitHub
              </button>

            </div>

            <p className="text-center text-gray-300 text-sm">
              No account?
              <button
                type="button"
                onClick={() => setActive(true)}
                className="ml-1 text-purple-300 hover:underline"
              >
                Register
              </button>
            </p>

          </form>

        </div>

        {/* SIGN UP */}

        <div
          className={`absolute top-0 left-0 w-1/2 h-full flex items-center justify-center p-10 transition-all duration-700
${active ? "translate-x-full opacity-100" : "opacity-0 pointer-events-none"}`}
        >

          <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">

            <h1 className="text-3xl font-bold text-white text-center">Create Account</h1>

            <input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/20"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/20"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 border border-white/20"
            />

            {/* password strength */}

            <div className="w-full h-2 rounded bg-gray-700">
              <div
                className={`h-2 rounded ${strengthColor()}`}
                style={{ width: `${(strength + 1) * 20}%` }}
              />
            </div>

            <button
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-semibold"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            <p className="text-center text-gray-300 text-sm">
              Already have account?
              <button
                type="button"
                onClick={() => setActive(false)}
                className="ml-1 text-purple-300 hover:underline"
              >
                Login
              </button>
            </p>

          </form>

        </div>

        {/* TOGGLE PANEL */}

        <div
          className={`absolute top-0 left-1/2 w-1/2 h-full transition-all duration-700
${active ? "-translate-x-full" : ""}`}
        >

          <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex flex-col items-center justify-center text-center p-10">

            {!active ? (

              <>
                <h1 className="text-4xl font-bold mb-4">Hello Friend!</h1>
                <p className="mb-6 text-white/80">Register to start your journey</p>

                <button
                  onClick={() => setActive(true)}
                  className="px-6 py-2 border border-white rounded-lg hover:bg-white/20"
                >
                  Sign Up
                </button>
              </>

            ) : (

              <>
                <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
                <p className="mb-6 text-white/80">Login to continue</p>

                <button
                  onClick={() => setActive(false)}
                  className="px-6 py-2 border border-white rounded-lg hover:bg-white/20"
                >
                  Sign In
                </button>
              </>

            )}

          </div>

        </div>

      </div>

    </div>
  )
}
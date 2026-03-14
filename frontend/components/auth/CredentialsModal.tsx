
'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import toast from "react-hot-toast"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"
import zxcvbn from "zxcvbn"
import { motion, AnimatePresence } from "framer-motion"

export default function CredentialsModal({ open, onClose }: any) {

const router = useRouter()

const { login, register, forgotPassword, user } = useAuth()

const [mode,setMode] = useState<"login"|"register"|"forgot">("login")

const [name,setName] = useState("")
const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [loading,setLoading] = useState(false)

useEffect(()=>{
 if(user){
  onClose()
  router.replace("/dashboard")
 }
},[user])

if(!open) return null

const strength = zxcvbn(password).score

function strengthColor(){
 if(strength===0) return "bg-red-500"
 if(strength===1) return "bg-orange-500"
 if(strength===2) return "bg-yellow-500"
 if(strength===3) return "bg-green-400"
 return "bg-green-600"
}

async function handleLogin(e:any){
 e.preventDefault()

 try{
  setLoading(true)

  await login(email,password)

  toast.success("Welcome back 🚀")

  onClose()

  router.replace("/dashboard")

 }catch(err:any){
  toast.error(err.message || "Login failed")
 }finally{
  setLoading(false)
 }
}

async function handleSignup(e:any){
 e.preventDefault()

 if(strength < 2){
  toast.error("Password too weak")
  return
 }

 try{
  setLoading(true)

  await register(name,email,password)

  toast.success("Account created 🎉")

  onClose()

  router.replace("/dashboard")

 }catch(err:any){
  toast.error(err.message || "Signup failed")
 }finally{
  setLoading(false)
 }
}

async function handleForgot(e:any){
 e.preventDefault()

 try{
  setLoading(true)

  await forgotPassword(email)

  toast.success("Reset link sent")

  setMode("login")

 }catch(err:any){
  toast.error(err.message || "Failed")
 }finally{
  setLoading(false)
 }
}

function googleLogin(){
 window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`
}

function githubLogin(){
 window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/github`
}

return(

<AnimatePresence>

{open &&(

<motion.div
initial={{opacity:0}}
animate={{opacity:1}}
exit={{opacity:0}}
className="fixed inset-0 z-50 flex items-center justify-center"
>

<div
className="absolute inset-0 bg-black/70 backdrop-blur-sm"
onClick={onClose}
/>

<motion.div
initial={{scale:0.9,opacity:0}}
animate={{scale:1,opacity:1}}
exit={{scale:0.9,opacity:0}}
transition={{duration:0.25}}
className="relative w-[900px] max-w-full min-h-[550px] rounded-3xl overflow-hidden shadow-2xl"
>

<div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl"/>

<div className="relative flex h-full">

{/* LEFT PANEL */}

<div className="w-1/2 flex items-center justify-center p-10">

{mode==="login" &&(

<form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">

<h1 className="text-3xl font-bold text-white text-center">Sign In</h1>

<input
type="email"
placeholder="Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/20"
/>

<input
type="password"
placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/20"
/>

<button
disabled={loading}
className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-500 text-white"
>
{loading ? "Signing in..." : "Sign In"}
</button>

<div className="flex gap-3 pt-2">

<button
type="button"
onClick={googleLogin}
className="flex items-center justify-center gap-2 w-full p-2 rounded-lg bg-white text-gray-700"
>
<FcGoogle size={20}/> Google
</button>

<button
type="button"
onClick={githubLogin}
className="flex items-center justify-center gap-2 w-full p-2 rounded-lg bg-black text-white"
>
<FaGithub size={18}/> GitHub
</button>

</div>

<div className="flex justify-end text-sm text-gray-300">

<button
type="button"
onClick={()=>setMode("forgot")}
className="hover:underline"
>
Forgot password?
</button>

</div>

</form>

)}

{mode==="register" &&(

<form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">

<h1 className="text-3xl font-bold text-white text-center">Create Account</h1>

<input
placeholder="Full Name"
value={name}
onChange={(e)=>setName(e.target.value)}
className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/20"
/>

<input
type="email"
placeholder="Email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/20"
/>

<input
type="password"
placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/20"
/>

<div className="w-full h-2 rounded bg-gray-700">
<div
className={`h-2 rounded ${strengthColor()}`}
style={{width:`${(strength+1)*20}%`}}
/>
</div>

<button
disabled={loading}
className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-500 text-white"
>
{loading ? "Creating..." : "Create Account"}
</button>

<p className="text-center text-sm text-gray-300">

<button
type="button"
onClick={()=>setMode("login")}
className="hover:underline"
>
Back to login
</button>

</p>

</form>

)}

{mode==="forgot" &&(

<form onSubmit={handleForgot} className="w-full max-w-sm space-y-4">

<h1 className="text-3xl font-bold text-white text-center">Reset Password</h1>

<input
type="email"
placeholder="Enter email"
value={email}
onChange={(e)=>setEmail(e.target.value)}
className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/20"
/>

<button
disabled={loading}
className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-500 text-white"
>
{loading ? "Sending..." : "Send Reset Link"}
</button>

<p className="text-center text-sm text-gray-300">

<button
type="button"
onClick={()=>setMode("login")}
className="hover:underline"
>
Back to login
</button>

</p>

</form>

)}

</div>

{/* RIGHT PANEL */}

<div className="w-1/2 bg-gradient-to-br from-indigo-500 to-purple-700 text-white flex flex-col items-center justify-center text-center p-10">

<h1 className="text-4xl font-bold mb-4">Job Crawler</h1>

<p className="text-white/80 mb-6">
AI powered job matching platform
</p>

{mode === "login" && (
<button
onClick={()=>setMode("register")}
className="px-6 py-3 rounded-lg border border-white hover:bg-white hover:text-purple-700 transition"
>
Create Account
</button>
)}

{mode === "register" && (
<button
onClick={()=>setMode("login")}
className="px-6 py-3 rounded-lg border border-white hover:bg-white hover:text-purple-700 transition"
>
Sign In
</button>
)}

</div>

</div>

</motion.div>

</motion.div>

)}

</AnimatePresence>

)
}


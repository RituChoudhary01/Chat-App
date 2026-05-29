"use client"

import { useAppData, User, user_service } from "@/context/AppContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import Cookies from "js-cookie"
import toast from "react-hot-toast"
import { ArrowLeft, Save, User as UserIcon, UserCircle } from "lucide-react"

interface UpdateUserResponse {
  token: string;
  message: string;
  user: User;
}

function ProfilePage() {
  const { user, isAuth, loading, setUser } = useAppData()
  const [isEdit, setIsEdit] = useState(false)
  const [name, setName] = useState<string>("")
  const router = useRouter()

  // ✅ FIX: sync name input whenever user data arrives (after refresh or update)
  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user?.name])

  const editHandler = () => {
    setIsEdit(!isEdit)
    setName(user?.name ?? "")
  }

  const submitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = Cookies.get("token")
    try {
      const { data } = await axios.post<UpdateUserResponse>(
        `${user_service}/api/v1/update/user`,
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      Cookies.set("token", data.token, {
        expires: 15,
        secure: false,
        path: "/",
      })
      toast.success(data.message)
      setUser(data.user)
      setIsEdit(false)
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Update failed")
    }
  }

  useEffect(() => {
    if (!isAuth && !loading) {
      router.push("/login")
    }
  }, [isAuth, router, loading])

  // ✅ FIX: show spinner while loading — this prevents the "Not set" flash on refresh
  // because user is null until fetchUser() in AppContext resolves
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900 min-h-screen">
        <div className="h-12 w-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">

        {/* Back button + title */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/chat")}
            className="p-3 bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
            <p className="text-gray-400 mt-1">Manage your account information</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg">

          {/* Avatar header */}
          <div className="bg-gray-700 p-8 border-b border-gray-600">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-600 flex items-center justify-center">
                  <UserCircle className="w-12 h-12 text-gray-300" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-800" />
              </div>
              <div className="flex-1">
                {/* ✅ FIX: user.name is now always available here because we wait for loading */}
                <h2 className="text-2xl font-bold text-white mb-1">
                  {user?.name || "User"}
                </h2>
                <p className="text-gray-300 text-sm">{user?.email || ""}</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <div className="space-y-6">

              {/* Display Name field */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Display Name
                </label>
                {isEdit ? (
                  <form onSubmit={submitHandler} className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        placeholder="Enter your name"
                      />
                      <UserIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={!name.trim() || name.trim() === user?.name}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={editHandler}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600">
                    {/* ✅ FIX: show user.name — guaranteed to be set after loading completes */}
                    <span className="text-white font-medium text-lg">
                      {user?.name || "Not set"}
                    </span>
                    <button
                      onClick={editHandler}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Email field (read-only) */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Email Address
                </label>
                <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                  <span className="text-gray-300 font-medium">
                    {user?.email || ""}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, Lock, User as UserIcon, AlertCircle } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useUser } from "@/contexts/user-context"

export default function SignupPage() {
  const router = useRouter()
  const { register, isLoading: isAuthLoading } = useUser()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register(username, password, name)
      router.push("/")
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = isAuthLoading || isSubmitting

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          <Card className="border-pet-primary/10 shadow-lg">
            <CardHeader className="space-y-1 bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
              <CardTitle className="text-2xl text-pet-primary">Create an account</CardTitle>
              <CardDescription>Sign up to start finding and reporting pets</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-pet-primary font-medium">
                      Full Name
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        className="pl-10 border-pet-primary/20 focus-visible:ring-pet-primary"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-pet-primary font-medium">
                      Username
                    </Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="username"
                        type="text"
                        placeholder="your_username"
                        className="pl-10 border-pet-primary/20 focus-visible:ring-pet-primary"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-pet-primary font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 border-pet-primary/20 focus-visible:ring-pet-primary"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-pet-primary hover:bg-pet-primary/90" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create account"}
                  </Button>
                </form>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center bg-gradient-to-r from-white to-pet-soft border-t border-pet-primary/10 py-6">
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-pet-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}


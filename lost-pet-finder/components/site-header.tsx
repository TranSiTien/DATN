"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PawPrint, Menu, X, User, LogOut, Settings, Heart, Bell, Plus } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useUser } from "@/contexts/user-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout, toggleAuth } = useUser()

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
  }

  return (
    <header className="relative border-b">
      {/* Background with enhanced gradient and subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-pet-primary/90 via-pet-secondary/80 to-pet-primary/90 opacity-90"></div>

      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-pet-accent/20 blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-pet-primary/20 blur-3xl"></div>
      </div>

      <div className="container relative flex h-20 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 z-10">
          <div className="bg-white p-2 rounded-full shadow-md">
            <PawPrint className="h-6 w-6 text-pet-primary" />
          </div>
          <span className="text-xl font-bold text-white drop-shadow-sm">PetReunite</span>
        </Link>

        {/* Desktop Navigation - Hidden on mobile */}
        <nav className="hidden md:flex items-center gap-8 z-10">
          <Link
            href="/lost"
            className="text-sm font-medium text-white hover:text-white/90 transition-colors relative group"
          >
            Report Lost Pet
            <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </Link>
          <Link
            href="/found"
            className="text-sm font-medium text-white hover:text-white/90 transition-colors relative group"
          >
            Report Found Pet
            <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </Link>
          <Link
            href="/search"
            className="text-sm font-medium text-white hover:text-white/90 transition-colors relative group"
          >
            Search
            <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-white hover:text-white/90 transition-colors relative group"
          >
            About
            <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-white scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </Link>
        </nav>

        {/* Mobile Menu Button - Visible only on mobile */}
        <div className="md:hidden flex items-center gap-2 z-10">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" aria-label="Menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-gradient-to-b from-pet-primary to-pet-secondary text-white p-0 w-[300px]"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <div className="bg-white p-2 rounded-full shadow-md">
                      <PawPrint className="h-5 w-5 text-pet-primary" />
                    </div>
                    <span className="text-lg font-bold text-white">PetReunite</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:bg-white/10"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-col p-4 space-y-4">
                  <Link
                    href="/lost"
                    className="text-white hover:text-white/90 py-2 border-b border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    Report Lost Pet
                  </Link>
                  <Link
                    href="/found"
                    className="text-white hover:text-white/90 py-2 border-b border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    Report Found Pet
                  </Link>
                  <Link
                    href="/search"
                    className="text-white hover:text-white/90 py-2 border-b border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    Search
                  </Link>
                  <Link
                    href="/about"
                    className="text-white hover:text-white/90 py-2 border-b border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    About
                  </Link>
                </nav>
                <div className="mt-auto p-4 space-y-3">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 mb-4 p-3 bg-white/10 rounded-lg">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white">
                          <Image
                            src={user.avatarUrl || "/placeholder.svg"}
                            alt={user.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-xs text-white/70">{user.email}</p>
                        </div>
                      </div>
                      <Link href="/profile" onClick={() => setIsOpen(false)}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                        >
                          <User className="mr-2 h-4 w-4" />
                          My Profile
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        className="w-full bg-pet-accent hover:bg-pet-accent/90 text-white shadow-md"
                        onClick={() => {
                          logout()
                          setIsOpen(false)
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setIsOpen(false)}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                        >
                          Log in
                        </Button>
                      </Link>
                      <Link href="/signup" onClick={() => setIsOpen(false)}>
                        <Button size="sm" className="w-full bg-pet-accent hover:bg-pet-accent/90 text-white shadow-md">
                          Sign up
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Auth Buttons or User Profile - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 z-10">
          {/* Auth Toggle Button (for testing only) */}

          {user ? (
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-pet-accent text-white">
                  3
                </Badge>
              </Button>

              {/* Create New Listing */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Create New</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/lost" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4 text-pet-primary" />
                      Report Lost Pet
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/found" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4 text-pet-accent" />
                      Report Found Pet
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0 border-2 border-white overflow-hidden"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-pet-primary text-white">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile/contacts" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Contacts
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white transition-colors"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="sm"
                  className="bg-pet-accent hover:bg-pet-accent/90 text-white shadow-md transition-all hover:shadow-lg"
                >
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}


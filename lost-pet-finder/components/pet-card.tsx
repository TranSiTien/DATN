"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

// Base URL from environment variable
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:5049"

export interface PetCardProps {
  id: string | number
  type: "lost" | "found" | "Lost" | "Found"
  name?: string
  petType?: string
  breed?: string
  description?: string
  location: string
  date: Date | string
  imageUrl: string
  status?: string
  matchScore?: number
  className?: string
  size?: "small" | "medium" | "large"
  variant?: "default" | "search" | "similar"
  onClick?: () => void
}

export function PetCard({
  id,
  type,
  name,
  petType,
  breed,
  location,
  date,
  imageUrl,
  matchScore,
  className,
  size = "medium",
  variant = "default",
  onClick,
}: PetCardProps) {
  // Determine title based on available information
  const title = name ? `${name}` : `${type} ${petType || breed || "Pet"}`

  // Determine image aspect ratio based on size and variant
  const imageAspectRatio = variant === "similar" ? "aspect-video" : size === "small" ? "aspect-square" : "aspect-square"

  // Properly format the image URL if it's a relative path from the API
  const formattedImageUrl = (() => {
    // If no image URL is provided, return placeholder
    if (!imageUrl) return "/placeholder.svg";
    
    // If the URL already starts with the base URL or is an absolute URL, return it as is
    if (imageUrl.startsWith(BASE_URL) || imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a local asset (starts with /)
    if (imageUrl.startsWith('/')) {
      // Remove any leading slash before joining with BASE_URL to prevent double slashes
      return `${BASE_URL}${imageUrl}`;
    }
    
    // If it contains 'uploads/' but doesn't have the full URL
    if (imageUrl.includes('uploads/')) {
      // Ensure no double slashes by removing any leading slash
      const cleanImagePath = imageUrl.replace(/^\/+/, '');
      return `${BASE_URL}/${cleanImagePath}`;
    }
    
    // Default fallback
    return imageUrl;
  })();

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-lg border border-pet-primary/10 bg-background shadow-sm transition-all hover:shadow-lg pet-card-hover",
        className,
      )}
      onClick={onClick}
    >
      <div className="relative">
        <div className={cn("overflow-hidden", imageAspectRatio)}>
          <Image
            src={formattedImageUrl || `/placeholder.svg?height=300&width=300&text=Pet+${id}`}
            width={300}
            height={300}
            alt={title}
            className="object-cover transition-transform group-hover:scale-105 h-full w-full"
          />
        </div>
        {matchScore && (
          <div className="absolute top-3 right-3 bg-background/90 rounded-full px-2 py-1 text-xs font-medium border shadow-sm">
            {matchScore}% Match
          </div>
        )}
      </div>
      <div className="p-4">
        <div
          className={cn(
            "inline-block rounded-full px-3 py-1 text-xs font-medium mb-2",
            type === "Lost" || type === "lost" ? "bg-pet-primary/10 text-pet-primary" : "bg-pet-accent/10 text-pet-accent",
          )}
        >
          {type}
        </div>
        <h3
          className={cn(
            "font-medium",
            type === "Lost" || type === "lost" ? "text-pet-primary" : "text-pet-accent",
            size === "small" ? "text-base" : "text-lg",
          )}
        >
          {title}
        </h3>
        {(petType || breed) && variant !== "similar" && (
          <p className="text-sm text-muted-foreground">
            {petType && breed ? `${petType} • ${breed}` : petType || breed}
          </p>
        )}
        <div className="mt-2 flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-1 h-3 w-3" />
          {location}
        </div>
        <div className="mt-1 flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-1 h-3 w-3" />
          {typeof date === "string" ? new Date(date).toLocaleDateString() : date.toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}


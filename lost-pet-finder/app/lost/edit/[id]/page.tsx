"use client"

import React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Heart, MapPin, Calendar, Loader2, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/contexts/user-context"

// Base URL from environment variable
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:5049"
const API_BASE_URL = `${BASE_URL}/api`

// Define interfaces
interface Location {
  address: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
}

interface LostPet {
  id: string;
  name: string;
  description: string;
  lastSeenDateTime: string;
  locationName: string;
  status: string;
  lastSeenLocation: {
    latitude: number;
    longitude: number;
  };
  images: Array<{
    fileId: string;
    fileUrl: string;
  }>;
}

export default function EditLostPet() {
  const params = useParams();
  const petId = params?.id as string;
  
  const router = useRouter()
  const { toast } = useToast()
  const { token } = useUser()
  
  // Form state
  const [petName, setPetName] = useState("")
  const [description, setDescription] = useState("")
  const [dateLost, setDateLost] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<Array<{fileId: string, fileUrl: string}>>([])
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pet, setPet] = useState<LostPet | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Location state
  const [location, setLocation] = useState<Location>({
    address: "",
    latitude: null,
    longitude: null,
    locationName: "",
  })
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  // Fetch pet data on load
  useEffect(() => {
    const fetchPet = async () => {
      if (!petId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/LostPets/${petId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch pet: ${response.status}`);
        }
        
        const petData = await response.json();
        setPet(petData);
        
        // Set form data
        setPetName(petData.name || "");
        setDescription(petData.description || "");
        setDateLost(new Date(petData.lastSeenDateTime).toISOString().split('T')[0]);
        setExistingImages(petData.images || []);
        
        // Set location
        if (petData.lastSeenLocation) {
          setLocation({
            address: petData.locationName || "",
            latitude: petData.lastSeenLocation.latitude,
            longitude: petData.lastSeenLocation.longitude,
            locationName: petData.locationName || "",
          });
        }
      } catch (err) {
        console.error('Error fetching pet:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPet();
  }, [petId]);

  // Initialize map
  useEffect(() => {
    if (typeof window !== "undefined" && mapRef.current && !mapInstanceRef.current) {
      const initMap = async () => {
        const L = (await import("leaflet")).default
        
        // Import Leaflet CSS
        import("leaflet/dist/leaflet.css")
        
        // Create map instance
        const map = L.map(mapRef.current!).setView([40.7128, -74.006], 13)
        mapInstanceRef.current = map
        
        // Add tile layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)
        
        // Add click handler to map
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng
          
          // Update location state
          setLocation(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }))
          
          // Update marker
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            markerRef.current = L.marker([lat, lng]).addTo(map)
          }
        })
        
        setMapLoaded(true)
      }
      
      initMap()
    }
  }, [])

  // Update map when location changes from API data
  useEffect(() => {
    if (mapInstanceRef.current && location.latitude && location.longitude) {
      import("leaflet").then(L => {
        const map = mapInstanceRef.current
        
        // Center map on location
        map.setView([location.latitude, location.longitude], 15)
        
        // Add or update marker
        if (markerRef.current) {
          markerRef.current.setLatLng([location.latitude, location.longitude])
        } else {
          markerRef.current = L.default.marker([location.latitude, location.longitude]).addTo(map)
        }
      })
    }
  }, [location.latitude, location.longitude, mapLoaded])

  // Format image URL
  const formatImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  // Handle image upload
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)
      setImages(prev => [...prev, ...newFiles])
      
      // Create URLs for preview
      const newUrls = newFiles.map(file => URL.createObjectURL(file))
      setImageUrls(prev => [...prev, ...newUrls])
    }
  }

  // Remove uploaded image
  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(imageUrls[index])
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  // Remove existing image
  const handleRemoveExistingImage = (fileId: string) => {
    setExistingImages(prev => prev.filter(img => img.fileId !== fileId));
    setImagesToDelete(prev => [...prev, fileId]);
  }

  // Handle location search
  const handleLocationSearch = async (query: string) => {
    if (!query.trim()) {
      setLocationSuggestions([])
      setShowSuggestions(false)
      return
    }
    
    setIsSearchingLocation(true)
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setLocationSuggestions(data)
      setShowSuggestions(true)
    } catch (error) {
      console.error("Error searching for location:", error)
      toast({
        title: "Location Search Failed",
        description: "Could not search for locations. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSearchingLocation(false)
    }
  }

  const handleLocationSelect = (suggestion: any) => {
    const lat = parseFloat(suggestion.lat)
    const lon = parseFloat(suggestion.lon)
    
    setLocation({
      address: suggestion.display_name,
      latitude: lat,
      longitude: lon,
      locationName: suggestion.display_name.split(',')[0].trim()
    })
    
    setShowSuggestions(false)
    
    // Update map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 15)
      
      // Add or update marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon])
      } else {
        const L = require("leaflet")
        markerRef.current = L.marker([lat, lon]).addTo(mapInstanceRef.current)
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form data
    if (!petName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your pet's name",
        variant: "destructive"
      })
      return
    }
    
    if (!location.latitude || !location.longitude) {
      toast({
        title: "Missing Location",
        description: "Please select a location on the map where your pet was last seen",
        variant: "destructive"
      })
      return
    }
    
    if (!dateLost) {
      toast({
        title: "Missing Date",
        description: "Please enter the date when your pet was lost",
        variant: "destructive"
      })
      return
    }
    
    if (existingImages.length === 0 && images.length === 0) {
      toast({
        title: "No Images",
        description: "Please upload at least one photo of your pet",
        variant: "destructive"
      })
      return
    }
    
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to update a lost pet report",
        variant: "destructive"
      })
      router.push('/login?redirect=lost/edit/' + petId)
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Create FormData for multipart/form-data request
      const formData = new FormData()
      formData.append('Id', petId)
      formData.append('Name', petName)
      formData.append('Description', description)
      formData.append('LastSeenLatitude', location.latitude.toString())
      formData.append('LastSeenLongitude', location.longitude.toString())
      formData.append('LastSeenDateTime', new Date(dateLost).toISOString())
      formData.append('LocationName', location.locationName || location.address.split(',')[0])
      
      // Append all new images to the formData
      images.forEach(image => {
        formData.append('Images', image)
      })
      
      // Append image IDs to delete
      imagesToDelete.forEach(id => {
        formData.append('ImagesToDelete', id)
      })
      
      // Submit form data to API
      const response = await fetch(`${API_BASE_URL}/LostPets/${petId}`, {
        method: 'PUT',
        headers: {
          'accept': 'text/plain',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to update report: ${errorText}`)
      }
      
      // Show success message and redirect
      toast({
        title: "Report Updated",
        description: "Your lost pet report has been updated successfully",
        variant: "default"
      })
      
      // Redirect to pet page
      router.push(`/pet/${petId}`)
      
    } catch (error) {
      console.error('Error updating lost pet report:', error)
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 bg-pet-soft/30">
          <div className="container px-4 py-12 md:px-6 md:py-16 lg:py-24">
            <div className="mb-8">
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to profile
              </Link>
            </div>
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-pet-primary" />
                <h2 className="text-2xl font-semibold text-pet-primary mb-2">Loading pet information...</h2>
                <p className="text-muted-foreground">Please wait while we fetch your pet's data.</p>
              </div>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (error || !pet) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 bg-pet-soft/30">
          <div className="container px-4 py-12 md:px-6 md:py-16 lg:py-24">
            <div className="mb-8">
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to profile
              </Link>
            </div>
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-semibold text-red-600 mb-2">Error Loading Pet</h2>
                <p className="text-muted-foreground mb-6">{error || "Could not find the pet you're looking for."}</p>
                <Button onClick={() => router.push('/profile')} className="bg-pet-primary hover:bg-pet-primary/90">
                  Return to Profile
                </Button>
              </div>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        <div className="container px-4 py-12 md:px-6 md:py-16 lg:py-24">
          <div className="mb-8">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to profile
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="border-pet-primary/10 shadow-lg pet-card-hover">
              <CardHeader className="bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-pet-primary/10 p-2 rounded-full">
                    <Heart className="h-5 w-5 text-pet-primary" />
                  </div>
                  <CardTitle className="text-2xl text-pet-primary">Edit Lost Pet Report</CardTitle>
                </div>
                <CardDescription className="text-muted-foreground">
                  Update the information about your lost pet to help others identify them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet-name" className="text-pet-primary font-medium">
                      Pet's Name
                    </Label>
                    <Input
                      id="pet-name"
                      placeholder="Enter your pet's name"
                      className="border-pet-primary/20 focus-visible:ring-pet-primary"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Location Section */}
                  <div className="space-y-2">
                    <Label htmlFor="last-seen" className="text-pet-primary font-medium">
                      Last Seen Location
                    </Label>
                    <div className="relative">
                      <Input
                        id="last-seen"
                        placeholder="Search for a location"
                        className="border-pet-primary/20 focus-visible:ring-pet-primary pr-10"
                        value={location.address}
                        onChange={(e) => {
                          setLocation({ ...location, address: e.target.value });
                          handleLocationSearch(e.target.value);
                        }}
                      />
                      {isSearchingLocation && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-pet-primary" />
                        </div>
                      )}
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                        >
                          {locationSuggestions.map((suggestion) => (
                            <div
                              key={suggestion.place_id}
                              className="cursor-pointer px-4 py-2 hover:bg-pet-soft"
                              onClick={() => handleLocationSelect(suggestion)}
                            >
                              <div className="text-sm">{suggestion.display_name}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Search for an address above or click on the map to pinpoint the exact location where your pet was last seen.
                      </p>
                      <div
                        ref={mapRef}
                        className="h-[300px] w-full pet-map-container"
                        style={{ background: mapLoaded ? "none" : "#f0f7ff" }}
                      >
                        {!mapLoaded && (
                          <div className="flex h-full items-center justify-center">
                            <p className="text-pet-primary">Loading map...</p>
                          </div>
                        )}
                      </div>
                      {location.latitude && location.longitude && (
                        <p className="text-xs text-pet-primary">
                          Selected coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-lost" className="text-pet-primary font-medium">
                      Date Lost
                    </Label>
                    <Input 
                      id="date-lost" 
                      type="date" 
                      className="border-pet-primary/20 focus-visible:ring-pet-primary"
                      value={dateLost}
                      onChange={(e) => setDateLost(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="additional-details" className="text-pet-primary font-medium">
                      Additional Details
                    </Label>
                    <Textarea
                      id="additional-details"
                      placeholder="Any additional information that might help identify your pet (breed, color, size, distinctive features, etc.)"
                      rows={6}
                      className="border-pet-primary/20 focus-visible:ring-pet-primary"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-pet-primary font-medium">Current Photos</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                      {existingImages.map((image) => (
                        <div key={image.fileId} className="relative group">
                          <div className="aspect-square overflow-hidden rounded-md border border-pet-primary/20">
                            <Image
                              src={formatImageUrl(image.fileUrl)}
                              alt="Pet"
                              width={200}
                              height={200}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveExistingImage(image.fileId)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <Label className="text-pet-primary font-medium">Upload New Photos</Label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square overflow-hidden rounded-md border border-pet-primary/20">
                            <Image
                              src={url}
                              alt={`New upload ${index + 1}`}
                              width={200}
                              height={200}
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(index)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <div
                        className="aspect-square flex items-center justify-center rounded-md border-2 border-dashed border-pet-primary/20 cursor-pointer hover:border-pet-primary/40 transition-colors"
                        onClick={handleUploadClick}
                      >
                        <div className="text-center p-4">
                          <div className="mx-auto h-10 w-10 rounded-full bg-pet-soft/50 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5 text-pet-primary"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                              />
                            </svg>
                          </div>
                          <p className="mt-2 text-xs font-medium text-pet-primary">Upload Photo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-pet-primary/10">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-pet-primary hover:bg-pet-primary/90"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Report"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
} 
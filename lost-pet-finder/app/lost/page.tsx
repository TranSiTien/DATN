"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Mail, Phone, Facebook, Instagram, Twitter, MapPin, Heart, Loader2, Search } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { useToast } from "@/components/ui/use-toast"

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5049/api"

// Define location type
type Location = {
  address: string
  latitude: number | null
  longitude: number | null
  locationName: string
}

// Define lost pet response type
interface LostPetResponse {
  id: string
  name: string
  description: string
  lastSeenLocation: {
    latitude: number
    longitude: number
  }
  lastSeenDateTime: string
  status: string
  moderatorFeedback: string | null
  finderId: string
  images: Array<{
    fileId: string
    fileUrl: string
  }>
}

export default function ReportLostPet() {
  const router = useRouter()
  const { toast } = useToast()
  const { token } = useUser()
  
  // Form state
  const [petName, setPetName] = useState("")
  const [description, setDescription] = useState("")
  const [dateLost, setDateLost] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
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

  // Load map scripts
  useEffect(() => {
    if (typeof window !== "undefined" && !window.document.getElementById("leaflet-css")) {
      // Load Leaflet CSS
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      link.crossOrigin = ""
      document.head.appendChild(link)

      // Load Leaflet JS
      const script = document.createElement("script")
      script.id = "leaflet-js"
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      script.crossOrigin = ""
      script.onload = () => setMapLoaded(true)
      document.head.appendChild(script)
    } else if (typeof window !== "undefined" && window.L) {
      setMapLoaded(true)
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (mapLoaded && mapRef.current && typeof window.L !== "undefined") {
      const L = window.L

      if (!mapInstanceRef.current) {
        // Default to a central location (can be adjusted)
        const defaultLat = 40.7128
        const defaultLng = -74.006

        // Create map
        mapInstanceRef.current = L.map(mapRef.current).setView([defaultLat, defaultLng], 13)

        // Add tile layer (OpenStreetMap)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current)

        // Add click handler to map
        mapInstanceRef.current.on("click", async (e: any) => {
          const { lat, lng } = e.latlng

          // Update marker position
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            // Create a custom icon with the pet.primary color
            const customIcon = L.divIcon({
              className: "custom-div-icon",
              html: `<div style="background-color: #4A90E2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })

            markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current)
          }

          // Update location state with coordinates
          setLocation((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }))

          // Perform reverse geocoding to get the address and location name
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            
            if (response.ok) {
              const data = await response.json()
              console.log('Reverse geocoding data:', data)
              if (data && data.display_name) {
                setLocation((prev) => ({
                  ...prev,
                  address: data.display_name,
                  locationName: data.display_name.split(',')[0],
                }))
              }
            } else {
              // Fallback if reverse geocoding fails
              setLocation((prev) => ({
                ...prev,
                address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
                locationName: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              }))
            }
          } catch (error) {
            console.error('Error in reverse geocoding:', error)
            // Fallback if reverse geocoding fails
            setLocation((prev) => ({
              ...prev,
              address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
              locationName: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            }))
          }
        })
      }

      // Clean up on unmount
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
          markerRef.current = null
        }
      }
    }
  }, [mapLoaded])

  // Add click-away listener to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Clean up URL objects when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all object URLs to prevent memory leaks
      imageUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [imageUrls])

  // Handle address change for custom location
  const handleAddressChange = (address: string) => {
    setLocation((prev) => ({ ...prev, address }))
    // No longer triggering search as the user types
  }
  
  // Geocode address to coordinates and search for suggestions
  const searchAddress = async () => {
    if (!location.address) {
      toast({
        title: "Missing Address",
        description: "Please enter an address or location to search",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsSearchingLocation(true)
      // Search for location suggestions first
      const suggestionsResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}&limit=5`)
      
      if (!suggestionsResponse.ok) {
        throw new Error("Geocoding service failed")
      }
      
      const suggestions = await suggestionsResponse.json()
      
      if (suggestions && suggestions.length > 0) {
        // Show suggestions dropdown
        setLocationSuggestions(suggestions)
        setShowSuggestions(true)
        
        // Also use the first result to update the map
        const { lat, lon, display_name } = suggestions[0]
        const latitude = parseFloat(lat)
        const longitude = parseFloat(lon)
        
        // Update location state
        setLocation((prev) => ({
          ...prev,
          latitude,
          longitude,
          locationName: display_name.split(',')[0]
        }))
        
        // Update map and marker
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15)
          
          // Update or create marker
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude])
          } else {
            // Create a custom icon with the pet.primary color
            const L = window.L
            const customIcon = L.divIcon({
              className: "custom-div-icon",
              html: `<div style="background-color: #4A90E2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })

            markerRef.current = L.marker([latitude, longitude], { icon: customIcon }).addTo(mapInstanceRef.current)
          }
        }
        
        toast({
          title: "Location Found",
          description: `Found: ${display_name}`,
          variant: "default"
        })
      } else {
        setLocationSuggestions([])
        setShowSuggestions(false)
        toast({
          title: "Location Not Found",
          description: "We couldn't find that location. Please try a more specific address.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error searching for address:', error)
      setLocationSuggestions([])
      setShowSuggestions(false)
      toast({
        title: "Search Failed",
        description: "Failed to search for the address. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSearchingLocation(false)
    }
  }
  
  // Select a location suggestion
  const selectLocationSuggestion = (suggestion: any) => {
    const latitude = parseFloat(suggestion.lat);
    const longitude = parseFloat(suggestion.lon);
    
    // Get location name from the suggestion
    console.log('Selected suggestion:', suggestion)
    const locationName = suggestion.display_name;
    
    // Log the location name when a suggestion is selected
    console.log('Selected location name:', locationName);
    
    // Update location state with full address, coordinates and location name
    setLocation({
      address: suggestion.display_name,
      latitude,
      longitude,
      locationName,
    });
    
    // Update map view
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 15);
      
      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        const L = window.L;
        const customIcon = L.divIcon({
          className: "custom-div-icon",
          html: `<div style="background-color: #4A90E2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        markerRef.current = L.marker([latitude, longitude], { icon: customIcon }).addTo(mapInstanceRef.current);
      }
    }
    
    // Hide suggestions
    setShowSuggestions(false);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      // Create URLs for the new files only
      const newUrls = newFiles.map(file => URL.createObjectURL(file))
      
      setImages(prevImages => [...prevImages, ...newFiles])
      setImageUrls(prevUrls => [...prevUrls, ...newUrls])
    }
  }
  
  // Handle file removal
  const handleRemoveFile = (fileToRemove: File) => {
    const indexToRemove = images.indexOf(fileToRemove)
    if (indexToRemove !== -1) {
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(imageUrls[indexToRemove])
      
      // Remove the file and URL from state
      setImages(images.filter(file => file !== fileToRemove))
      setImageUrls(prev => prev.filter((_, i) => i !== indexToRemove))
    }
  }
  
  // Trigger file input click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
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
    
    if (images.length === 0) {
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
        description: "Please log in to report a lost pet",
        variant: "destructive"
      })
      router.push('/login?redirect=lost')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Create FormData for multipart/form-data request
      const formData = new FormData()
      formData.append('Name', petName)
      formData.append('Description', description)
      formData.append('LastSeenLatitude', location.latitude.toString())
      formData.append('LastSeenLongitude', location.longitude.toString())
      formData.append('LastSeenDateTime', new Date(dateLost).toISOString())
      formData.append('LocationName', location.locationName || location.address.split(',')[0])
      
      // Append all images to the formData
      images.forEach(image => {
        formData.append('Images', image)
      })
      
      // Submit form data to API
      const response = await fetch(`${API_BASE_URL}/LostPets`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to submit report: ${errorText}`)
      }
      
      const result: LostPetResponse = await response.json()
      
      // Show success message and redirect
      setSubmitSuccess(true)
      toast({
        title: "Report Submitted",
        description: "Your lost pet report has been submitted successfully",
        variant: "default"
      })
      
      // Redirect to pet page after 2 seconds
      setTimeout(() => {
        router.push(`/pet/${result.id}`)
      }, 2000)
      
    } catch (error) {
      console.error('Error submitting lost pet report:', error)
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        <div className="container max-w-3xl px-4 py-12 md:px-6 md:py-16 lg:py-24">
          <div className="mb-8">
            <Link
              href="/lost-options"
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to options
            </Link>
          </div>
          {submitSuccess ? (
            <Card className="border-pet-success/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pet-success/20 to-white">
                <CardTitle className="text-2xl text-pet-success flex items-center gap-2">
                  <Heart className="h-6 w-6 fill-pet-success text-white" />
                  Report Submitted Successfully
                </CardTitle>
                <CardDescription>
                  Your lost pet report has been received. We hope your pet is found soon!
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 text-center">
                <p className="mb-6">You will be redirected to view your pet's page in a moment.</p>
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                >
                  Return to Home
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <Card className="border-pet-primary/10 shadow-lg pet-card-hover">
                <CardHeader className="bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-pet-primary/10 p-2 rounded-full">
                      <Heart className="h-5 w-5 text-pet-primary" />
                    </div>
                    <CardTitle className="text-2xl text-pet-primary">Report a Lost Pet</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    Fill out this form with as much detail as possible to help others identify your pet.
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
                      <div className="flex items-center space-x-2">
                        <Input
                          id="last-seen"
                          placeholder="Address or intersection where pet was last seen"
                          value={location.address}
                          onChange={(e) => handleAddressChange(e.target.value)}
                          className="border-pet-primary/20 focus-visible:ring-pet-primary"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              searchAddress();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                          onClick={searchAddress}
                        >
                          <Search className="h-4 w-4 mr-1" />
                          Search
                        </Button>
                        {location.latitude && location.longitude && (
                          <div className="flex items-center text-sm text-pet-success">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>Pinned</span>
                          </div>
                        )}
                      </div>

                      {/* Suggestions Dropdown */}
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="relative z-50 mt-1"
                          style={{ marginBottom: locationSuggestions.length > 0 ? '200px' : '0' }}
                        >
                          <div className="absolute top-0 left-0 right-0 bg-white border border-pet-primary/20 rounded-md shadow-lg max-h-[300px] overflow-y-auto">
                            {isSearchingLocation ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                                Searching locations...
                              </div>
                            ) : (
                              <>
                                {locationSuggestions.map((suggestion, index) => (
                                  <div
                                    key={index}
                                    className="px-3 py-2 hover:bg-pet-primary/10 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    onClick={() => selectLocationSuggestion(suggestion)}
                                  >
                                    <div className="flex items-start">
                                      <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-pet-primary" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">{suggestion.name || suggestion.display_name.split(',')[0]}</div>
                                        <div className="text-xs text-muted-foreground truncate">{suggestion.display_name}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Map Component */}
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
                      <Label className="text-pet-primary font-medium">Upload Photos</Label>
                      <div 
                        className="flex flex-col items-center justify-center border-2 border-dashed border-pet-primary/20 rounded-lg p-6 bg-pet-soft/50 cursor-pointer"
                        onClick={handleUploadClick}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                        />
                        <Upload className="h-8 w-8 text-pet-primary mb-2" />
                        <p className="text-sm text-pet-primary/80 mb-1">Drag and drop photos here or click to browse</p>
                        <p className="text-xs text-muted-foreground">
                          Upload clear photos of your pet to help with identification
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4 border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUploadClick()
                          }}
                        >
                          Upload Photos
                        </Button>
                      </div>
                      
                      {/* Image Preview */}
                      {imageUrls.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-pet-primary mb-2">Uploaded Photos ({imageUrls.length})</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {imageUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square rounded-md overflow-hidden border border-pet-primary/20">
                                  <img 
                                    src={url} 
                                    alt={`Pet photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="absolute top-1 right-1 bg-white/70 rounded-full p-1 hover:bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveFile(images[index])
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pet-primary">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 bg-gradient-to-r from-white to-pet-soft border-t border-pet-primary/10 py-4">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                    onClick={() => router.push('/lost-options')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-pet-accent hover:bg-pet-accent/90 text-white"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Report"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}


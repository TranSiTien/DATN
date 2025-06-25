"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, Heart, Loader2, Search, MapPin } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/user-context"
import { useToast } from "@/components/ui/use-toast"

// API Base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5049/api"

// Define location type
type LocationType = {
  address: string
  latitude: number | null
  longitude: number | null
  locationName: string
}

// Define found pet response type (adjust as per your API)
interface FoundPetResponse {
  id: string
  // Add other fields from your API response for a found pet
}

// Define the type for the user object from useUser, including contactMethods
interface UserType {
  contactMethods?: Array<{ type: string; value: string }>; // Example structure
  // Add other user properties if needed
}

// Extend Window interface to include L for Leaflet
declare global {
    interface Window {
        L: any; // You can use a more specific type if you have Leaflet type definitions installed
    }
}

export default function ReportFoundPet() {
  const router = useRouter()
  const { toast } = useToast()
  const { token, user } = useUser() as { token: string | null; user: UserType | null };

  // Form state
  const [description, setDescription] = useState("")
  const [dateFound, setDateFound] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Location state
  const [location, setLocation] = useState<LocationType>({
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
  const mapInstanceRef = useRef<any>(null) // leaflet map instance
  const markerRef = useRef<any>(null) // leaflet marker instance

  // Load map scripts
  useEffect(() => {
    if (typeof window !== "undefined" && !window.L && !document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      link.crossOrigin = ""
      document.head.appendChild(link)

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
      const L = window.L;
      if (!mapInstanceRef.current) {
        const defaultLat = 40.7128 // Default to NYC, adjust as needed
        const defaultLng = -74.006
        mapInstanceRef.current = L.map(mapRef.current).setView([defaultLat, defaultLng], 13)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current)

        mapInstanceRef.current.on("click", async (e: any) => { // Using any for LeafletMouseEvent for simplicity if types aren't installed
          const { lat, lng } = e.latlng
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
          } else {
            const customIcon = L.divIcon({
              className: "custom-div-icon",
              html: '<div style="background-color: #F5A623; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })
            markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current!)
          }
          setLocation((prev: LocationType) => ({ ...prev, latitude: lat, longitude: lng }))
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
            if (response.ok) {
              const data = await response.json()
              if (data && data.display_name) {
                setLocation((prev: LocationType) => ({
                  ...prev,
                  address: data.display_name,
                  locationName: data.display_name.split(',')[0] || data.address?.road || data.address?.city || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                }))
              }
            } else {
              setLocation((prev: LocationType) => ({ ...prev, address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`, locationName: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}` }))
            }
          } catch (error) {
            console.error('Error in reverse geocoding:', error)
            setLocation((prev: LocationType) => ({ ...prev, address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`, locationName: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}` }))
          }
        })
      }
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
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Clean up URL objects when component unmounts
  useEffect(() => {
    return () => {
      imageUrls.forEach((url: string) => URL.revokeObjectURL(url))
    }
  }, [imageUrls])

  const handleLocationAddressChange = (address: string) => {
    setLocation((prev: LocationType) => ({ ...prev, address }))
  }

  const searchAddress = async () => {
    if (!location.address) {
      toast({ title: "Missing Address", description: "Please enter an address to search.", variant: "destructive" })
      return
    }
    try {
      setIsSearchingLocation(true)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}&limit=5`)
      if (!response.ok) throw new Error("Geocoding service failed")
      const suggestionsData = await response.json()
      if (suggestionsData && suggestionsData.length > 0) {
        setLocationSuggestions(suggestionsData)
        setShowSuggestions(true)
        const { lat, lon, display_name } = suggestionsData[0]
        const latitude = parseFloat(lat)
        const longitude = parseFloat(lon)
        setLocation((prev: LocationType) => ({ ...prev, latitude, longitude, locationName: display_name.split(',')[0] || display_name }))
        if (mapInstanceRef.current && window.L) {
          const L = window.L;
          mapInstanceRef.current.setView([latitude, longitude], 15)
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude])
          } else {
            const customIcon = L.divIcon({
              className: "custom-div-icon",
              html: '<div style="background-color: #F5A623; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })
            markerRef.current = L.marker([latitude, longitude], { icon: customIcon }).addTo(mapInstanceRef.current)
          }
        }
        toast({ title: "Location Found", description: `Found: ${display_name}`, variant: "default" })
      } else {
        setLocationSuggestions([])
        setShowSuggestions(false)
        toast({ title: "Location Not Found", description: "We couldn't find that location. Please try a more specific address or click on the map.", variant: "destructive" })
      }
    } catch (error) {
      console.error('Error searching address:', error)
      setLocationSuggestions([])
      setShowSuggestions(false)
      toast({ title: "Search Failed", description: "Failed to search for the address.", variant: "destructive" })
    } finally {
      setIsSearchingLocation(false)
    }
  }

  const selectLocationSuggestion = (suggestion: any) => {
    const latitude = parseFloat(suggestion.lat)
    const longitude = parseFloat(suggestion.lon)
    const locationName = suggestion.display_name.split(',')[0] || suggestion.display_name
    setLocation({ address: suggestion.display_name, latitude, longitude, locationName })
    if (mapInstanceRef.current && window.L) {
      const L = window.L;
      mapInstanceRef.current.setView([latitude, longitude], 15)
      if (markerRef.current) markerRef.current.setLatLng([latitude, longitude])
      else {
        const customIcon = L.divIcon({
            className: "custom-div-icon",
            html: '<div style="background-color: #F5A623; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
        })
        markerRef.current = L.marker([latitude, longitude], { icon: customIcon }).addTo(mapInstanceRef.current)
      }
    }
    setShowSuggestions(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      const newUrls = newFiles.map(file => URL.createObjectURL(file))
      setImages((prevImages: File[]) => [...prevImages, ...newFiles])
      setImageUrls((prevUrls: string[]) => [...prevUrls, ...newUrls])
    }
  }

  const handleRemoveFile = (fileToRemove: File) => {
    const indexToRemove = images.indexOf(fileToRemove)
    if (indexToRemove !== -1) {
      URL.revokeObjectURL(imageUrls[indexToRemove])
      setImages((prevImages: File[]) => prevImages.filter((_, i: number) => i !== indexToRemove))
      setImageUrls((prevUrls: string[]) => prevUrls.filter((_, i: number) => i !== indexToRemove))
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!location.latitude || !location.longitude) {
      toast({ title: "Missing Location", description: "Please select the location where the pet was found.", variant: "destructive" })
      return
    }
    if (!dateFound) {
      toast({ title: "Missing Date", description: "Please enter the date when the pet was found.", variant: "destructive" })
      return
    }
    if (images.length === 0) {
      toast({ title: "No Images", description: "Please upload at least one photo of the pet.", variant: "destructive" })
      return
    }
    if (!token) {
      toast({ title: "Authentication Required", description: "Please log in to report a found pet.", variant: "destructive" })
      router.push('/login?redirect=found')
      return
    }

    console.log("User object in handleSubmit:", user);
    const hasContactMethods = user?.contactMethods && user.contactMethods.length > 0
    console.log("hasContactMethods:", hasContactMethods);

    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('Description', description)
    formData.append('FoundLatitude', location.latitude.toString())
    formData.append('FoundLongitude', location.longitude.toString())
    formData.append('FoundDateTime', new Date(dateFound).toISOString())
    formData.append('LocationName', location.locationName || location.address.split(',')[0])
    images.forEach((image: File) => formData.append('Images', image))

    try {
      console.log("Submitting Found Pet report with FormData:", formData); // Log FormData before sending
      const response = await fetch(`${API_BASE_URL}/FoundPets`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'accept': 'application/json' // Note: LostPets used 'text/plain'. Verify if FoundPets server expects JSON or text.
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to submit report: ${errorText || response.status}`)
      }

      const result: FoundPetResponse = await response.json()
      setSubmitSuccess(true)
      toast({ title: "Report Submitted", description: "Thank you for reporting the found pet!", variant: "default" })
      setTimeout(() => {
        router.push(result.id ? `/pet/${result.id}` : '/') // Redirect to pet page if ID exists, else home
      }, 2000)

    } catch (error: any) {
      console.error('Error submitting found pet report:', error)
      toast({ title: "Submission Failed", description: error.message || "An unknown error occurred.", variant: "destructive" })
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
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          {submitSuccess ? (
            <Card className="border-pet-success/30 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pet-success/20 to-white">
                <CardTitle className="text-2xl text-pet-success flex items-center gap-2">
                  <Heart className="h-6 w-6 fill-pet-success text-white" />
                  Report Submitted Successfully!
                </CardTitle>
                <CardDescription>
                  Thank you for helping reunite this pet. Your report has been received.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 text-center">
                <p className="mb-6">You will be redirected shortly.</p>
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
                <CardHeader className="bg-gradient-to-r from-pet-warm to-white border-b border-pet-primary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-pet-accent/10 p-2 rounded-full">
                      <Heart className="h-5 w-5 text-pet-accent" />
                    </div>
                    <CardTitle className="text-2xl text-pet-accent">Report a Found Pet</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    Fill out this form with as much detail as possible to help reunite this pet with their owner.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-4">
                    {/* Location Section */}
                    <div className="space-y-2">
                      <Label htmlFor="found-location-address" className="text-pet-primary font-medium">
                        Found Location
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="found-location-address"
                          placeholder="Address or intersection where pet was found"
                          value={location.address}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLocationAddressChange(e.target.value)}
                          className="border-pet-primary/20 focus-visible:ring-pet-primary"
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              searchAddress()
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-pet-accent/30 text-pet-accent hover:bg-pet-accent/10"
                          onClick={searchAddress}
                          disabled={isSearchingLocation}
                        >
                          {isSearchingLocation ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                          Search
                        </Button>
                        {location.latitude && location.longitude && (
                          <div className="flex items-center text-sm text-pet-success">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>Pinned</span>
                          </div>
                        )}
                      </div>

                      {showSuggestions && locationSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="relative z-10 mt-1"
                          style={{ marginBottom: locationSuggestions.length > 0 ? '150px' : '0' }}
                        >
                          <div className="absolute top-0 left-0 right-0 bg-white border border-pet-primary/20 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                            {isSearchingLocation ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                                Searching...
                              </div>
                            ) : (
                              locationSuggestions.map((suggestion: any, index: number) => (
                                <div
                                  key={suggestion.place_id || index} // Use a stable key like place_id if available
                                  className="px-3 py-2 hover:bg-pet-primary/10 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onClick={() => selectLocationSuggestion(suggestion)}
                                >
                                  <div className="flex items-start">
                                    <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-pet-accent" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm">{suggestion.name || suggestion.display_name.split(',')[0]}</div>
                                      <div className="text-xs text-muted-foreground truncate">{suggestion.display_name}</div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Search for an address or click on the map to pinpoint the exact location.
                        </p>
                        <div
                          ref={mapRef}
                          className="h-[300px] w-full pet-map-container rounded-md border border-pet-primary/20"
                          style={{ background: mapLoaded ? "transparent" : "#e6effc" }}
                        >
                          {!mapLoaded && (
                            <div className="flex h-full items-center justify-center">
                              <Loader2 className="h-6 w-6 text-pet-accent animate-spin mr-2" />
                              <p className="text-pet-accent">Loading map...</p>
                            </div>
                          )}
                        </div>
                        {location.latitude && location.longitude && (
                          <p className="text-xs text-pet-primary">
                            Selected: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date-found" className="text-pet-primary font-medium">
                        Date Found
                      </Label>
                      <Input
                        id="date-found"
                        type="date"
                        className="border-pet-primary/20 focus-visible:ring-pet-primary"
                        value={dateFound}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFound(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-pet-primary font-medium">
                        Additional Details
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the pet (type, breed, color, size, distinctive features) and any other information that might help identify the pet's owner"
                        rows={6}
                        className="border-pet-primary/20 focus-visible:ring-pet-primary"
                        value={description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-pet-primary font-medium">Upload Photos</Label>
                      <div
                        className="flex flex-col items-center justify-center border-2 border-dashed border-pet-primary/20 rounded-lg p-6 bg-pet-warm/50 cursor-pointer hover:border-pet-accent"
                        onClick={handleUploadClick}
                        onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                          e.preventDefault();
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            const newFiles = Array.from(e.dataTransfer.files);
                            const newUrls = newFiles.map(file => URL.createObjectURL(file));
                            setImages((prevImages: File[]) => [...prevImages, ...newFiles]);
                            setImageUrls((prevUrls: string[]) => [...prevUrls, ...newUrls]);
                            e.dataTransfer.clearData();
                          }
                        }}
                        onDragOver={(e: React.DragEvent<HTMLDivElement>) => e.preventDefault()} // Necessary for onDrop to work
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                        />
                        <Upload className="h-8 w-8 text-pet-accent mb-2" />
                        <p className="text-sm text-pet-accent/80 mb-1">Drag and drop photos here or click to browse</p>
                        <p className="text-xs text-muted-foreground">
                          Upload clear photos of the pet
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4 border-pet-accent/30 text-pet-accent hover:bg-pet-accent/10"
                           onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation()
                            handleUploadClick()
                          }}
                        >
                          Upload Photos
                        </Button>
                      </div>

                      {imageUrls.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-pet-primary mb-2">Uploaded Photos ({imageUrls.length})</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {imageUrls.map((url: string, index: number) => (
                              <div key={url} className="relative group aspect-square">
                                <img
                                  src={url}
                                  alt={`Uploaded pet photo ${index + 1}`}
                                  className="w-full h-full object-cover rounded-md border border-pet-primary/20"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-1 right-1 bg-white/70 hover:bg-white rounded-full p-1 h-auto text-pet-primary focus:outline-none focus:ring-2 focus:ring-pet-accent"
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation()
                                    handleRemoveFile(images[index])
                                  }}
                                  aria-label={`Remove image ${index + 1}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 bg-gradient-to-r from-white to-pet-warm border-t border-pet-primary/10 py-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                    onClick={() => router.push('/')}
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
    </div>
  )
}


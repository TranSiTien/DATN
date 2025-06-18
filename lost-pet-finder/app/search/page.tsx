"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Upload, Search, Sliders, MapPin, Calendar, Filter, Loader2, Image as ImageIcon, ListChecks } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useUser } from "@/contexts/user-context"
import { PetCard } from "@/components/pet-card"
import { useToast } from "@/components/ui/use-toast"

// Base URL from environment variable
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:5049"
const API_BASE_URL = `${BASE_URL}/api`

// Interface for base pet data (common fields)
interface BasePet {
  id: string;
  description: string;
  locationName?: string;
  status: string;
  moderatorFeedback: string | null;
  images: Array<{
    fileId: string;
    fileUrl: string;
  }>;
  similarityScore?: number; // Optional, for image search results
}

// Interface for Lost Pet data
interface LostPetData extends BasePet {
  name: string; // Lost pets usually have a name
  lastSeenLocation: { latitude: number; longitude: number };
  lastSeenDateTime: string;
  finderId?: string;
}

// Interface for Found Pet data (adjust fields as per your API for found pets)
interface FoundPetData extends BasePet {
  name?: string; // Name might be unknown or given by the finder
  foundLocation: { latitude: number; longitude: number };
  foundDateTime: string;
  // Add other found-pet specific fields if any, e.g., currentPetLocationType
}

// Union type for search results
type SearchResultPet = LostPetData | FoundPetData;

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token } = useUser()
  const { toast } = useToast()
  
  const shouldUpload = searchParams.get("upload") === "true"
  
  // State
  const [searchType, setSearchType] = useState<"lost" | "found">("lost") // New state for search type
  const [searchImage, setSearchImage] = useState<File | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResultPet[]>([])
  const [showFilters, setShowFilters] = useState(true)
  
  // Filter state
  const [distanceRadius, setDistanceRadius] = useState<number>(10)
  const [customDistance, setCustomDistance] = useState<string>("10")
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null)
  const [customLocation, setCustomLocation] = useState<{address: string, latitude: number | null, longitude: number | null}>({
    address: "",
    latitude: null,
    longitude: null
  })
  const [locationType, setLocationType] = useState<"current" | "custom">("current")
  const [fromDate, setFromDate] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })
  
  const [useImageSearch, setUseImageSearch] = useState(shouldUpload || false)
  const [useLocationAndDistanceFilter, setUseLocationAndDistanceFilter] = useState(true)
  const [useDateFilter, setUseDateFilter] = useState(true)
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Map state
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const currentMapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const currentMapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const currentMarkerRef = useRef<any>(null)
  const radiusCircleRef = useRef<any>(null)
  const currentRadiusCircleRef = useRef<any>(null)

  // Get user's current location when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          toast({
            title: "Location Access Denied",
            description: "Please enable location access for better search results or enter location manually.",
            variant: "destructive"
          })
          setCurrentLocation({ latitude: 0, longitude: 0 }) // Fallback
        }
      )
    }
  }, [toast])
  
  useEffect(() => {
    if (shouldUpload) {
      setUseImageSearch(true)
      const fileInput = document.getElementById('image-upload') as HTMLInputElement
      if (fileInput) {
        setTimeout(() => fileInput.click(), 500)
      }
    }
  }, [shouldUpload])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).L && !document.getElementById("leaflet-css")) {
      const link = document.createElement("link"); link.id = "leaflet-css"; link.rel = "stylesheet"; link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="; link.crossOrigin = ""; document.head.appendChild(link);
      const script = document.createElement("script"); script.id = "leaflet-js"; script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="; script.crossOrigin = ""; script.onload = () => setMapLoaded(true); document.head.appendChild(script);
    } else if (typeof window !== "undefined" && (window as any).L) setMapLoaded(true);
  }, [])

  // Initialize custom location map
  useEffect(() => {
    if (mapLoaded && mapRef.current && typeof (window as any).L !== "undefined" && locationType === "custom") {
      const L = (window as any).L;
      if (!mapInstanceRef.current) {
        const defaultLat = 40.7128, defaultLng = -74.006;
        mapInstanceRef.current = L.map(mapRef.current).setView([defaultLat, defaultLng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(mapInstanceRef.current);
        mapInstanceRef.current.on("click", async (e: any) => {
          const { lat, lng } = e.latlng;
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          else markerRef.current = L.marker([lat, lng], { icon: L.divIcon({ className: "custom-div-icon", html: '<div style="background-color: #4A90E2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>', iconSize: [30,30], iconAnchor: [15,15] }) }).addTo(mapInstanceRef.current);
          setCustomLocation(prev => ({ ...prev, latitude: lat, longitude: lng }));
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) setCustomLocation(prev => ({ ...prev, address: data.display_name }));
            }
          } catch (error) { console.error('Error in reverse geocoding:', error); }
        });
      }
      return () => { if (mapInstanceRef.current && locationType !== "custom") { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markerRef.current = null; } };
    }
  }, [mapLoaded, locationType]);

  // Initialize current location map
  useEffect(() => {
    if (mapLoaded && currentMapRef.current && typeof (window as any).L !== "undefined" && locationType === "current" && currentLocation) {
      const L = (window as any).L;
      if (!currentMapInstanceRef.current) {
        const { latitude, longitude } = currentLocation;
        currentMapInstanceRef.current = L.map(currentMapRef.current).setView([latitude, longitude], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(currentMapInstanceRef.current);
        currentMarkerRef.current = L.marker([latitude, longitude], { icon: L.divIcon({ className: "custom-div-icon", html: '<div style="background-color: #4A90E2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>', iconSize: [30,30], iconAnchor: [15,15] }) }).addTo(currentMapInstanceRef.current).bindPopup("Your current location").openPopup();
        const circleOptions = { color: '#4A90E2', fillColor: '#4A90E2', fillOpacity: 0.15, weight: 2 };
        currentRadiusCircleRef.current = L.circle([latitude, longitude], distanceRadius * 1000, circleOptions).addTo(currentMapInstanceRef.current);
        currentMapInstanceRef.current.fitBounds(currentRadiusCircleRef.current.getBounds());
      }
      return () => { if (currentMapInstanceRef.current && locationType !== "current") { currentMapInstanceRef.current.remove(); currentMapInstanceRef.current = null; currentMarkerRef.current = null; currentRadiusCircleRef.current = null; } };
    }
  }, [mapLoaded, locationType, currentLocation, distanceRadius]);

  // Update radius circle on current location map
  useEffect(() => {
    if (currentMapInstanceRef.current && currentLocation && currentRadiusCircleRef.current) {
      currentRadiusCircleRef.current.setRadius(distanceRadius * 1000);
      currentMapInstanceRef.current.fitBounds(currentRadiusCircleRef.current.getBounds());
    }
  }, [distanceRadius, currentLocation]);

  // Update or create radius circle on custom map
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current && (customLocation.latitude && customLocation.longitude)) {
      const L = (window as any).L;
      if (radiusCircleRef.current) { radiusCircleRef.current.remove(); radiusCircleRef.current = null; }
      const circleOptions = { color: '#4A90E2', fillColor: '#4A90E2', fillOpacity: 0.15, weight: 2 };
      radiusCircleRef.current = L.circle([customLocation.latitude, customLocation.longitude], distanceRadius * 1000, circleOptions).addTo(mapInstanceRef.current);
      mapInstanceRef.current.fitBounds(radiusCircleRef.current.getBounds());
    }
  }, [mapLoaded, distanceRadius, customLocation.latitude, customLocation.longitude]);

  const handleAddressChange = (address: string) => {
    setCustomLocation(prev => ({ ...prev, address }));
  };
  
  const searchForLocationSuggestions = async (query: string) => {
    if (query.length < 3) return;
    try {
      setIsSearchingLocation(true);
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      if (!response.ok) throw new Error("Geocoding service failed");
      const data = await response.json();
      if (data && data.length > 0) { setLocationSuggestions(data); setShowSuggestions(true); }
      else { setLocationSuggestions([]); setShowSuggestions(false); }
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      setLocationSuggestions([]);
    } finally { setIsSearchingLocation(false); }
  };
  
  const selectLocationSuggestion = (suggestion: any) => {
    const latitude = parseFloat(suggestion.lat);
    const longitude = parseFloat(suggestion.lon);
    setCustomLocation({ address: suggestion.display_name, latitude, longitude });
    setShowSuggestions(false);
    if (mapInstanceRef.current && (window as any).L) {
      const L = (window as any).L;
      mapInstanceRef.current.setView([latitude, longitude], 15);
      if (markerRef.current) markerRef.current.setLatLng([latitude, longitude]);
      else markerRef.current = L.marker([latitude, longitude], { icon: L.divIcon({ className: "custom-div-icon", html: '<div style="background-color: #4A90E2; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>', iconSize: [30,30], iconAnchor: [15,15] }) }).addTo(mapInstanceRef.current);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSearchImage(e.target.files[0]);
    }
  }
  
  const handleSearch = async () => {
    if (!token) {
      toast({ title: "Authentication Required", description: "Please log in to search pets", variant: "default" })
      router.push(`/login?returnUrl=${encodeURIComponent('/search')}`)
      return
    }
    
    if (useImageSearch && !searchImage) {
      toast({ title: "Image Required", description: `Please upload an image to search for similar ${searchType} pets`, variant: "destructive" })
      return
    }
    
    setIsSearching(true)
    setSearchResults([]) // Clear previous results
    
    // Determine API endpoint based on searchType
    const endpointSuffix = searchType === 'lost' ? 'LostPets' : 'FoundPets';
    let apiEndpoint = `${API_BASE_URL}/${endpointSuffix}`;
    const imageSearchApiEndpoint = `${apiEndpoint}/search`; // Assuming /search for image based search on both

    try {
      if (useImageSearch && searchImage) {
        const formData = new FormData()
        formData.append('SearchImage', searchImage) // API should be designed to handle this param name
        
        if (useLocationAndDistanceFilter) {
          const loc = locationType === "current" ? currentLocation : customLocation;
          if (loc?.latitude && loc?.longitude && (loc.latitude !== 0 || loc.longitude !== 0)) {
            formData.append('Latitude', loc.latitude.toString())
            formData.append('Longitude', loc.longitude.toString())
          }
          const distance = parseInt(customDistance, 10);
          if (!isNaN(distance) && distance > 0) formData.append('DistanceInKilometers', distance.toString());
          else formData.append('DistanceInKilometers', '1000'); // Default large radius for image search if not specified
        }
        
        if (useDateFilter) {
          if(fromDate) formData.append('FromDate', new Date(fromDate).toISOString());
          if(toDate) formData.append('ToDate', new Date(toDate).toISOString());
        }
        
        const response = await fetch(imageSearchApiEndpoint, {
          method: 'POST',
          // headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` }, // Changed from text/plain, ensure backend handles JSON for image search response
          headers: { 'Authorization': `Bearer ${token}` }, // Simpler headers, accept might not be needed if server flexible or FormData implies content type
          body: formData
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to search ${searchType} pets by image: ${errorText || response.status}`)
        }
        
        const results: SearchResultPet[] = await response.json();
        const sortedResults = [...results].sort((a, b) => (a.similarityScore ?? Infinity) - (b.similarityScore ?? Infinity));
        setSearchResults(sortedResults);
        toast({ title: `${results.length} ${searchType === 'lost' ? 'Lost' : 'Found'} Pets Found`, description: results.length > 0 ? "Results sorted by similarity" : "No similar pets found.", variant: "default" });

      } else {
        const params = new URLSearchParams()
        if (useLocationAndDistanceFilter) {
          const loc = locationType === "current" ? currentLocation : customLocation;
          if (loc?.latitude && loc?.longitude && (loc.latitude !== 0 || loc.longitude !== 0)) {
            params.append('latitude', loc.latitude.toString());
            params.append('longitude', loc.longitude.toString());
          }
          const distance = parseInt(customDistance, 10);
          if (!isNaN(distance) && distance > 0) params.append('distanceInKilometers', distance.toString());
        }
        
        if (useDateFilter) {
          const defaultFromDate = new Date(); defaultFromDate.setDate(defaultFromDate.getDate() - 30);
          const defaultFromStr = defaultFromDate.toISOString().split('T')[0];
          const defaultToStr = new Date().toISOString().split('T')[0];

          if (fromDate && fromDate !== defaultFromStr) params.append('fromDate', new Date(fromDate).toISOString());
          if (toDate && toDate !== defaultToStr) params.append('toDate', new Date(toDate).toISOString());
        }
        
        const response = await fetch(`${apiEndpoint}?${params.toString()}`, {
          method: 'GET',
          headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` }
        })
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to search ${searchType} pets: ${errorText || response.status}`)
        }
        
        const results: SearchResultPet[] = await response.json();
        setSearchResults(results);
        toast({ title: `${results.length} ${searchType === 'lost' ? 'Lost' : 'Found'} Pets Found`, description: "Review results below.", variant: "default" });
      }
    } catch (error) {
      console.error(`Error searching ${searchType} pets:`, error);
      toast({ title: "Search Failed", description: error instanceof Error ? error.message : "An unknown error occurred", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        <div className="container px-4 py-12 md:px-6 md:py-16 lg:py-24">
          <div className="mb-8">
            <Link
              href={searchType === 'lost' ? "/lost-options" : "/found-options"} // Dynamic back link
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {searchType === 'lost' ? 'Lost Pet Options' : 'Found Pet Options'}
            </Link>
          </div>

          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tighter text-center text-pet-primary sm:text-4xl md:text-5xl mb-6">
              Search for {searchType === 'lost' ? 'Your Lost Pet' : 'Reported Found Pets'}
            </h1>
            <p className="text-center text-muted-foreground mb-8 md:text-lg">
              {searchType === 'lost' 
                ? "Search for found pets that match your lost pet's description and location."
                : "Browse pets that have been reported as found by others."
              }
            </p>

            <Card className="mb-8 border-pet-primary/20 shadow-md">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-pet-primary">Search Filters</h2>
                    <Button type="button" variant="ghost" size="sm" className="text-pet-primary hover:bg-pet-primary/10" onClick={() => setShowFilters(!showFilters)}>
                      <Sliders className="h-4 w-4 mr-2" />
                      {showFilters ? "Hide Filters" : "Show Filters"}
                    </Button>
                  </div>
                  
                  {showFilters && (
                    <div className="space-y-6 pt-4 pb-2 border-t border-pet-primary/10">
                      {/* Search Type Selection */}
                      <div className="space-y-3">
                        <Label className="text-pet-primary font-medium flex items-center">
                          <ListChecks className="h-4 w-4 mr-2" />
                           I am searching for a...
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={searchType === "lost" ? "default" : "outline"}
                            onClick={() => setSearchType("lost")}
                            className={`flex-1 ${searchType === "lost" ? "bg-pet-primary hover:bg-pet-primary/90 text-white" : "border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"}`}
                          >
                            Lost Pet
                          </Button>
                          <Button
                            type="button"
                            variant={searchType === "found" ? "default" : "outline"}
                            onClick={() => setSearchType("found")}
                            className={`flex-1 ${searchType === "found" ? "bg-pet-accent hover:bg-pet-accent/90 text-white" : "border-pet-accent/30 text-pet-accent hover:bg-pet-accent/10"}`}
                          >
                            Found Pet
                          </Button>
                        </div>
                      </div>

                      {/* Image Search Filter */}
                      <div className="space-y-4 pt-4 border-t border-pet-primary/10">
                        <div className="flex justify-between items-center">
                          <Label className="text-pet-primary font-medium flex items-center">
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Image Search (for {searchType === 'lost' ? 'Lost Pets' : 'Found Pets'})
                          </Label>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="use-image-search" checked={useImageSearch} onChange={(e) => setUseImageSearch(e.target.checked)} className="form-checkbox h-4 w-4 text-pet-primary" />
                            <Label htmlFor="use-image-search" className="text-sm text-pet-primary">Enable</Label>
                          </div>
                        </div>
                        
                        {useImageSearch && (
                          <div className="py-4 px-4 bg-pet-soft/20 rounded-lg">
                            <div className="text-center mb-4">
                              <p className="text-sm text-muted-foreground mb-4">
                                Upload a clear photo of {searchType === 'lost' ? 'your lost pet' : 'the pet you found'} for image-based search.
                              </p>
                              {searchImage ? (
                                <div className="mb-4">
                                  <div className="relative mx-auto w-64 h-64 rounded-lg overflow-hidden border-2 border-pet-primary">
                                    <Image src={URL.createObjectURL(searchImage)} alt="Search image" fill className="object-cover" />
                                  </div>
                                  <Button type="button" variant="outline" size="sm" className="mt-4 border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10" onClick={() => setSearchImage(null)}>
                                    Remove Image
                                  </Button>
                                </div>
                              ) : (
                                <div className="mx-auto w-64 h-64 border-2 border-dashed border-pet-primary/30 rounded-lg flex flex-col items-center justify-center bg-white/50 cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
                                  <Upload className="h-12 w-12 text-pet-primary/50 mb-4" />
                                  <p className="text-pet-primary/70 mb-2">Click to upload an image</p>
                                  <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                                </div>
                              )}
                              <input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Location and Distance Filter Section */}
                      <div className="space-y-3 pt-4 border-t border-pet-primary/10">
                        <div className="flex justify-between items-center">
                          <Label className="text-pet-primary font-medium flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            Location and Distance Filter
                          </Label>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="use-location-distance-filter" checked={useLocationAndDistanceFilter} onChange={(e) => setUseLocationAndDistanceFilter(e.target.checked)} className="form-checkbox h-4 w-4 text-pet-primary" />
                            <Label htmlFor="use-location-distance-filter" className="text-sm text-pet-primary">Enable</Label>
                          </div>
                        </div>
                        <fieldset disabled={!useLocationAndDistanceFilter} className={!useLocationAndDistanceFilter ? "opacity-60" : ""}>
                          <div className="flex gap-4 mb-3">
                            <Button type="button" variant={locationType === "current" ? "default" : "outline"} size="sm" onClick={() => setLocationType("current")} className={`flex-1 ${locationType === "current" ? "bg-pet-primary hover:bg-pet-primary/90 text-white" : "border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"}`}>
                              <MapPin className="h-4 w-4 mr-1" /> Current Location
                            </Button>
                            <Button type="button" variant={locationType === "custom" ? "default" : "outline"} size="sm" onClick={() => setLocationType("custom")} className={`flex-1 ${locationType === "custom" ? "bg-pet-primary hover:bg-pet-primary/90 text-white" : "border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"}`}>
                              <Search className="h-4 w-4 mr-1" /> Custom Location
                            </Button>
                          </div>
                          {locationType === "current" ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-pet-primary" />
                                {currentLocation ? (<span>Using your current location: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}</span>) : (<span className="text-pet-warning">Waiting for location...</span>)}
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Map shows current location and search radius</p>
                                <div ref={currentMapRef} className="h-[200px] w-full rounded-md border border-pet-primary/20" style={{ background: mapLoaded && currentLocation ? "transparent" : "#f0f7ff" }}>
                                  {(!mapLoaded || !currentLocation) && (<div className="flex h-full items-center justify-center"><p className="text-pet-primary">{!mapLoaded ? "Loading map..." : "Waiting for location..."}</p></div>)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Input placeholder="Enter address or location" value={customLocation.address} onChange={(e) => handleAddressChange(e.target.value)} className="border-pet-primary/20 focus-visible:ring-pet-primary pr-10" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchForLocationSuggestions(customLocation.address); } }} />
                                <Button type="button" variant="outline" size="sm" className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10" onClick={() => searchForLocationSuggestions(customLocation.address)}><Search className="h-4 w-4 mr-1" />Search</Button>
                              </div>
                              {showSuggestions && locationSuggestions.length > 0 && (
                                <div ref={suggestionsRef} className="relative" style={{ marginBottom: "200px", zIndex: 1000 }}>
                                  <div className="absolute top-0 left-0 right-0 bg-white border border-pet-primary/20 rounded-md shadow-lg max-h-[150px] overflow-y-auto">
                                    {isSearchingLocation ? (<div className="p-3 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />Searching...</div>) : (locationSuggestions.map((suggestion, index) => (
                                      <div key={suggestion.place_id || index} className="px-3 py-2 hover:bg-pet-primary/10 cursor-pointer border-b border-gray-100 last:border-b-0" onClick={() => selectLocationSuggestion(suggestion)}>
                                        <div className="flex items-start">
                                          <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0 text-pet-primary" />
                                          <div>
                                            <div className="font-medium text-sm">{suggestion.name || suggestion.display_name.split(',')[0]}</div>
                                            <div className="text-xs text-muted-foreground truncate">{suggestion.display_name}</div>
                                          </div>
                                        </div>
                                      </div>
                                    )))}
                                  </div>
                                </div>
                              )}
                              <div className="mt-3 space-y-2">
                                <p className="text-sm text-muted-foreground">Search address or click map to pinpoint location.</p>
                                <div ref={mapRef} className="h-[200px] w-full rounded-md border border-pet-primary/20" style={{ background: mapLoaded ? "transparent" : "#f0f7ff" }}>
                                  {!mapLoaded && (<div className="flex h-full items-center justify-center"><p className="text-pet-primary">Loading map...</p></div>)}
                                </div>
                              </div>
                              {customLocation.latitude && customLocation.longitude && (<p className="text-xs text-pet-primary">Selected: {customLocation.latitude.toFixed(4)}, {customLocation.longitude.toFixed(4)}</p>)}
                            </div>
                          )}
                          <div className="mt-4 space-y-2">
                            <Label htmlFor="distance-slider" className="text-sm text-pet-primary flex justify-between"><span>Search Radius</span><span className="font-normal">{distanceRadius} km</span></Label>
                            <div className="flex gap-2 items-center">
                              <Input type="number" id="distance-input" min="1" placeholder="Distance" value={customDistance} onChange={(e) => { const val = e.target.value; setCustomDistance(val); const pVal = parseInt(val,10); if(!isNaN(pVal) && pVal > 0) setDistanceRadius(pVal); }} className="border-pet-primary/20 focus-visible:ring-pet-primary" />
                              <span className="text-sm font-medium text-pet-primary">km</span>
                            </div>
                            <Slider id="distance-slider" value={[distanceRadius]} min={1} max={100} step={1} onValueChange={(value) => { setDistanceRadius(value[0]); setCustomDistance(value[0].toString()); }} className="py-2" />
                          </div>
                        </fieldset>
                      </div>
                      
                      {/* Date Filter Section */}
                      <div className="space-y-2 pt-4 border-t border-pet-primary/10">
                        <div className="flex justify-between items-center">
                          <Label className="text-pet-primary font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Date {searchType === 'lost' ? 'Lost' : 'Found'} Filter
                          </Label>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="use-date-filter" checked={useDateFilter} onChange={(e) => setUseDateFilter(e.target.checked)} className="form-checkbox h-4 w-4 text-pet-primary" />
                            <Label htmlFor="use-date-filter" className="text-sm text-pet-primary">Enable</Label>
                          </div>
                        </div>
                        <div className={!useDateFilter ? "opacity-60" : ""}>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="from-date" className="text-pet-primary">From Date</Label>
                              <Input id="from-date" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="border-pet-primary/20 focus-visible:ring-pet-primary" disabled={!useDateFilter} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="to-date" className="text-pet-primary">To Date</Label>
                              <Input id="to-date" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="border-pet-primary/20 focus-visible:ring-pet-primary" disabled={!useDateFilter} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={handleSearch} className="w-full bg-pet-primary hover:bg-pet-primary/90 text-white" disabled={isSearching || (useImageSearch && !searchImage)}>
                    {isSearching ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>) : (<><Search className="mr-2 h-4 w-4" /> Search {searchType === 'lost' ? 'Lost Pets' : 'Found Pets'}</>)}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {searchResults.length > 0 ? (
              <>
                <h2 className="text-2xl font-semibold text-pet-primary mb-6">
                  Found {searchResults.length} {searchType === 'lost' ? 'Lost' : 'Found'} Pet{searchResults.length !== 1 ? 's' : ''}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((pet) => {
                    const isLostPet = 'lastSeenDateTime' in pet; // Type guard
                    const petImageUrl = pet.images && pet.images.length > 0 
                      ? (() => {
                          const imageUrl = pet.images[0].fileUrl;
                          if (imageUrl.startsWith('http')) return imageUrl;
                          const cleanImagePath = imageUrl.replace(/^\/+/, '');
                          return `${BASE_URL}/${cleanImagePath}`;
                        })()
                      : "/placeholder.svg";
                    
                    const locationDisplay = pet.locationName || (isLostPet ? `${(pet as LostPetData).lastSeenLocation.latitude.toFixed(3)}, ${(pet as LostPetData).lastSeenLocation.longitude.toFixed(3)}` : `${(pet as FoundPetData).foundLocation.latitude.toFixed(3)}, ${(pet as FoundPetData).foundLocation.longitude.toFixed(3)}`);
                    const date = isLostPet ? new Date((pet as LostPetData).lastSeenDateTime) : new Date((pet as FoundPetData).foundDateTime);

                    return (
                      <div key={pet.id} className="relative">
                        <Link href={`/pet/${pet.id}`} passHref>
                          <PetCard
                            id={pet.id}
                            name={pet.name || (isLostPet ? "Unknown Lost Pet" : "Unknown Found Pet")}
                            description={pet.description || "No description available"}
                            imageUrl={petImageUrl}
                            location={locationDisplay}
                            date={date}
                            status={pet.status}
                            type={searchType} // Pass current searchType to PetCard
                            onClick={() => router.push(`/pet/${pet.id}`)}
                          />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : isSearching ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pet-primary" />
                <p className="text-muted-foreground">Searching {searchType} pets...</p>
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg bg-white/50">
                <Search className="h-12 w-12 mx-auto mb-4 text-pet-primary/30" />
                <h3 className="text-xl font-medium text-pet-primary mb-2">No Search Results Yet</h3>
                <p className="text-muted-foreground">
                  Use the filters to search for {searchType} pets.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}


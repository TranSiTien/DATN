"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, MapPin, Calendar, Mail, Phone, Loader2, Heart, AlertTriangle, CheckCircle2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { useUser } from "@/contexts/user-context"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

// Base URL from environment variable
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:5049"
const API_BASE_URL = `${BASE_URL}/api`

// Define base pet interface
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
}

// Define LostPet interface
interface LostPet extends BasePet {
  kind: 'Lost';
  name: string; // Lost pets typically have a name provided by the owner
  lastSeenLocation: { latitude: number; longitude: number; };
  lastSeenDateTime: string;
  finderId: string; // Owner's user ID
}

// Define FoundPet interface
interface FoundPet extends BasePet {
  kind: 'Found';
  name?: string; // Name might be unknown or given by the finder
  foundLocation: { latitude: number; longitude: number; };
  foundDateTime: string;
  finderId: string; // Finder's user ID
}

// Discriminated union for Pet type
type Pet = LostPet | FoundPet;

export default function PetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params)
  const petId = resolvedParams.id
  
  const { token } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  
  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  
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

  useEffect(() => {
    if (mapLoaded && mapRef.current && pet && typeof window.L !== "undefined") {
      const L = window.L
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove(); // Clear previous map instance if any
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      const petLocation = pet.kind === 'Lost' ? pet.lastSeenLocation : pet.foundLocation;
      const petLat = petLocation.latitude;
      const petLng = petLocation.longitude;

      mapInstanceRef.current = L.map(mapRef.current).setView([petLat, petLng], 15)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current)

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: `<div style="background-color: ${pet.kind === 'Lost' ? '#4A90E2' : '#F5A623'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      markerRef.current = L.marker([petLat, petLng], { icon: customIcon }).addTo(mapInstanceRef.current)
      
      const popupText = pet.locationName 
        ? `<b>${pet.locationName}</b><br>${pet.name || 'This pet'} was ${pet.kind.toLowerCase()} here`
        : `${pet.name || 'This pet'} was ${pet.kind.toLowerCase()} here`;
      markerRef.current.bindPopup(popupText).openPopup();

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
          markerRef.current = null
        }
      }
    }
  }, [mapLoaded, pet])
  
  const formatImageUrl = (imageUrl: string) => {
    if (!imageUrl) return "/placeholder.svg";
    if (imageUrl.startsWith(BASE_URL) || imageUrl.startsWith('http')) return imageUrl;
    if (imageUrl.startsWith('/')) return `${BASE_URL}${imageUrl}`;
    if (imageUrl.includes('uploads/')) {
      const cleanImagePath = imageUrl.replace(/^\/+/, '');
      return `${BASE_URL}/${cleanImagePath}`;
    }
    return imageUrl;
  };
  
  useEffect(() => {
    const fetchPetDetails = async () => {
      if (!petId) {
        setError("Pet ID is missing.");
        setLoading(false);
        return;
      }
      if (!token) {
        setError("Authentication required to view pet details")
        setLoading(false)
        return
      }
      
      setLoading(true);
      setError("");
      setPet(null);

      try {
        // Try fetching as a Lost Pet first
        let response = await fetch(`${API_BASE_URL}/LostPets/${petId}`, {
          method: 'GET',
          headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data: Omit<LostPet, 'kind'> = await response.json();
          console.log("Lost Pet API Response:", data);
          console.log("Lost Pet finderId:", data.finderId);
          setPet({ ...data, kind: 'Lost' } as LostPet);
        } else if (response.status === 404) {
          // If not found as Lost Pet, try fetching as a Found Pet
          response = await fetch(`${API_BASE_URL}/FoundPets/${petId}`, {
            method: 'GET',
            headers: { 'accept': 'application/json', 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data: Omit<FoundPet, 'kind'> = await response.json();
            console.log("Found Pet API Response:", data);
            console.log("Found Pet finderId:", data.finderId);
            setPet({ ...data, kind: 'Found' } as FoundPet);
          } else {
            // If not found as Found Pet either, or other error for FoundPets
            throw new Error(`Pet not found. (Lost: 404, Found: ${response.status})`);
          }
        } else {
          // Other error for LostPets (not 404)
          throw new Error(`Failed to fetch lost pet details: ${response.status}`);
        }
      } catch (err: any) {
        console.error("Error fetching pet details:", err);
        setError(err.message || "Failed to load pet details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPetDetails();
  }, [petId, token]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: 'numeric'
    }).format(date);
  };
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'found': case 'reunited': return 'bg-pet-success text-white';
      case 'pending': return 'bg-pet-warning/90 text-white';
      case 'rejected': return 'bg-pet-danger text-white';
      default: return 'bg-pet-primary/80 text-white'; // Default for 'lost' or other statuses
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'found': case 'reunited': return <CheckCircle2 className="h-4 w-4" />;
      case 'pending': case 'rejected': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };
  
  const handleThumbnailClick = (index: number) => setActiveImageIndex(index);
  
  // Debug log the pet object
  useEffect(() => {
    if (pet) {
      console.log("Pet object in component:", pet);
      console.log("FinderId value:", pet.finderId);
    }
  }, [pet]);

  // Determine labels and data based on pet kind
  const petName = pet?.kind === 'Lost' ? (pet?.name || 'Pet (Name Unknown)') : 'Found Pet';
  const eventDateTime = pet ? (pet.kind === 'Lost' ? pet.lastSeenDateTime : pet.foundDateTime) : "";
  const eventLocation = pet ? (pet.kind === 'Lost' ? pet.lastSeenLocation : pet.foundLocation) : null;
  const dateLabel = pet?.kind === 'Lost' ? 'Lost on' : 'Found on';
  const locationLabel = pet?.kind === 'Lost' ? 'Last seen at' : 'Found at';

  // Function to handle contact button click with validation
  const handleContactClick = () => {
    if (!pet?.finderId) {
      toast({
        title: "Contact information unavailable",
        description: "Sorry, contact information is not available for this pet.",
        variant: "destructive"
      });
      return;
    }
    
    console.log("Navigating to contacts page with finderId:", pet.finderId);
    
    // Clear any existing URL parameters and set a fresh URL
    const baseUrl = "/profile/contacts";
    const url = `${baseUrl}?userId=${encodeURIComponent(pet.finderId)}`;
    
    // Use replace to avoid back button issues
    router.push(url);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30 pb-20">
        <div className="container max-w-5xl px-4 py-12 md:px-6 md:py-16 lg:py-24">
          <div className="mb-8">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-pet-primary mb-4" />
              <p className="text-pet-primary font-medium">Loading pet details...</p>
            </div>
          ) : error ? (
            <Card className="border-pet-danger/30 shadow-lg">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-pet-danger mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-pet-danger mb-2">Error</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="bg-pet-primary hover:bg-pet-primary/90 text-white"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : pet ? (
            <>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="aspect-square relative rounded-lg overflow-hidden border border-pet-primary/20 bg-white shadow-md">
                    {pet.images && pet.images.length > 0 ? (
                      <Image
                        src={formatImageUrl(pet.images[activeImageIndex]?.fileUrl || "/placeholder.svg")}
                        alt={petName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Image src="/placeholder.svg" alt={petName} fill className="object-cover" />
                    )}
                  </div>
                  
                  {pet.images && pet.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {pet.images.map((image, index) => (
                        <div
                          key={image.fileId}
                          onClick={() => handleThumbnailClick(index)}
                          className={`relative h-20 w-20 flex-shrink-0 cursor-pointer rounded-md border-2 transition-all ${index === activeImageIndex ? "border-pet-primary" : "border-transparent hover:border-pet-primary/50"}`}
                        >
                          <Image
                            src={formatImageUrl(image.fileUrl)}
                            alt={`${petName} - image ${index + 1}`}
                            fill
                            className="object-cover rounded-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-3xl font-bold text-pet-primary">{petName}</h1>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${getStatusColor(pet.status)}`}>
                      {getStatusIcon(pet.status)}
                      {pet.status}
                    </div>
                  </div>
                  
                  {eventDateTime && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-pet-primary" />
                      <span>{dateLabel} {formatDate(eventDateTime)}</span>
                    </div>
                  )}
                  
                  {pet.locationName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-pet-primary" />
                      <span>{locationLabel} <span className="font-medium text-pet-primary">{pet.locationName}</span></span>
                    </div>
                  )}
                  
                  {eventLocation && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Coordinates: {eventLocation.latitude.toFixed(6)}, {eventLocation.longitude.toFixed(6)}</span>
                    </div>
                  )}
                  
                  <Separator className="my-4 bg-pet-primary/10" />
                  
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-pet-primary">Description</h2>
                    <p className="text-muted-foreground">
                      {pet.description || "No description provided."}
                    </p>
                  </div>
                  
                  {pet.moderatorFeedback && (
                    <div className="bg-pet-warning/10 border border-pet-warning/20 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-pet-warning mb-1">Moderator Feedback</h3>
                      <p className="text-sm text-muted-foreground">{pet.moderatorFeedback}</p>
                    </div>
                  )}
                  
                  <Separator className="my-4 bg-pet-primary/10" />
                  
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-pet-primary">
                      {pet.kind === 'Lost' ? 'Contact Owner' : 'Contact Finder'}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {/* Debug info */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="w-full mb-2 p-2 bg-gray-100 rounded text-xs">
                          <p>finderId: {pet.finderId || 'undefined'}</p>
                        </div>
                      )}
                      {pet.finderId ? (
                        <Button 
                          className="bg-pet-accent hover:bg-pet-accent/90 text-white"
                          onClick={handleContactClick}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          View Contact Information
                        </Button>
                      ) : (
                        <Button 
                          className="bg-pet-accent/50 text-white"
                          disabled
                          title="Contact information not available"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Contact Information Unavailable
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Please be respectful and responsible when contacting.
                    </p>
                  </div>
                </div>
              </div>
              
              <Card className="mt-8 border-pet-primary/10 shadow-md overflow-hidden">
                <div ref={mapRef} className="relative h-[400px] w-full bg-pet-soft/50">
                  {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-pet-primary">
                      <MapPin className="h-6 w-6 mr-2" />
                      <span>Map loading...</span>
                    </div>
                  )}
                </div>
              </Card>
              
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                 {/* Conditional actions based on pet.kind and pet.status */}
                {pet.kind === 'Lost' && pet.status.toLowerCase() === 'lost' && (
                    <Button variant="default" className="bg-pet-success hover:bg-pet-success/90 text-white">
                        <Heart className="h-4 w-4 mr-2" />
                        I Found This Pet
                    </Button>
                )}
                {pet.kind === 'Found' && pet.status.toLowerCase() === 'found' && (
                     <Button variant="default" className="bg-pet-accent hover:bg-pet-accent/90 text-white">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Reunited with Owner
                    </Button>
                )}
              </div>
            </>
          ) : (
            <Card className="border-pet-warning/30 shadow-lg">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-pet-warning mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-pet-warning mb-2">Pet Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  We couldn't find details for pet ID: {petId}. It may have been removed or the ID is incorrect.
                </p>
                <Link href="/search">
                  <Button className="bg-pet-primary hover:bg-pet-primary/90 text-white">
                    Return to Search
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}


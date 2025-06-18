"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Settings,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Twitter,
  StarIcon,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useUser } from "@/contexts/user-context"

// Base URL from environment variable
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:5049"
const API_BASE_URL = `${BASE_URL}/api`

// Define interfaces for the data from backend
interface LostPet {
  id: string;
  name: string;
  description: string;
  lastSeenDateTime: string;
  locationName: string;
  status: string;
  images: Array<{
    fileId: string;
    fileUrl: string;
  }>;
  breed?: string;
  petType?: string;
}

interface FoundPet {
  id: string;
  description: string;
  foundDateTime: string;
  locationName: string;
  status: string;
  images: Array<{
    fileId: string;
    fileUrl: string;
  }>;
  breed?: string;
  petType?: string;
}

interface ContactMethod {
  id: string;
  type: string;
  value: string;
  isPrimary: boolean;
}

export default function UserProfilePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("lost")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [petToDelete, setPetToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lostPets, setLostPets] = useState<LostPet[]>([])
  const [foundPets, setFoundPets] = useState<FoundPet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user, contactInfos, isLoading: isLoadingUser } = useUser()

  // Fetch lost and found pets from the backend
  useEffect(() => {
    const fetchPets = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch lost pets
        const lostResponse = await fetch(`${API_BASE_URL}/LostPets`);
        if (!lostResponse.ok) {
          throw new Error(`Failed to fetch lost pets: ${lostResponse.status}`);
        }
        const lostPetsData = await lostResponse.json();
        setLostPets(lostPetsData);
        
        // Fetch found pets
        const foundResponse = await fetch(`${API_BASE_URL}/FoundPets`);
        if (!foundResponse.ok) {
          throw new Error(`Failed to fetch found pets: ${foundResponse.status}`);
        }
        const foundPetsData = await foundResponse.json();
        setFoundPets(foundPetsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching pets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPets();
  }, []);

  // Filter pets based on status and search query
  const filteredLostPets = lostPets.filter((pet) => {
    const petStatus = pet.status.toLowerCase();
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && petStatus === "pending") ||
      (statusFilter === "resolved" && petStatus === "found");
    
    const matchesSearch =
      searchQuery === "" ||
      (pet.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pet.locationName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const filteredFoundPets = foundPets.filter((pet) => {
    const petStatus = pet.status.toLowerCase();
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && petStatus === "pending") ||
      (statusFilter === "resolved" && petStatus === "claimed");
    
    const matchesSearch =
      searchQuery === "" ||
      (pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pet.locationName?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const handleDeletePet = (id: string) => {
    setPetToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!petToDelete) return;

    setIsDeleting(true);

    try {
      // Determine if it's a lost or found pet
      const isPetLost = lostPets.some(pet => pet.id === petToDelete);
      const endpoint = isPetLost ? 'LostPets' : 'FoundPets';
      
      // Call API to delete the pet
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${petToDelete}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete pet: ${response.status}`);
      }

      // Update state to remove the deleted pet
      if (isPetLost) {
        setLostPets(prevPets => prevPets.filter(pet => pet.id !== petToDelete));
      } else {
        setFoundPets(prevPets => prevPets.filter(pet => pet.id !== petToDelete));
      }

      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setPetToDelete(null);
    } catch (error) {
      console.error("Error deleting pet:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsResolved = async (id: string) => {
    try {
      // Determine if it's a lost or found pet
      const isPetLost = lostPets.some(pet => pet.id === id);
      const endpoint = isPetLost ? 'LostPets' : 'FoundPets';
      
      // Call API to update the pet status with the correct status value
      const status = isPetLost ? 'Found' : 'Claimed';
      
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update pet status: ${response.status}`);
      }

      // Update state to reflect the status change
      if (isPetLost) {
        setLostPets(prevPets => 
          prevPets.map(pet => 
            pet.id === id ? { ...pet, status } : pet
          )
        );
      } else {
        setFoundPets(prevPets => 
          prevPets.map(pet => 
            pet.id === id ? { ...pet, status } : pet
          )
        );
      }
    } catch (error) {
      console.error("Error updating pet status:", error);
    }
  };

  const handleMarkAsActive = async (id: string) => {
    try {
      // Determine if it's a lost or found pet
      const isPetLost = lostPets.some(pet => pet.id === id);
      const endpoint = isPetLost ? 'LostPets' : 'FoundPets';
      
      // Call API to update the pet status
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Pending' }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update pet status: ${response.status}`);
      }

      // Update state to reflect the status change
      if (isPetLost) {
        setLostPets(prevPets => 
          prevPets.map(pet => 
            pet.id === id ? { ...pet, status: 'Pending' } : pet
          )
        );
      } else {
        setFoundPets(prevPets => 
          prevPets.map(pet => 
            pet.id === id ? { ...pet, status: 'Pending' } : pet
          )
        );
      }
    } catch (error) {
      console.error("Error updating pet status:", error);
    }
  };

  // Get icon for contact method type
  const getContactIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "facebook":
        return <Facebook className="h-4 w-4" />
      case "instagram":
        return <Instagram className="h-4 w-4" />
      case "twitter":
        return <Twitter className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  // Helper function to format image URL
  const formatImageUrl = (url: string | undefined) => {
    if (!url) return "/placeholder.svg";
    
    // If the URL is already absolute, return it as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Otherwise, prepend the base URL
    return `${BASE_URL}${url}`;
  };

  // Helper function to format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return new Date();
    return new Date(dateString);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        <div className="container px-4 py-12 md:px-6 md:py-16 lg:py-24">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          {/* User Profile Header */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md">
                <Image
                  src="/placeholder.svg?height=100&width=100&text=User"
                  alt={user?.name || "Guest"}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-pet-primary">{user?.name || "Guest"}</h1>
                <p className="text-muted-foreground">Member since January 2024</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-pet-soft/50 text-pet-primary">
                    {lostPets.length} Lost Pets
                  </Badge>
                  <Badge variant="outline" className="bg-pet-warm/50 text-pet-accent">
                    {foundPets.length} Found Pets
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <Card className="border-pet-primary/10 shadow-lg mb-8">
            <CardHeader className="bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl text-pet-primary">Contact Information</CardTitle>
                  <CardDescription>Manage how others can contact you about your pet listings</CardDescription>
                </div>
                <Button
                  variant="outline"
                  className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                  onClick={() => router.push("/profile/contacts")}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Manage Contacts
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {isLoadingUser ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pet-soft mb-4">
                      <svg className="animate-spin h-6 w-6 text-pet-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-pet-primary mb-2">Loading contact information...</h3>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-medium text-red-600 mb-2">Error loading contact information</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()} className="bg-pet-primary hover:bg-pet-primary/90">
                      Retry
                    </Button>
                  </div>
                ) : contactInfos && contactInfos.length > 0 ? (
                  <div className="space-y-3">
                    {contactInfos.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-3">
                        <div className="bg-pet-primary/10 p-2 rounded-full">{getContactIcon(contact.type)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{contact.type}:</span>
                            <span>{contact.value}</span>
                            {contact.isPrimary && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200 ml-2">
                                <StarIcon className="h-3 w-3 mr-1" />
                                Primary
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pet-soft mb-4">
                      <Mail className="h-6 w-6 text-pet-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-pet-primary mb-2">No contact methods</h3>
                    <p className="text-muted-foreground mb-4">
                      Add contact methods so people can reach you about your pet listings
                    </p>
                    <Button
                      onClick={() => router.push("/profile/contacts")}
                      className="bg-pet-primary hover:bg-pet-primary/90"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact Method
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pet Listings */}
          <Card className="border-pet-primary/10 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl text-pet-primary">My Pet Listings</CardTitle>
                  <CardDescription>Manage your lost and found pet listings</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                    onClick={() => router.push("/lost")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Report Lost
                  </Button>
                  <Button
                    variant="outline"
                    className="border-pet-accent/30 text-pet-accent hover:bg-pet-accent/10"
                    onClick={() => router.push("/found")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Report Found
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="lost" value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <TabsList className="bg-pet-soft/30">
                    <TabsTrigger
                      value="lost"
                      className="data-[state=active]:bg-pet-primary data-[state=active]:text-white"
                    >
                      Lost Pets
                    </TabsTrigger>
                    <TabsTrigger
                      value="found"
                      className="data-[state=active]:bg-pet-accent data-[state=active]:text-white"
                    >
                      Found Pets
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search listings..."
                        className="pl-10 border-pet-primary/20 focus-visible:ring-pet-primary w-full sm:w-[200px]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="border-pet-primary/20 focus:ring-pet-primary w-full sm:w-[150px]">
                        <div className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Filter by status" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TabsContent value="lost" className="mt-0">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pet-soft mb-4">
                        <svg className="animate-spin h-8 w-8 text-pet-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-pet-primary mb-2">Loading lost pet listings...</h3>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-medium text-red-600 mb-2">Error loading pet listings</h3>
                      <p className="text-muted-foreground mb-6">{error}</p>
                      <Button onClick={() => window.location.reload()} className="bg-pet-primary hover:bg-pet-primary/90">
                        Retry
                      </Button>
                    </div>
                  ) : filteredLostPets.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredLostPets.map((pet) => (
                        <Card
                          key={pet.id}
                          className="overflow-hidden border-pet-primary/10 transition-all hover:shadow-md"
                        >
                          <div className="relative">
                            <div className="aspect-square overflow-hidden">
                              <Image
                                src={pet.images && pet.images.length > 0 
                                  ? formatImageUrl(pet.images[0].fileUrl) 
                                  : "/placeholder.svg"}
                                width={300}
                                height={300}
                                alt={pet.name || "Lost pet"}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="absolute top-3 right-3">
                              <Badge
                                className={
                                  pet.status.toLowerCase() === "pending"
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                                }
                              >
                                {pet.status.toLowerCase() === "pending" ? "Active" : "Found"}
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="text-lg font-medium text-pet-primary">{pet.name || "Unnamed Pet"}</h3>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <span className="sr-only">Open menu</span>
                                    <svg
                                      width="15"
                                      height="15"
                                      viewBox="0 0 15 15"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                    >
                                      <path
                                        d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                                        fill="currentColor"
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                      ></path>
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/lost/edit/${pet.id}`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/pet/${pet.id}`)}>
                                    <Search className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {pet.status.toLowerCase() === "pending" ? (
                                    <DropdownMenuItem onClick={() => handleMarkAsResolved(pet.id)}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark as Found
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleMarkAsActive(pet.id)}>
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                      Mark as Active
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeletePet(pet.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="mr-2 h-3 w-3" />
                                {pet.locationName || "Unknown location"}
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="mr-2 h-3 w-3" />
                                {formatDate(pet.lastSeenDateTime).toLocaleDateString()}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pet-soft mb-4">
                        <Search className="h-8 w-8 text-pet-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-pet-primary mb-2">No lost pet listings found</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery || statusFilter !== "all"
                          ? "Try adjusting your filters or search query"
                          : "You haven't reported any lost pets yet"}
                      </p>
                      <Button onClick={() => router.push("/lost")} className="bg-pet-primary hover:bg-pet-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Report a Lost Pet
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="found" className="mt-0">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pet-warm mb-4">
                        <svg className="animate-spin h-8 w-8 text-pet-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-pet-accent mb-2">Loading found pet listings...</h3>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <h3 className="text-lg font-medium text-red-600 mb-2">Error loading pet listings</h3>
                      <p className="text-muted-foreground mb-6">{error}</p>
                      <Button onClick={() => window.location.reload()} className="bg-pet-accent hover:bg-pet-accent/90">
                        Retry
                      </Button>
                    </div>
                  ) : filteredFoundPets.length > 0 ? (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredFoundPets.map((pet) => (
                        <Card
                          key={pet.id}
                          className="overflow-hidden border-pet-primary/10 transition-all hover:shadow-md"
                        >
                          <div className="relative">
                            <div className="aspect-square overflow-hidden">
                              <Image
                                src={pet.images && pet.images.length > 0 
                                  ? formatImageUrl(pet.images[0].fileUrl) 
                                  : "/placeholder.svg"}
                                width={300}
                                height={300}
                                alt={`Found ${pet.petType || "pet"}`}
                                className="object-cover w-full h-full"
                              />
                            </div>
                            <div className="absolute top-3 right-3">
                              <Badge
                                className={
                                  pet.status.toLowerCase() === "pending"
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-blue-100 text-blue-800 border-blue-200"
                                }
                              >
                                {pet.status.toLowerCase() === "pending" ? "Active" : "Claimed"}
                              </Badge>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="text-lg font-medium text-pet-accent">Found {pet.petType || "Pet"}</h3>
                                <p className="text-sm text-muted-foreground">{pet.breed || "Unknown breed"}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <span className="sr-only">Open menu</span>
                                    <svg
                                      width="15"
                                      height="15"
                                      viewBox="0 0 15 15"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                    >
                                      <path
                                        d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
                                        fill="currentColor"
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                      ></path>
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/found/edit/${pet.id}`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/pet/${pet.id}`)}>
                                    <Search className="mr-2 h-4 w-4" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {pet.status.toLowerCase() === "pending" ? (
                                    <DropdownMenuItem onClick={() => handleMarkAsResolved(pet.id)}>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Mark as Claimed
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleMarkAsActive(pet.id)}>
                                      <AlertCircle className="mr-2 h-4 w-4" />
                                      Mark as Active
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeletePet(pet.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-muted-foreground">
                                <MapPin className="mr-2 h-3 w-3" />
                                {pet.locationName || "Unknown location"}
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Calendar className="mr-2 h-3 w-3" />
                                {formatDate(pet.foundDateTime).toLocaleDateString()}
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 pt-0 flex justify-between border-t border-pet-primary/10 mt-4">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">-</span> views
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">-</span> responses
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pet-warm mb-4">
                        <Search className="h-8 w-8 text-pet-accent" />
                      </div>
                      <h3 className="text-lg font-medium text-pet-accent mb-2">No found pet listings</h3>
                      <p className="text-muted-foreground mb-6">
                        {searchQuery || statusFilter !== "all"
                          ? "Try adjusting your filters or search query"
                          : "You haven't reported any found pets yet"}
                      </p>
                      <Button onClick={() => router.push("/found")} className="bg-pet-accent hover:bg-pet-accent/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Report a Found Pet
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this pet listing? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  )
}


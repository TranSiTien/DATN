"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, Phone, Facebook, Instagram, Twitter, Star, Save, X, Plus, Trash2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { useUser, type ContactInfo } from "@/contexts/user-context"

export default function ContactsPage() {
  const router = useRouter()
  const { token, fetchContactInfos, fetchContactInfosByUserId, addContactInfo, deleteContactInfos, setPrimaryContact, updateContactInfo } = useUser()
  const [redirectPath, setRedirectPath] = useState<string | null>(null)
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null)
  const [localContactMethods, setLocalContactMethods] = useState<ContactInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [isViewingOwnProfile, setIsViewingOwnProfile] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)
  
  // Use a ref to track initialization
  const initialized = useRef(false);

  // Check for URL parameters - ONLY RUN ONCE on mount
  useEffect(() => {
    // Only run this once
    if (initialized.current) return;
    
    const parseUrlParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get("redirect");
      const message = searchParams.get("message");
      const userId = searchParams.get("userId");
  
      console.log("URL parameters:", { redirect, message, userId });
  
      if (redirect) {
        setRedirectPath(redirect);
      }
  
      if (message === "contact_required") {
        toast({
          title: "Contact information required",
          description: "Please add at least one contact method so people can reach you about your pet.",
          duration: 5000,
        });
      }
  
      if (userId) {
        console.log("Setting viewingUserId from URL:", userId);
        setViewingUserId(userId);
        setIsViewingOwnProfile(false);
        // Force a reload of contacts
        setContactsLoaded(false);
        setLocalContactMethods([]);
      } else {
        setViewingUserId(null);
        setIsViewingOwnProfile(true);
        // Force a reload of contacts
        setContactsLoaded(false);
        setLocalContactMethods([]);
      }
    };
    
    parseUrlParams();
    initialized.current = true;
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Reset contacts when URL changes (for client-side navigation)
  useEffect(() => {
    const handleRouteChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const newUserId = searchParams.get("userId");
      
      // If userId changed, reset state
      if (newUserId !== viewingUserId) {
        console.log("URL changed, resetting contacts state");
        setContactsLoaded(false);
        setLocalContactMethods([]);
        
        if (newUserId) {
          setViewingUserId(newUserId);
          setIsViewingOwnProfile(false);
        } else {
          setViewingUserId(null);
          setIsViewingOwnProfile(true);
        }
      }
    };
    
    // Listen for URL changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [viewingUserId]);

  // Load contact methods
  useEffect(() => {
    // Create a flag to track if the component is still mounted
    let isMounted = true;
    
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to view contact information.",
      })
      router.push("/login")
      return;
    }

    // Wait for viewingUserId to be set from URL params before loading
    if (!initialized.current) {
      console.log("Waiting for initialization...");
      return;
    }

    // Skip if already loaded
    if (contactsLoaded) {
      console.log("Contacts already loaded, skipping fetch");
      return;
    }

    console.log(`Starting to load contacts... (isViewingOwnProfile: ${isViewingOwnProfile}, viewingUserId: ${viewingUserId || 'none'})`);
    const loadContactMethods = async () => {
      setIsLoading(true);
      try {
        let contacts: ContactInfo[] | null = null;
        
        // Only fetch one set of contacts based on viewing mode
        if (!isViewingOwnProfile && viewingUserId) {
          // Fetch another user's contacts
          console.log(`Fetching ONLY contacts for specific user ID: ${viewingUserId}`);
          contacts = await fetchContactInfosByUserId(token, viewingUserId);
          
          if (!isMounted) return; // Check if component is still mounted
          
          console.log("Received contacts for other user:", contacts);
          setUserName("Pet Owner");
        } else {
          // Fetch current user's contacts
          console.log("Fetching ONLY current user's contacts");
          contacts = await fetchContactInfos(token);
          
          if (!isMounted) return; // Check if component is still mounted
          
          console.log("Received current user contacts:", contacts);
        }
        
        if (!isMounted) return; // Check if component is still mounted
        
        if (contacts) {
          console.log(`Setting local contact methods (${contacts.length} items):`, contacts);
          setLocalContactMethods(contacts);
        } else {
          console.log("No contacts received, setting empty array");
          setLocalContactMethods([]);
        }
        
      } catch (error) {
        console.error("Failed to fetch contact methods:", error);
        if (!isMounted) return; // Check if component is still mounted
        
        toast({
          variant: "destructive",
          title: "Failed to load contact information",
          description: "There was an error loading contact information. Please try again.",
        });
        setLocalContactMethods([]);
      } finally {
        if (isMounted) {
          setContactsLoaded(true);
          setIsLoading(false);
        }
      }
    };

    loadContactMethods();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
    
  // Important: Only include dependencies that should trigger a re-fetch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, viewingUserId, isViewingOwnProfile]);

  const [isAddingContact, setIsAddingContact] = useState(false)
  const [newContactType, setNewContactType] = useState("Email")
  const [newContactValue, setNewContactValue] = useState("")
  const [contactToDelete, setContactToDelete] = useState<string | null>(null)
  const [isContactDeleteDialogOpen, setIsContactDeleteDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [settingPrimary, setSettingPrimary] = useState(false)

  // Save contact changes
  const saveContactChanges = async () => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to save your contact information.",
      })
      router.push("/login")
      return
    }

    setIsSaving(true)

    try {
      toast({
        title: "Contact information updated",
        description: "Your contact information has been successfully updated.",
        duration: 3000,
      })

      if (redirectPath === "lost") {
        router.push("/lost")
      } else if (redirectPath === "found") {
        router.push("/found")
      } else {
        router.push("/profile")
      }
    } catch (error) {
      console.error("Error saving contact methods:", error)
      toast({
        variant: "destructive",
        title: "Failed to update contact information",
        description: "An error occurred while updating your contact information.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Start adding a new contact
  const startAddingContact = () => {
    setIsAddingContact(true)
    setNewContactType("Email")
    setNewContactValue("")
  }

  // Add a new contact
  const addNewContact = async () => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to add contact information.",
      })
      return
    }

    if (!validateContactValue(newContactType, newContactValue)) {
      toast({
        variant: "destructive",
        title: "Invalid contact information",
        description: `Please enter a valid ${newContactType}.`,
      })
      return
    }

    try {
      await addContactInfo(token, {
        type: newContactType,
        value: newContactValue,
      })

      const updated = await fetchContactInfos(token)
      setLocalContactMethods(updated || [])

      setIsAddingContact(false)
      setNewContactType("Email")
      setNewContactValue("")

      toast({
        title: "Contact added",
        description: "Your new contact method has been added successfully.",
      })
    } catch (error) {
      console.error("Failed to add contact method:", error)
      toast({
        variant: "destructive",
        title: "Failed to add contact",
        description: "An error occurred while adding your contact method.",
      })
    }
  }

  // Start editing a contact
  const startEditingContact = (contact: ContactInfo) => {
    setEditingContactId(contact.id)
    setEditValue(contact.value)
  }

  // Save edited contact
  const saveEditedContact = async (id: string) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to edit contact information.",
      })
      return
    }

    const contactToEdit = localContactMethods.find((c) => c.id === id)
    if (!contactToEdit) return

    if (!validateContactValue(contactToEdit.type, editValue)) {
      toast({
        variant: "destructive",
        title: "Invalid contact information",
        description: `Please enter a valid ${contactToEdit.type}.`,
      })
      return
    }

    try {
      // Use the direct edit API endpoint
      await updateContactInfo(token, id, {
        type: contactToEdit.type,
        value: editValue,
      })

      // Refresh the contact list
      const updated = await fetchContactInfos(token)
      setLocalContactMethods(updated || [])
      
      setEditingContactId(null)
      setEditValue("")

      toast({
        title: "Contact updated",
        description: "Your contact method has been updated successfully.",
      })
    } catch (error) {
      console.error("Failed to update contact method:", error)
      toast({
        variant: "destructive",
        title: "Failed to update contact",
        description: "An error occurred while updating your contact method.",
      })
    }
  }

  // Cancel editing a contact
  const cancelEditingContact = () => {
    setEditingContactId(null)
    setEditValue("")
  }

  // Remove a contact
  const removeContact = (id: string) => {
    if (localContactMethods.length === 1) {
      setContactToDelete(id)
      setIsContactDeleteDialogOpen(true)
      return
    }

    confirmDeleteContact(id)
  }

  // Confirm contact deletion
  const confirmContactDelete = () => {
    if (!contactToDelete) return
    confirmDeleteContact(contactToDelete)
  }

  // Actually delete the contact
  const confirmDeleteContact = async (id: string) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to delete contact information.",
      })
      return
    }

    try {
      await deleteContactInfos(token, [id])

      const updated = await fetchContactInfos(token)
      setLocalContactMethods(updated || [])

      setIsContactDeleteDialogOpen(false)
      setContactToDelete(null)

      toast({
        title: "Contact removed",
        description: "Your contact method has been removed successfully.",
      })
    } catch (error) {
      console.error("Failed to delete contact method:", error)
      toast({
        variant: "destructive",
        title: "Failed to remove contact",
        description: "An error occurred while removing your contact method.",
      })
    }
  }

  // Update contact type
  const updateContactType = async (id: string, type: string) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to update contact information.",
      })
      return
    }

    const contactToUpdate = localContactMethods.find((c) => c.id === id)
    if (!contactToUpdate) return

    try {
      // Use the direct edit API endpoint
      await updateContactInfo(token, id, {
        type,
        value: contactToUpdate.value,
      })

      const updated = await fetchContactInfos(token)
      setLocalContactMethods(updated || [])

      toast({
        title: "Contact type updated",
        description: "Your contact type has been updated successfully.",
      })
    } catch (error) {
      console.error("Failed to update contact type:", error)
      toast({
        variant: "destructive",
        title: "Failed to update contact",
        description: "An error occurred while updating your contact type.",
      })
    }
  }

  // Set a contact as primary
  const handleSetPrimaryContact = async (id: string) => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to update contact information.",
      })
      return
    }

    try {
      setSettingPrimary(true)
      await setPrimaryContact(token, id)
      
      const updated = await fetchContactInfos(token)
      setLocalContactMethods(updated || [])
      
      toast({
        title: "Primary contact set",
        description: "Your primary contact has been updated successfully.",
      })
    } catch (error) {
      console.error("Failed to set primary contact:", error)
      toast({
        variant: "destructive",
        title: "Failed to set primary contact",
        description: "An error occurred while setting your primary contact.",
      })
    } finally {
      setSettingPrimary(false)
    }
  }

  // Validate contact value based on type
  const validateContactValue = (type: string, value: string): boolean => {
    switch (type.toLowerCase()) {
      case "email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      case "phone":
        return /^[\d\s\-+]+$/.test(value) && value.length >= 7
      default:
        return value.trim().length > 0
    }
  }

  // Get icon for contact method type
  const getContactIcon = (type: string) => {
    switch (type.toLowerCase()) {
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

  // Debug log
  useEffect(() => {
    console.log("State updated:", {
      viewingUserId,
      isViewingOwnProfile,
      contactsLoaded,
      localContactMethodsCount: localContactMethods.length
    });
  }, [viewingUserId, isViewingOwnProfile, contactsLoaded, localContactMethods]);

  // Function to force refresh contacts
  const forceRefreshContacts = () => {
    console.log("Forcing refresh of contacts");
    setContactsLoaded(false);
    setLocalContactMethods([]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-1 bg-pet-soft/30 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pet-primary mx-auto mb-4"></div>
            <p className="text-pet-primary">Loading contact information...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        <div className="container max-w-3xl px-4 py-12 md:px-6 md:py-16 lg:py-24">
          <div className="mb-8">
            <Link
              href={isViewingOwnProfile ? "/profile" : "/search"}
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              {isViewingOwnProfile ? "Back to profile" : "Back to search"}
            </Link>
          </div>

          <Card className="border-pet-primary/10 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl text-pet-primary">
                    {isViewingOwnProfile 
                      ? "Manage Contact Information" 
                      : `${userName}'s Contact Information`}
                  </CardTitle>
                  <CardDescription>
                    {isViewingOwnProfile 
                      ? "Add or edit contact methods so people can reach you about your pet listings" 
                      : "Contact information for reaching out about their pet"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {redirectPath && isViewingOwnProfile && (
                <div className="mb-6 p-4 bg-pet-soft/50 border border-pet-primary/20 rounded-lg">
                  <h3 className="text-pet-primary font-medium mb-2">Contact Information Required</h3>
                  <p className="text-sm text-muted-foreground">
                    You need to add at least one contact method before you can{" "}
                    {redirectPath === "lost" ? "report a lost pet" : "report a found pet"}. This ensures that people can
                    reach you about your pet listing.
                  </p>
                </div>
              )}
              <div className="space-y-6">
                {localContactMethods.length > 0 ? (
                  <div className="space-y-4">
                    {localContactMethods.map((contact) => (
                      <div key={contact.id} className={`p-4 border rounded-lg bg-white ${contact.isPrimary ? 'border-pet-primary/60' : 'border-pet-primary/10'}`}>
                        {editingContactId === contact.id && isViewingOwnProfile ? (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="bg-pet-primary/10 p-2 rounded-full">{getContactIcon(contact.type)}</div>
                                <span className="font-medium capitalize">{contact.type}</span>
                                {contact.isPrimary && (
                                  <Badge className="bg-pet-primary text-white ml-2">Primary</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="border-pet-primary/20 focus-visible:ring-pet-primary"
                                  placeholder={`Enter your ${contact.type}`}
                                />
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                                onClick={() => saveEditedContact(contact.id)}
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground"
                                onClick={cancelEditingContact}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${contact.isPrimary ? 'bg-pet-primary/20' : 'bg-pet-primary/10'}`}>
                                {getContactIcon(contact.type)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium capitalize">{contact.type}:</span>
                                  <span>{contact.value}</span>
                                  {contact.isPrimary && (
                                    <Badge className="bg-pet-primary text-white ml-2">Primary</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {isViewingOwnProfile && (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={contact.type}
                                  onValueChange={(value) => updateContactType(contact.id, value)}
                                >
                                  <SelectTrigger className="w-[120px] border-pet-primary/20 focus:ring-pet-primary h-8 text-xs">
                                    <SelectValue placeholder="Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Email">Email</SelectItem>
                                    <SelectItem value="Phone">Phone</SelectItem>
                                    <SelectItem value="Facebook">Facebook</SelectItem>
                                    <SelectItem value="Instagram">Instagram</SelectItem>
                                    <SelectItem value="Twitter">Twitter</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant={contact.isPrimary ? "secondary" : "ghost"}
                                  size="icon"
                                  className={`h-8 w-8 ${contact.isPrimary 
                                    ? 'bg-pet-primary/20 text-pet-primary' 
                                    : 'text-muted-foreground hover:bg-pet-primary/10 hover:text-pet-primary'}`}
                                  onClick={() => handleSetPrimaryContact(contact.id)}
                                  disabled={contact.isPrimary || settingPrimary}
                                  title={contact.isPrimary ? "Primary contact" : "Set as primary contact"}
                                >
                                  <Star className={`h-4 w-4 ${contact.isPrimary ? 'fill-pet-primary' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-pet-primary hover:bg-pet-primary/10"
                                  onClick={() => startEditingContact(contact)}
                                  title="Edit contact"
                                >
                                  <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 15 15"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                  >
                                    <path
                                      d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89155L2.04044 12.303C1.9599 12.491 2.00189 12.709 2.14646 12.8536C2.29103 12.9981 2.50905 13.0401 2.69697 12.9596L6.10847 11.4975C6.2254 11.4474 6.33168 11.3754 6.42164 11.2855L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42161 9.28547L11.5 2.20711L12.7929 3.5L5.71455 10.5784L4.21924 11.2192L3.78081 10.7808L4.42161 9.28547Z"
                                      fill="currentColor"
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                    ></path>
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                  onClick={() => removeContact(contact.id)}
                                  title="Remove contact"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pet-soft mb-4">
                      <Mail className="h-8 w-8 text-pet-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-pet-primary mb-2">No contact methods</h3>
                    <p className="text-muted-foreground mb-4">
                      {isViewingOwnProfile 
                        ? "Add contact methods so people can reach you about your pet listings"
                        : "This user hasn't added any contact information yet"}
                    </p>
                  </div>
                )}

                {isViewingOwnProfile && (
                  isAddingContact ? (
                    <div className="p-4 border border-pet-primary/10 rounded-lg bg-white border-dashed">
                      <h3 className="text-lg font-medium text-pet-primary mb-4">Add New Contact Method</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="new-contact-type">Contact Type</Label>
                            <Select value={newContactType} onValueChange={setNewContactType}>
                              <SelectTrigger
                                id="new-contact-type"
                                className="border-pet-primary/20 focus:ring-pet-primary"
                              >
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Email">Email</SelectItem>
                                <SelectItem value="Phone">Phone</SelectItem>
                                <SelectItem value="Facebook">Facebook</SelectItem>
                                <SelectItem value="Instagram">Instagram</SelectItem>
                                <SelectItem value="Twitter">Twitter</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor="new-contact-value">Contact Value</Label>
                            <Input
                              id="new-contact-value"
                              placeholder={`Enter your ${newContactType}`}
                              value={newContactValue}
                              onChange={(e) => setNewContactValue(e.target.value)}
                              className="border-pet-primary/20 focus-visible:ring-pet-primary"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            className="border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                            onClick={addNewContact}
                          >
                            Add Contact
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={() => setIsAddingContact(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10 border-dashed"
                      onClick={startAddingContact}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact Method
                    </Button>
                  )
                )}
                
                {!isViewingOwnProfile && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="default"
                      className="bg-pet-primary hover:bg-pet-primary/90 text-white"
                      onClick={() => router.back()}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Return to Pet
                    </Button>
                  </div>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 border border-dashed border-gray-300 rounded-md">
                  <h4 className="text-sm font-semibold mb-2">Debug Info:</h4>
                  <div className="text-xs space-y-1">
                    <p>Viewing User ID: {viewingUserId || 'None (own profile)'}</p>
                    <p>Is Viewing Own Profile: {isViewingOwnProfile ? 'Yes' : 'No'}</p>
                    <p>Contacts Loaded: {contactsLoaded ? 'Yes' : 'No'}</p>
                    <p>Number of Contacts: {localContactMethods.length}</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2 text-xs h-7" 
                      onClick={forceRefreshContacts}
                    >
                      Force Refresh
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isContactDeleteDialogOpen} onOpenChange={setIsContactDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Contact Removal</DialogTitle>
            <DialogDescription>
              {localContactMethods.length === 1
                ? "This is your only contact method. If you remove it, people won't be able to contact you about your pet listings."
                : "Are you sure you want to remove this contact method?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setIsContactDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmContactDelete}>
              Remove Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}


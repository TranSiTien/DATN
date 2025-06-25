import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, FileText, Upload, ArrowRight, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LostPetOptionsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        <div className="container max-w-5xl px-4 py-12 md:px-6 md:py-16 lg:py-24">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-pet-primary hover:text-pet-primary/80"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl md:text-5xl mb-4">
              I Lost My Pet
            </h1>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl">
              We're sorry to hear that your pet is missing. We're here to help you find them as quickly as possible.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Option 1: Report a Lost Pet */}
            <Card className="border-pet-primary/10 shadow-lg pet-card-hover">
              <CardHeader className="bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-pet-primary/10 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-pet-primary" />
                  </div>
                  <CardTitle className="text-2xl text-pet-primary">Report a Lost Pet</CardTitle>
                </div>
                <CardDescription>
                  Create a detailed listing about your missing pet to help others identify them.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-primary/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-primary">1</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-primary">Create a detailed listing</h3>
                      <p className="text-muted-foreground">
                        Provide information about your pet's appearance, behavior, and where they were last seen.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-primary/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-primary">2</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-primary">Upload clear photos</h3>
                      <p className="text-muted-foreground">
                        Add multiple photos of your pet to help with identification.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-primary/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-primary">3</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-primary">Get notified</h3>
                      <p className="text-muted-foreground">
                        Receive alerts when someone reports finding a pet that matches yours.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <Image
                    src="https://cdn.petmojo.com/wp-content/uploads/2024/03/2ee27bb7f1cf74bfa3ba55b7960ddaadb05a0bc8-1200x690-1.jpg?height=200&width=300&text=Report+Form"
                    width={300}
                    height={200}
                    alt="Report form illustration"
                    className="rounded-lg border border-pet-primary/10"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-center bg-gradient-to-r from-white to-pet-soft border-t border-pet-primary/10 p-6">
                <Link href="/lost">
                  <Button size="lg" className="bg-pet-primary hover:bg-pet-primary/90 text-white">
                    Report a Lost Pet
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            {/* Option 2: Search for a Lost Pet */}
            <Card className="border-pet-primary/10 shadow-lg pet-card-hover">
              <CardHeader className="bg-gradient-to-r from-pet-soft to-white border-b border-pet-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-pet-secondary/10 p-2 rounded-full">
                    <Search className="h-5 w-5 text-pet-secondary" />
                  </div>
                  <CardTitle className="text-2xl text-pet-secondary">Search for Your Pet</CardTitle>
                </div>
                <CardDescription>
                  Check if someone has already found your pet and reported it in our system.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-secondary/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-secondary">
                        1
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-secondary">Upload a photo of your pet</h3>
                      <p className="text-muted-foreground">
                        Our image recognition technology will find visually similar pets in our database.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-secondary/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-secondary">
                        2
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-secondary">Browse potential matches</h3>
                      <p className="text-muted-foreground">
                        Review found pets that match your pet's appearance, sorted by similarity.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-secondary/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-secondary">
                        3
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-secondary">Contact the finder</h3>
                      <p className="text-muted-foreground">
                        If you spot your pet, contact the person who found them directly through our platform.
                      </p>
                    </div>
                  </div>

                  {/* New: Information alert about search functionality */}
                  <Alert className="bg-pet-soft/50 border-pet-secondary/30 mt-6">
                    <Info className="h-4 w-4 text-pet-secondary" />
                    <AlertTitle className="text-pet-secondary">How our pet matching works</AlertTitle>
                    <AlertDescription className="text-sm text-muted-foreground">
                      Our advanced AI technology analyzes pet images to find visual similarities. Search results are 
                      automatically sorted from most similar to least similar to help you quickly find potential matches. 
                      For best results, use a clear, well-lit photo that shows your pet's distinctive features.
                    </AlertDescription>
                  </Alert>
                </div>
                <div className="mt-8 flex justify-center">
                  <div className="relative">
                    <Image
                      src="https://m.media-amazon.com/images/I/71MSw6itLuL._AC_UF1000,1000_QL80_.jpg?height=200&width=300&text=Image+Search"
                      width={300}
                      height={200}
                      alt="Image search illustration"
                      className="rounded-lg border border-pet-primary/10"
                    />
                    <div className="absolute -top-3 -right-3 bg-pet-accent text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      Recommended
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 bg-gradient-to-r from-white to-pet-soft border-t border-pet-primary/10 p-6">
                <Link href="/search?sort=image&upload=true" className="w-full">
                  <Button size="lg" className="w-full bg-pet-secondary hover:bg-pet-secondary/90 text-white">
                    <Upload className="mr-2 h-4 w-4" />
                    Search with Photo
                  </Button>
                </Link>
                <Link href="/search" className="w-full">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-pet-secondary/30 text-pet-secondary hover:bg-pet-secondary/10"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search by Details
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Need more help finding your pet? Check out our additional resources.
            </p>
            <Link href="/resources">
              <Button variant="link" className="text-pet-primary">
                View Pet Finding Resources
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}


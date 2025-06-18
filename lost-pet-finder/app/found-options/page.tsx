import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, FileText, Upload, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function FoundPetOptionsPage() {
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
            <h1 className="text-3xl font-bold tracking-tighter text-pet-accent sm:text-4xl md:text-5xl mb-4">
              I Found a Pet
            </h1>
            <p className="max-w-[700px] mx-auto text-muted-foreground md:text-xl">
              Thank you for caring about this lost pet. Let's help reunite them with their family.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Option 1: Search for the Pet's Owner */}
            <Card className="border-pet-primary/10 shadow-lg pet-card-hover">
              <CardHeader className="bg-gradient-to-r from-pet-warm to-white border-b border-pet-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-pet-secondary/10 p-2 rounded-full">
                    <Search className="h-5 w-5 text-pet-secondary" />
                  </div>
                  <CardTitle className="text-2xl text-pet-secondary">Search for the Owner</CardTitle>
                </div>
                <CardDescription>
                  Check if someone has already reported this pet as missing in our system.
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
                      <h3 className="font-medium text-pet-secondary">Upload a photo of the pet</h3>
                      <p className="text-muted-foreground">
                        Our image recognition technology will find visually similar pets in our lost pet database.
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
                        Review lost pets that match the pet you found, sorted by similarity.
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
                      <h3 className="font-medium text-pet-secondary">Contact the owner</h3>
                      <p className="text-muted-foreground">
                        If you find a match, contact the pet owner directly through our platform.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <div className="relative">
                    <Image
                      src="/placeholder.svg?height=200&width=300&text=Image+Search"
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
              <CardFooter className="flex flex-col gap-4 bg-gradient-to-r from-white to-pet-warm border-t border-pet-primary/10 p-6">
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

            {/* Option 2: Report a Found Pet */}
            <Card className="border-pet-primary/10 shadow-lg pet-card-hover">
              <CardHeader className="bg-gradient-to-r from-pet-warm to-white border-b border-pet-primary/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-pet-accent/10 p-2 rounded-full">
                    <FileText className="h-5 w-5 text-pet-accent" />
                  </div>
                  <CardTitle className="text-2xl text-pet-accent">Report a Found Pet</CardTitle>
                </div>
                <CardDescription>
                  Create a detailed listing about the pet you found to help the owner identify them.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-accent/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-accent">1</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-accent">Create a detailed listing</h3>
                      <p className="text-muted-foreground">
                        Provide information about the pet's appearance, behavior, and where you found them.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-accent/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-accent">2</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-accent">Upload clear photos</h3>
                      <p className="text-muted-foreground">
                        Add multiple photos of the pet to help with identification.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-pet-accent/10 p-2 rounded-full mt-1">
                      <span className="flex h-5 w-5 items-center justify-center font-semibold text-pet-accent">3</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-pet-accent">Get notified</h3>
                      <p className="text-muted-foreground">
                        Receive alerts when someone claims the pet might be theirs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <Image
                    src="/placeholder.svg?height=200&width=300&text=Report+Form"
                    width={300}
                    height={200}
                    alt="Report form illustration"
                    className="rounded-lg border border-pet-primary/10"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-center bg-gradient-to-r from-white to-pet-warm border-t border-pet-primary/10 p-6">
                <Link href="/found">
                  <Button size="lg" className="bg-pet-accent hover:bg-pet-accent/90 text-white">
                    Report a Found Pet
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">
              Need help caring for the found pet? Check out our resources for temporary pet care.
            </p>
            <Link href="/resources">
              <Button variant="link" className="text-pet-accent">
                View Pet Care Resources
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}


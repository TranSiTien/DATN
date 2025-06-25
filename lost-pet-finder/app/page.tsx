import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Heart } from "lucide-react"
import Image from "next/image"
import { SiteHeader } from "@/components/site-header"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-pet-soft to-white">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-pet-primary/20 bg-pet-soft px-3 py-1 text-sm text-pet-primary">
                  <Heart className="mr-1 h-3.5 w-3.5 text-pet-primary" />
                  <span>Reuniting Families</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl md:text-5xl">
                  Reunite with your lost pet
                </h1>
                <p className="text-muted-foreground md:text-xl">
                  Our platform connects pet owners with their lost pets through a community-driven network. Report a
                  lost or found pet and help reunite families.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href="/lost-options">
                    <Button size="lg" className="w-full sm:w-auto bg-pet-accent hover:bg-pet-accent/90 text-white">
                      I lost my pet
                    </Button>
                  </Link>
                  <Link href="/found-options">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto border-pet-primary/30 text-pet-primary hover:bg-pet-primary/10"
                    >
                      I found a pet
                    </Button>
                  </Link>
                </div>
              </div>
              <Image
                src="https://i.pinimg.com/564x/17/51/98/175198ee796d9eca03318f2bfa031fef.jpg"
                width={550}
                height={550}
                alt="Happy pet owner reunited with dog"
                className="mx-auto aspect-video rounded-xl object-cover sm:w-full lg:aspect-square shadow-lg border border-pet-primary/10 pet-card-hover"
              />
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl md:text-5xl">
                  How it works
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform makes it easy to report and find lost pets in your area.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pet-primary/10">
                  <MapPin className="h-8 w-8 text-pet-primary" />
                </div>
                <h3 className="text-xl font-bold text-pet-primary">Report</h3>
                <p className="text-muted-foreground">
                  Report a lost or found pet with details and photos to help with identification.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pet-secondary/10">
                  <Search className="h-8 w-8 text-pet-secondary" />
                </div>
                <h3 className="text-xl font-bold text-pet-secondary">Search</h3>
                <p className="text-muted-foreground">
                  Browse listings or search by location, species, breed, and other characteristics.
                </p>
              </div>
              <div className="flex flex-col justify-center space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pet-accent/10">
                  <Heart className="h-8 w-8 text-pet-accent" />
                </div>
                <h3 className="text-xl font-bold text-pet-accent">Reunite</h3>
                <p className="text-muted-foreground">
                  Connect securely with pet owners or finders to arrange a happy reunion.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}


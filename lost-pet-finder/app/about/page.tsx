import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SiteHeader } from "@/components/site-header"
import { Heart, Search, Users, MapPin, Mail, Phone, MessageSquare, Quote } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-1 bg-pet-soft/30">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-pet-primary/90 to-pet-soft">
          <div className="container px-4 md:px-6 text-center">
            <div className="space-y-4 md:space-y-6">
              <h1 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl">
                Every Lost Pet Has a Family Missing Them
              </h1>
              <p className="mx-auto max-w-[700px] text-white/90 md:text-xl">
                We're not just a platform – we're pet owners who understand the heartbreak of a missing pet and the joy
                of a reunion.
              </p>
              <div className="flex justify-center pt-4">
                <Link href="/lost-options">
                  <Button size="lg" className="bg-white text-pet-primary hover:bg-white/90">
                    I've Lost My Pet
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-pet-primary/20 bg-pet-soft px-3 py-1 text-sm text-pet-primary">
                  <Heart className="mr-1 h-3.5 w-3.5 text-pet-primary" />
                  <span>Our Story</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl">
                  Born from a Personal Loss
                </h2>
                <p className="text-muted-foreground md:text-lg">
                  PetReunite began with Sarah's story. When her cat Whiskers went missing in 2019, she experienced
                  firsthand the overwhelming panic and heartbreak that comes with losing a beloved pet. After days of
                  searching, posting flyers, and countless social media posts, a neighbor found Whiskers two miles away.
                </p>
                <p className="text-muted-foreground md:text-lg">
                  This experience revealed a critical gap: there was no centralized, easy-to-use platform dedicated to
                  reuniting lost pets with their families. Sarah teamed up with fellow pet lovers to create PetReunite –
                  not as a business, but as a mission to ensure no pet or owner has to endure prolonged separation.
                </p>
                <p className="text-pet-primary font-medium italic">
                  "We built this platform because we've been in your shoes. We know the sleepless nights, the worry, and
                  the overwhelming relief when your pet comes home."
                </p>
              </div>
              <div className="relative h-[400px] overflow-hidden rounded-xl shadow-lg">
                <Image
                  src="/placeholder.svg?height=800&width=1200&text=Sarah+and+Whiskers"
                  alt="Founder Sarah reunited with her cat Whiskers"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-12 md:py-24 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl">
                  Real Stories, Real Reunions
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-lg">
                  These are the moments that drive our mission – the joy of families reunited with their beloved pets.
                </p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  name: "Emily & Max",
                  story:
                    "After Max slipped out during a thunderstorm, I was devastated. Thanks to PetReunite, someone recognized him from my listing just 2 days later. The moment we reunited, he wouldn't stop wagging his tail!",
                  image: "/placeholder.svg?height=400&width=400&text=Emily+and+Max",
                },
                {
                  name: "The Rodriguez Family & Luna",
                  story:
                    "Our daughter cried every night Luna was missing. When someone contacted us through PetReunite saying they'd found her, we drove 30 miles at midnight to bring her home. The platform gave us our family member back.",
                  image: "/placeholder.svg?height=400&width=400&text=Rodriguez+Family",
                },
                {
                  name: "David & Bella",
                  story:
                    "I found Bella hiding under my porch during a rainstorm. I posted her on PetReunite and within hours connected with her family who had been searching for days. Seeing their reunion was one of the most beautiful moments I've witnessed.",
                  image: "/placeholder.svg?height=400&width=400&text=David+and+Bella",
                },
              ].map((testimonial, index) => (
                <Card key={index} className="border-pet-primary/10 shadow-md overflow-hidden">
                  <div className="relative h-48 w-full">
                    <Image
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-start mb-4">
                      <Quote className="h-8 w-8 text-pet-primary/20 mr-2 flex-shrink-0" />
                      <p className="text-muted-foreground italic">{testimonial.story}</p>
                    </div>
                    <p className="font-medium text-pet-primary">{testimonial.name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/search">
                <Button className="bg-pet-primary hover:bg-pet-primary/90">Browse Success Stories</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How We Help Section */}
        <section className="w-full py-12 md:py-24 bg-pet-soft/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl">
                  How We Help You Find Your Pet
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-lg">
                  We've designed every feature with one goal: getting pets back home as quickly as possible.
                </p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card className="border-pet-primary/10 shadow-md pet-card-hover">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-pet-primary/10 p-4 rounded-full">
                    <Heart className="h-8 w-8 text-pet-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-pet-primary">Immediate Visibility</h3>
                  <p className="text-muted-foreground">
                    Your lost pet listing is immediately visible to our community of pet-lovers, shelters, and
                    veterinarians in your area.
                  </p>
                  <p className="text-sm text-pet-primary italic">
                    "I posted about my missing cat at 2 AM, and by morning three neighbors were already helping me
                    search." — Jamie K.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-pet-primary/10 shadow-md pet-card-hover">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-pet-secondary/10 p-4 rounded-full">
                    <Search className="h-8 w-8 text-pet-secondary" />
                  </div>
                  <h3 className="text-xl font-bold text-pet-secondary">Visual Recognition</h3>
                  <p className="text-muted-foreground">
                    Our image matching technology helps connect lost pet reports with found pet listings that look
                    similar, even when descriptions might vary.
                  </p>
                  <p className="text-sm text-pet-secondary italic">
                    "The platform matched my dog with a 'found' listing I had missed. The photo was blurry but it was
                    definitely him!" — Carlos M.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-pet-primary/10 shadow-md pet-card-hover">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-pet-accent/10 p-4 rounded-full">
                    <Users className="h-8 w-8 text-pet-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-pet-accent">Community Support</h3>
                  <p className="text-muted-foreground">
                    Our community of pet lovers actively looks out for lost pets and provides emotional support during
                    what can be a difficult time.
                  </p>
                  <p className="text-sm text-pet-accent italic">
                    "The support from strangers was overwhelming. People I'd never met were out looking for my dog at
                    midnight." — Aisha T.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Promise Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="relative h-[400px] overflow-hidden rounded-xl shadow-lg order-2 lg:order-1">
                <Image
                  src="/placeholder.svg?height=800&width=1200&text=Pet+Reunion"
                  alt="Emotional pet reunion"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4 order-1 lg:order-2">
                <div className="inline-flex items-center rounded-full border border-pet-primary/20 bg-pet-soft px-3 py-1 text-sm text-pet-primary">
                  <Heart className="mr-1 h-3.5 w-3.5 text-pet-primary" />
                  <span>Our Promise</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl">
                  We're With You Every Step of the Way
                </h2>
                <p className="text-muted-foreground md:text-lg">
                  Losing a pet is an emotional journey, and we promise to be there for you through every part of it.
                  We're not just a technology platform – we're pet owners who understand what you're going through.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="bg-pet-primary/10 p-1 rounded-full mt-1 mr-3">
                      <Heart className="h-4 w-4 text-pet-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      We'll never charge you for posting about your lost pet or for connecting with someone who found
                      them.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-pet-primary/10 p-1 rounded-full mt-1 mr-3">
                      <Heart className="h-4 w-4 text-pet-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      Our support team includes people who have lost and found pets – they understand your emotions and
                      urgency.
                    </p>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-pet-primary/10 p-1 rounded-full mt-1 mr-3">
                      <Heart className="h-4 w-4 text-pet-primary" />
                    </div>
                    <p className="text-muted-foreground">
                      We provide resources and guidance for your search, from printable flyers to tips for effective
                      searching.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The People Behind PetReunite */}
        <section className="w-full py-12 md:py-24 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl">
                  The People Behind PetReunite
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-lg">
                  We're not just developers and designers – we're pet parents who've experienced the same fears and joys
                  you have.
                </p>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: "Sarah Johnson",
                  role: "Founder",
                  bio: "After losing her cat Whiskers for a week, Sarah created PetReunite to help others avoid the same heartbreak. She shares her home with Whiskers and two rescue dogs, Max and Bella.",
                  image: "/placeholder.svg?height=300&width=300&text=Sarah",
                },
                {
                  name: "Michael Chen",
                  role: "Technology Lead",
                  bio: "Michael's coding skills are matched only by his love for his three-legged rescue dog, Cooper. He's passionate about using technology to solve real emotional problems.",
                  image: "/placeholder.svg?height=300&width=300&text=Michael",
                },
                {
                  name: "Jessica Rodriguez",
                  role: "Community Support",
                  bio: "Former shelter volunteer Jessica has helped reunite over 200 pets with their families. Her experience with both the joy of reunions and the pain of waiting makes her support invaluable.",
                  image: "/placeholder.svg?height=300&width=300&text=Jessica",
                },
                {
                  name: "David Kim",
                  role: "User Experience",
                  bio: "David designs with pet owners' emotions in mind. After finding and returning a lost dog during a rainstorm, he committed to making the reunion process easier for everyone.",
                  image: "/placeholder.svg?height=300&width=300&text=David",
                },
              ].map((member, index) => (
                <div key={index} className="flex flex-col items-center space-y-4">
                  <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-white shadow-md">
                    <Image src={member.image || "/placeholder.svg"} alt={member.name} fill className="object-cover" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-pet-primary">{member.name}</h3>
                    <p className="text-pet-secondary font-medium">{member.role}</p>
                    <p className="text-muted-foreground mt-2">{member.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Values */}
        <section className="w-full py-12 md:py-24 bg-pet-soft/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl">
                  Our Community Values
                </h2>
                <p className="max-w-[700px] text-muted-foreground md:text-lg">
                  These principles guide everything we do at PetReunite.
                </p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-pet-primary/10 shadow-md">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-pet-primary/10 p-4 rounded-full">
                    <Heart className="h-8 w-8 text-pet-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-pet-primary">Empathy First</h3>
                  <p className="text-muted-foreground">
                    We approach every lost pet situation with the understanding that behind each listing is a worried
                    family and a confused pet who wants to go home.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-pet-primary/10 shadow-md">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-pet-secondary/10 p-4 rounded-full">
                    <Users className="h-8 w-8 text-pet-secondary" />
                  </div>
                  <h3 className="text-xl font-bold text-pet-secondary">Community Support</h3>
                  <p className="text-muted-foreground">
                    We believe in the power of community to help in times of need. Our platform facilitates not just pet
                    finding, but emotional support during difficult times.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-pet-primary/10 shadow-md">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-pet-accent/10 p-4 rounded-full">
                    <Search className="h-8 w-8 text-pet-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-pet-accent">Accessibility</h3>
                  <p className="text-muted-foreground">
                    Our services are free and accessible to everyone. We believe that financial constraints should never
                    stand in the way of reuniting a family.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-pet-primary/10 shadow-md">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="bg-green-100 p-4 rounded-full">
                    <MapPin className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-green-600">Local Focus</h3>
                  <p className="text-muted-foreground">
                    We emphasize local connections because we know most lost pets are found within a mile of home, often
                    by neighbors who care.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact Section - Simplified and More Personal */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-pet-primary sm:text-4xl">We're Here For You</h2>
                <p className="max-w-[700px] text-muted-foreground md:text-lg">
                  Day or night, if you need support with your lost or found pet, we're ready to help.
                </p>
              </div>
            </div>

            <Card className="border-pet-primary/10 shadow-md max-w-2xl mx-auto">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="bg-pet-soft/50 p-6 rounded-full">
                    <Heart className="h-12 w-12 text-pet-primary" />
                  </div>
                  <div className="space-y-4 text-center md:text-left">
                    <h3 className="text-xl font-bold text-pet-primary">24/7 Support for Pet Emergencies</h3>
                    <p className="text-muted-foreground">
                      We understand that pets don't go missing on a 9-5 schedule. Our community volunteers and support
                      team are available around the clock.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                      <a
                        href="mailto:help@petreunite.com"
                        className="inline-flex items-center text-pet-primary hover:underline"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        help@petreunite.com
                      </a>
                      <a href="tel:+18005551234" className="inline-flex items-center text-pet-primary hover:underline">
                        <Phone className="mr-2 h-4 w-4" />
                        1-800-555-1234
                      </a>
                    </div>
                    <Button className="bg-pet-primary hover:bg-pet-primary/90">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat With Us Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 bg-gradient-to-b from-pet-primary/90 to-pet-secondary/90 text-white">
          <div className="container px-4 md:px-6 text-center">
            <div className="mx-auto max-w-[800px] space-y-6">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Join Our Community of Pet Lovers
              </h2>
              <p className="text-white/90 md:text-xl">
                Whether you've lost a pet, found one, or simply want to be part of a community that helps reunite
                families, we welcome you with open arms.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-pet-primary hover:bg-white/90">
                    Join Our Community
                  </Button>
                </Link>
                <Link href="/search">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Help Find Pets
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}


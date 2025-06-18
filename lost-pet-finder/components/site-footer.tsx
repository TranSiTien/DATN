import Link from "next/link"
import { PawPrint } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t border-pet-primary/10 bg-pet-soft/30">
      <div className="container flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between md:py-12 px-4 md:px-6">
        <div className="flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2 text-pet-primary">
            <PawPrint className="h-6 w-6" />
            <span className="text-xl font-bold">PetReunite</span>
          </Link>
          <p className="text-sm text-muted-foreground">Helping reunite pets with their families since 2024.</p>
        </div>
        <nav className="flex gap-4 sm:gap-6">
          <Link
            href="/terms"
            className="text-sm font-medium text-pet-primary hover:text-pet-primary/80 hover:underline underline-offset-4"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-sm font-medium text-pet-primary hover:text-pet-primary/80 hover:underline underline-offset-4"
          >
            Privacy
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-pet-primary hover:text-pet-primary/80 hover:underline underline-offset-4"
          >
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  )
}


"use client" // Error components must be Client Components

import { useEffect } from "react"
import { Button } from "@/components/ui/button" // Assuming you have a Button component

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        Something went wrong!
      </h2>
      <p className="mb-2">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-sm text-gray-500 mb-4">Digest: {error.digest}</p>
      )}
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Try again
      </Button>
    </div>
  )
} 
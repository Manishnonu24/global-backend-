export default function Loading() {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="flex flex-col items-center space-y-6 max-w-sm w-full">
        {/* Soft pulsing logo skeleton */}
        <div className="h-12 w-48 bg-accent/10 rounded-2xl animate-pulse shadow-sm" />

        {/* Standard Spinner inside layout */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-accent/10" />
          <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        </div>

        {/* Pulse text */}
        <div className="w-full space-y-2.5 animate-pulse">
          <div className="h-3 bg-accent/10 rounded-full w-2/3 mx-auto" />
          <div className="h-2.5 bg-accent/10 rounded-full w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  );
}

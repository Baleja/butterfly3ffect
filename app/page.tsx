import GoFundMeInfluencerCalculator from "@/components/gfminfluencercalculator";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background Effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 h-72 w-72 animate-pulse rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-20 right-20 h-96 w-96 animate-pulse rounded-full bg-blue-600/20 blur-3xl [animation-delay:1000ms]" />
      </div>

      {/* Header */}
      <header className="glass-effect relative z-10 border-b border-blue-900/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="butterfly-animation text-blue-500">
                <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M20 20c-2 0-4-2-4-5s2-5 4-5 4 2 4 5-2 5-4 5zm-8-3c-3 0-6-3-6-7s3-7 6-7c2 0 4 1 5 3-1 1-2 3-2 5s1 4 2 5c-1 2-3 3-5 3zm16 0c-2 0-4-1-5-3 1-1 2-3 2-5s-1-4-2-5c1-2 3-3 5-3 3 0 6 3 6 7s-3 7-6 7zm-8 3c-2 0-4 2-4 5s2 5 4 5 4-2 4-5-2-5-4-5zm-8 3c-3 0-6 3-6 7s3 7 6 7c2 0 4-1 5-3-1-1-2-3-2-5s1-4 2-5c-1-2-3-3-5-3zm16 0c-2 0-4 1-5 3 1 1 2 3 2 5s-1 4-2 5c1 2 3 3 5 3 3 0 6-3 6-7s-3-7-6-7z"
                  />
                </svg>
              </div>

              <div>
                <h1 className="gradient-text text-3xl font-bold">Butterfly 3ffect</h1>
                <p className="text-sm text-blue-400">Creator Analytics Platform</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                <span className="text-sm text-blue-400">LIVE DATA ENABLED</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 py-12">
        <div className="container mx-auto text-center">
          <h2 className="mb-4 text-5xl font-bold">
            <span className="gradient-text">Creator Impact Calculator</span>
          </h2>
          <p className="mb-2 text-xl text-blue-200">
            Discover the ripple effect of your influence
          </p>
          <p className="text-gray-400">Real-time Instagram analytics powered by AI</p>
        </div>
      </section>

      {/* Main Content */}
      <main className="container relative z-10 mx-auto px-4 py-8">
        <GoFundMeInfluencerCalculator />
      </main>
    </div>
  );
}

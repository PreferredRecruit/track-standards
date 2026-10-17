import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { SearchForm } from "@/components/SearchForm";
import { SchoolMatch } from "@/components/ResultsTable";
import { generateMatches } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { CollegeLogoMarquee } from "@/components/CollegeLogoMarquee";

// Lazy load ResultsTable for better performance
const ResultsTable = lazy(() => import("@/components/ResultsTable").then(module => ({ default: module.ResultsTable })));

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SchoolMatch[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [initialFormData, setInitialFormData] = useState<{ event: string; personalBest: string; gender: string } | null>(null);

  // On mount, check if we have search params from URL
  useEffect(() => {
    const event = searchParams.get('event');
    const personalBest = searchParams.get('personalBest');
    const gender = searchParams.get('gender');

    if (event && personalBest && gender) {
      // Auto-populate form and trigger search
      const formData = { event, personalBest, gender };
      setInitialFormData(formData);
      
      const matches = generateMatches(event, personalBest, gender);
      setResults(matches);
      setHasSearched(true);
    }
  }, []); // Only run once on mount

  const handleSearch = (data: { event: string; personalBest: string; gender: string }) => {
    const matches = generateMatches(data.event, data.personalBest, data.gender);
    setResults(matches);
    setHasSearched(true);
    
    // Update URL with search params
    setSearchParams({
      event: data.event,
      personalBest: data.personalBest,
      gender: data.gender
    });
  };

  const handleReset = () => {
    setResults([]);
    setHasSearched(false);
    setInitialFormData(null);
    setSearchParams({}); // Clear URL params
  };

  return (
    <div className="min-h-screen gradient-bg pb-28">
      <Helmet>
        <title>Preferred Recruit Track Standards</title>
        <meta name="description" content="Find your preferred college track and field recruiting standards. Compare your PRs against track and field standards from colleges nationwide." />
        <link rel="canonical" href="https://trackandfieldstandards.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://trackandfieldstandards.com/" />
        <meta property="og:title" content="Preferred Recruit Track Standards" />
        <meta property="og:description" content="Find your preferred college track and field recruiting standards. Compare your PRs against track and field standards from colleges nationwide." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Preferred Recruit Track Standards" />
        <meta name="twitter:description" content="Find your preferred college track and field recruiting standards. Compare your PRs against track and field standards from colleges nationwide." />
      </Helmet>
      <Header onReset={handleReset} />
      
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* Hero Section - Only show before search */}
        {!hasSearched && (
          <div className="text-center max-w-4xl mx-auto mb-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Find Your
              <br />
              <span className="gradient-text-hero">Perfect College Match</span>
            </h1>
          </div>
        )}
        
        <SearchForm onSearch={handleSearch} initialValues={initialFormData} />
        
        {!hasSearched && <CollegeLogoMarquee />}
        
        {!hasSearched && (
          <div className="gradient-card rounded-2xl p-6 md:p-8 max-w-2xl mx-auto text-center shadow-2xl shadow-primary/20">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-5 relative z-10">
              Need Help With Recruitment?
            </h3>
            <a 
              href="https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards" 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative z-10 inline-block"
            >
              <Button className="bg-white text-primary hover:bg-gray-50 font-bold h-12 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                Learn More
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        )}
        
        {hasSearched && (
          <Suspense fallback={
            <div className="bg-card rounded-2xl soft-shadow-lg p-8 text-center text-muted-foreground">
              Loading results...
            </div>
          }>
            <ResultsTable results={results} />
          </Suspense>
        )}
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-border/30 py-5 px-6 z-20">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <a 
              href="https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/25 transition-all">
                Free Recruitment Quiz
              </Button>
            </a>
            
            <div className="flex items-center gap-2">
              <a
                href="https://www.instagram.com/preferredrecruit/?next=%2F"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/10 flex items-center justify-center transition-colors"
                aria-label="Follow us on Instagram"
              >
                <img 
                  src="/lovable-uploads/3c147542-29e4-4c27-9198-0d365762fd02.png" 
                  alt="Instagram" 
                  className="w-5 h-5"
                  loading="lazy"
                  width="20"
                  height="20"
                />
              </a>
              <a
                href="https://www.tiktok.com/@preferredrecruit"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/10 flex items-center justify-center transition-colors"
                aria-label="Follow us on TikTok"
              >
                <img 
                  src="/lovable-uploads/82c35b69-d949-4123-bc13-1914a86a4454.png" 
                  alt="TikTok" 
                  className="w-5 h-5"
                  loading="lazy"
                  width="20"
                  height="20"
                />
              </a>
              <a
                href="https://www.youtube.com/@thepreferredrecruit/videos"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-secondary hover:bg-primary/10 flex items-center justify-center transition-colors"
                aria-label="Subscribe to our YouTube channel"
              >
                <img 
                  src="/lovable-uploads/e6f73d11-1cba-49c6-8fc5-fa310e18e051.png" 
                  alt="YouTube" 
                  className="h-5 w-auto object-contain"
                  loading="lazy"
                  width="20"
                  height="20"
                />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

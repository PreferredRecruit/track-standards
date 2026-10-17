import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { findSchoolBySlug, generateSchoolMetaDescription, generateSchoolPageTitle } from "@/lib/schoolPageUtils";
import { SchoolStandardsTable } from "@/components/SchoolStandardsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, Star, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SchoolPage = () => {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const navigate = useNavigate();

  const school = schoolSlug ? findSchoolBySlug(schoolSlug) : undefined;

  useEffect(() => {
    if (!school) {
      navigate('/404', { replace: true });
    }
  }, [school, navigate]);

  if (!school) {
    return null;
  }

  const metaDescription = generateSchoolMetaDescription(school);
  const pageTitle = generateSchoolPageTitle(school);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "name": school.schoolName,
    "sport": "Track and Field",
    "description": metaDescription,
    "url": `https://trackandfieldstandards.com/schools/${schoolSlug}`,
    "address": {
      "@type": "PostalAddress",
      "addressRegion": school.state
    },
    "memberOf": {
      "@type": "SportsOrganization",
      "name": school.conference
    },
    "sameAs": school.coachesUrl ? [school.coachesUrl] : [],
    "keywords": `${school.schoolName} track standards, ${school.conference}, ${school.division}, track and field recruiting`
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://trackandfieldstandards.com/schools/${schoolSlug}`} />
        
        <meta property="og:url" content={`https://trackandfieldstandards.com/schools/${schoolSlug}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://trackandfieldstandards.com/lovable-uploads/32e64d19-2b4a-46c0-bcb0-0c1657cf2992.png" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content="https://trackandfieldstandards.com/lovable-uploads/32e64d19-2b4a-46c0-bcb0-0c1657cf2992.png" />
        
        <meta name="keywords" content={`${school.schoolName} track standards, ${school.schoolName} track and field recruiting, ${school.schoolName} recruiting standards, ${school.conference} track standards, ${school.division} track and field, ${school.schoolName} walk on standards, ${school.schoolName} recruiting times, ${school.state} track and field recruiting, ${school.schoolName} target times, ${school.schoolName} recruit times, ${school.schoolName} performance standards`} />
        
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background pb-28">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <button 
              onClick={() => navigate(-1)} 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Results
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 space-y-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span>Schools</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{school.schoolName}</span>
          </nav>

          {/* School Header */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center gap-3">
              {school.schoolName} Track & Field Standards
              {school.hasOfficialStandards && (
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              )}
            </h1>
            <p className="text-xl text-muted-foreground">
              Official Recruiting Standards & Performance Benchmarks
            </p>
            
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {school.division}
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {school.conference}
              </Badge>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {school.state}
              </Badge>
            </div>

            <Card>
              <CardContent className="pt-6">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Discover the track and field recruiting standards for {school.schoolName}, a {school.division} program competing in the {school.conference} conference. 
                  Below you'll find comprehensive performance benchmarks for both men's and women's track and field events, including sprints, distance, hurdles, jumps, and throws. 
                  These standards will help you understand what it takes to compete at {school.schoolName}.
                </p>
              </CardContent>
            </Card>

            {/* Coaches Link */}
            {school.coachesUrl && (
              <div className="flex items-center gap-3 text-base py-3 px-4 bg-muted/30 rounded-lg border border-border/40">
                <span className="text-foreground font-semibold">Coaches:</span>
                <a 
                  href={school.coachesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-2 font-medium"
                >
                  View Coaching Staff
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>

          {/* Men's Standards */}
          {school.maleStandards && (
            <section>
              <h2 className="text-3xl font-bold mb-4">Men's Track & Field Standards</h2>
              <SchoolStandardsTable 
                title="Men's Events" 
                standards={school.maleStandards} 
              />
            </section>
          )}

          {/* Women's Standards */}
          {school.femaleStandards && (
            <section>
              <h2 className="text-3xl font-bold mb-4">Women's Track & Field Standards</h2>
              <SchoolStandardsTable 
                title="Women's Events" 
                standards={school.femaleStandards} 
              />
            </section>
          )}

          {/* CTA Section */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <h3 className="text-2xl font-bold">Ready to Take the Next Step?</h3>
              <p className="text-primary-foreground/90 max-w-2xl mx-auto">
                Connect with college track and field coaches and discover more recruiting opportunities through Preferred Recruit.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => window.open('https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards', '_blank')}
              >
                Apply Now
              </Button>
            </CardContent>
          </Card>

          {/* Search More Schools */}
          <div className="text-center">
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/')}
            >
              Search More Schools
            </Button>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t mt-16 py-8 bg-card/50">
          <div className="container mx-auto px-4 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Preferred Recruit. All rights reserved.
            </p>
            <div className="flex justify-center gap-6">
              <a 
                href="https://www.instagram.com/preferred_recruit/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Instagram
              </a>
              <a 
                href="https://www.tiktok.com/@preferred_recruit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                TikTok
              </a>
              <a 
                href="https://www.youtube.com/@PreferredRecruit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                YouTube
              </a>
            </div>
          </div>
        </footer>

        {/* Fixed bottom recruitment bar */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-border/30 py-5 px-6 z-20">
          <div className="container mx-auto">
            <div className="flex items-center justify-center">
              <a
                href="https://app.thepreferredrecruit.com/parentfunnel/?utm_source=website&utm_medium=standards&utm_campaign=PRstandards"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-bold h-12 px-8 rounded-xl shadow-lg shadow-primary/25 transition-all">
                  Are you fast enough? Find out here
                </Button>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SchoolPage;

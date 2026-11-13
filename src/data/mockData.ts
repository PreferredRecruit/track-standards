import { SchoolMatch } from "@/components/ResultsTable";
import { schoolStandards, type EventStandards } from "./schoolStandards";

// Helper function to convert time/distance to comparable number
const parsePerformance = (performance: string, event: string): number => {
  // Handle time formats (mm:ss.xx or ss.xx)
  if (performance.includes(':')) {
    const [minutes, seconds] = performance.split(':');
    return parseInt(minutes) * 60 + parseFloat(seconds);
  }
  
  // Handle distance/height formats - normalize curly quotes and support missing inch marker
  const normalized = performance
    .replace(/\u2019/g, "'")
    .replace(/\u201D/g, '"')
    .trim();
  if (normalized.includes("'") || normalized.includes('"')) {
    // Match feet and optional inches even without the inch marker
    const heightMatch = normalized.match(/(\d+)\s*'\s*(\d{1,2})?/);
    if (heightMatch) {
      const feet = parseInt(heightMatch[1], 10) || 0;
      const inches = heightMatch[2] ? parseInt(heightMatch[2], 10) : 0;
      return feet * 12 + inches; // Convert to total inches
    }
  }
  
  // Handle regular numbers (remove any non-numeric characters except decimal)
  const cleaned = performance.replace(/[^\d.]/g, '');
  return parseFloat(cleaned) || 0;
};

// Helper to check if a standard value is valid (not TBD, N/A, empty, or undefined)
const isValidStandard = (value: string | undefined): boolean => {
  return !!value && value !== "TBD" && value !== "N/A" && value.trim() !== "";
};

// Helper function to determine tier based on performance
const determineTier = (userPerformance: string, standards: Record<string, EventStandards> | undefined, event: string): "target" | "recruit" | "walkon" | null => {
  if (!standards || !standards[event]) return null;
  
  const eventStandards = standards[event];
  
  // Skip if ALL standards are invalid (all TBD/N/A) - school has no real standards for this event
  if (!isValidStandard(eventStandards.target) && 
      !isValidStandard(eventStandards.recruit) && 
      !isValidStandard(eventStandards.walkon)) {
    return null;
  }
  
  const userValue = parsePerformance(userPerformance, event);
  
  // For track events (time-based), lower is better
  const isTimeBased = (event.toLowerCase().includes('m') || event === 'Mile') && !event.includes('Jump') && !event.includes('Put') && !event.includes('Throw') && !event.includes('Discus') && !event.includes('Hammer') && !event.includes('Javelin');
  
  // Only compare against tiers with valid values
  if (isTimeBased) {
    if (isValidStandard(eventStandards.target)) {
      const targetValue = parsePerformance(eventStandards.target, event);
      if (userValue <= targetValue) return "target";
    }
    if (isValidStandard(eventStandards.recruit)) {
      const recruitValue = parsePerformance(eventStandards.recruit, event);
      if (userValue <= recruitValue) return "recruit";
    }
    if (isValidStandard(eventStandards.walkon)) {
      const walkonValue = parsePerformance(eventStandards.walkon, event);
      if (userValue <= walkonValue) return "walkon";
    }
  } else {
    // For field events (distance/height), higher is better
    if (isValidStandard(eventStandards.target)) {
      const targetValue = parsePerformance(eventStandards.target, event);
      if (userValue >= targetValue) return "target";
    }
    if (isValidStandard(eventStandards.recruit)) {
      const recruitValue = parsePerformance(eventStandards.recruit, event);
      if (userValue >= recruitValue) return "recruit";
    }
    if (isValidStandard(eventStandards.walkon)) {
      const walkonValue = parsePerformance(eventStandards.walkon, event);
      if (userValue >= walkonValue) return "walkon";
    }
  }
  
  return null;
};

export const generateMatches = (event: string, personalBest: string, gender: string): SchoolMatch[] => {
  const matches: SchoolMatch[] = [];
  const eliteConferences = ['SEC', 'Big Ten', 'ACC', 'Big 12'];
  
  console.log(`=== GENERATING MATCHES ===`);
  console.log(`Event: ${event}, Personal Best: ${personalBest}, Gender: ${gender}`);
  
  schoolStandards.forEach(school => {
    const standards = gender === "Men's" ? school.maleStandards : school.femaleStandards;
    console.log(`\n--- ${school.schoolName} (ID: ${school.id}, Conference: ${school.conference}) ---`);
    console.log(`Standards object:`, standards);
    console.log(`Has standards:`, !!standards);
    console.log(`Has event standards:`, standards && !!standards[event]);
    
    // Skip if standards don't exist for this gender or specific event
    if (!standards || !standards[event]) {
      console.log(`No standards for ${event} in ${gender} category - SKIPPING`);
      return;
    }
    
    console.log(`Standards for ${event}:`, standards[event]);
    const tier = determineTier(personalBest, standards, event);
    console.log(`Tier result: ${tier}`);
    
    // Prevent walk-on matches for elite conferences
    if (tier === 'walkon' && eliteConferences.includes(school.conference)) {
      console.log(`Skipping walk-on match for elite conference: ${school.conference}`);
      return;
    }
    
    if (tier) {
      const match = {
        id: school.id,
        hasOfficialStandards: school.hasOfficialStandards,
        schoolName: school.schoolName,
        division: school.division,
        conference: school.conference,
        state: school.state,
        tier
      };
      console.log(`Adding match:`, match);
      matches.push(match);
    }
  });
  
  // Sort by tier priority (target > recruit > walkon)
  const tierOrder = { target: 0, recruit: 1, walkon: 2 };
  return matches.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
};

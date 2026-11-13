import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TierBadge } from "./TierBadge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchoolStandards, type EventStandards } from "@/data/schoolStandards";

interface SchoolDetailsModalProps {
  school: SchoolStandards | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SchoolDetailsModal = ({ school, isOpen, onClose }: SchoolDetailsModalProps) => {
  if (!school) return null;

  // Helper to check if a value is valid (not TBD, empty, or undefined)
  const isValidValue = (value: string | undefined): boolean => {
    return !!value && value !== "TBD" && value !== "N/A";
  };

  // Helper to display value or dash
  const displayValue = (value: string | undefined): string => {
    if (!value || value === "TBD" || value === "N/A") return "-";
    return value;
  };

  const renderStandardsTable = (standards: Record<string, EventStandards> | undefined, title: string) => {
    if (!standards) {
      return (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">{title} Standards</h4>
          <p className="text-muted-foreground">No standards available for this gender.</p>
        </div>
      );
    }

    // Filter out events where ALL values are TBD or missing
    const filteredEntries = Object.entries(standards).filter(([_, eventStandards]) => {
      return isValidValue(eventStandards.target) || isValidValue(eventStandards.recruit) || isValidValue(eventStandards.walkon);
    });

    if (filteredEntries.length === 0) {
      return (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">{title} Standards</h4>
          <p className="text-muted-foreground">No standards available for this gender.</p>
        </div>
      );
    }

    // Check if any event has walk-on standards
    const hasWalkonStandards = filteredEntries.some(([_, eventStandards]) => 
      isValidValue(eventStandards?.walkon)
    );

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-lg">{title} Standards</h4>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">Event</th>
                <th className="text-left p-3 font-semibold">
                  <TierBadge tier="target" /> Target
                </th>
                <th className="text-left p-3 font-semibold">
                  <TierBadge tier="recruit" /> Recruit
                </th>
                {hasWalkonStandards && (
                  <th className="text-left p-3 font-semibold">
                    <TierBadge tier="walkon" /> Walk-On
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(([event, eventStandards]) => (
                <tr key={event} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-medium">{event}</td>
                  <td className="p-3 text-target">{displayValue(eventStandards.target)}</td>
                  <td className="p-3 text-recruit">{displayValue(eventStandards.recruit)}</td>
                  {hasWalkonStandards && (
                    <td className="p-3 text-walkon">{displayValue(eventStandards.walkon)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {school.schoolName}
            <Badge variant="outline">{school.division}</Badge>
          </DialogTitle>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>{school.conference}</span>
            <span>•</span>
            <span>{school.state}</span>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="male" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="male">Men's Standards</TabsTrigger>
            <TabsTrigger value="female">Women's Standards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="male" className="mt-6">
            {renderStandardsTable(school.maleStandards, "Men's")}
          </TabsContent>
          
          <TabsContent value="female" className="mt-6">
            {renderStandardsTable(school.femaleStandards, "Women's")}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
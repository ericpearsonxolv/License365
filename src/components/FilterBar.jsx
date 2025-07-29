import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FunnelIcon } from "lucide-react";

// Example status and license lists (replace with your actual data source as needed)
const statuses = ["Active", "Inactive", "Offboarded"];
const licenses = [
  { id: "sku_m365e3", name: "Microsoft 365 E3" },
  { id: "sku_m365e5", name: "Microsoft 365 E5" },
  { id: "sku_exconly", name: "Exchange Online Only" }
];

export default function FilterBar({
  selectedStatus,
  setSelectedStatus,
  selectedLicense,
  setSelectedLicense,
  search,
  setSearch
}) {
  return (
   <div
  className="
    sticky top-0 z-30
    flex flex-col md:flex-row md:items-center gap-3
    bg-card shadow border border-border p-4 rounded-2xl mb-6
    transition-colors
  "
  style={{
    minHeight: 64,
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
  }}
    >
      {/* Left: Icon + Title */}
      <div className="flex items-center gap-2 min-w-[90px]">
        <FunnelIcon className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg tracking-tight text-foreground">
          Filter
        </span>
      </div>
      {/* Search Input */}
      <Input
        className="max-w-xs text-base border-border/60 focus:border-primary bg-background/90"
        placeholder="Search users…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label="Search users"
      />
      {/* Status Dropdown */}
      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
        <SelectTrigger className="w-[140px] font-medium">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          {statuses.map(status => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* License Dropdown */}
      <Select value={selectedLicense} onValueChange={setSelectedLicense}>
        <SelectTrigger className="w-[200px] font-medium">
          <SelectValue placeholder="License" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Licenses</SelectItem>
          {licenses.map(l => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Active Filter Chips */}
      {(selectedStatus || selectedLicense) && (
        <div className="flex gap-2 ml-auto">
          {selectedStatus && (
            <Badge
              variant="secondary"
              className="cursor-pointer font-medium px-3"
              onClick={() => setSelectedStatus("")}
            >
              {selectedStatus} <span className="ml-1">×</span>
            </Badge>
          )}
          {selectedLicense && (
            <Badge
              variant="secondary"
              className="cursor-pointer font-medium px-3"
              onClick={() => setSelectedLicense("")}
            >
              {licenses.find(l => l.id === selectedLicense)?.name} <span className="ml-1">×</span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
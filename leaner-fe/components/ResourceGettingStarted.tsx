import type { GettingStartedItem } from "@/lib/resource-types";
import GettingStartedCard from "./GettingStartedCard";

interface ResourceGettingStartedProps {
  items: GettingStartedItem[];
}

export default function ResourceGettingStarted({
  items,
}: ResourceGettingStartedProps) {
  return (
    <section className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-1.5 rounded-full bg-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Getting Started</h2>
        <span className="text-sm text-muted-foreground">
          Start your Lean 4 learning journey here
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <GettingStartedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

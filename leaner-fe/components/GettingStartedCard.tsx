"use client";

import { ExternalLink } from "lucide-react";
import type { GettingStartedItem } from "@/lib/resource-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GettingStartedIcon } from "./GettingStartedIcon";

interface GettingStartedCardProps {
  item: GettingStartedItem;
}

export default function GettingStartedCard({ item }: GettingStartedCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <GettingStartedIcon
              name={item.iconName}
              className="h-6 w-6 text-blue-600"
            />
          </div>

          {/* Title + Description */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {item.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Action Links */}
          <div className="flex-shrink-0 flex flex-col gap-1.5">
            {item.links.map((link) => (
              <Button
                key={link.label}
                variant="outline"
                size="sm"
                className="justify-start gap-1.5 text-xs font-medium"
                asChild
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

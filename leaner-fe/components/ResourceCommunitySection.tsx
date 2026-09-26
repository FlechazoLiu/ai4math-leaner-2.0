import { ExternalLink, MessageCircle, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CommunitySectionData } from "@/lib/resource-types";

interface ResourceCommunitySectionProps {
  data: CommunitySectionData;
}

export default function ResourceCommunitySection({
  data,
}: ResourceCommunitySectionProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gray-900 text-white">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-gray-900 to-purple-900/40" />

      <div className="relative px-8 py-12 space-y-10">
        {/* Section header */}
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold">Community & Support</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">
            Lean has an active, friendly global community. Whether you&apos;re stuck or want to share your work, there&apos;s always someone willing to help in these places.
          </p>
        </div>

        {/* Zulip highlight */}
        <a
          href={data.zulip.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl bg-white/10 backdrop-blur border border-white/10 hover:bg-white/15 transition-colors p-6 group"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold group-hover:text-blue-300 transition-colors">
                  {data.zulip.title}
                </h3>
                <Badge className="bg-blue-600/30 text-blue-200 border-blue-400/30 text-xs">
                  Recommended
                </Badge>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                {data.zulip.description}
              </p>
              <span className="inline-flex items-center gap-1 text-sm text-blue-300 group-hover:text-blue-200 transition-colors font-medium">
                Join Now
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </a>

        {/* Community links grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-400" />
            <h3 className="text-base font-semibold">More Community Resources</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.links.map((link) => (
              <a
                key={link.title}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors p-4 group"
              >
                <div className="min-w-0">
                  <h4 className="text-sm font-medium group-hover:text-blue-300 transition-colors truncate">
                    {link.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {link.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

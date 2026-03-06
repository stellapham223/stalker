"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guideSections, guideLastUpdated } from "@/lib/user-guide-content";

export default function UserGuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Guide</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last updated: {guideLastUpdated}
        </p>
      </div>

      <div className="space-y-4">
        {guideSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.content.map((paragraph, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

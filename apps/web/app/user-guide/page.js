"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guideSections, guideLastUpdated } from "@/lib/user-guide-content";

export default function UserGuidePage() {
  const [activeSection, setActiveSection] = useState(guideSections[0].id);

  const currentSection = guideSections.find((s) => s.id === activeSection);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Guide</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last updated: {guideLastUpdated}
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar menu */}
        <nav className="w-52 shrink-0 sticky top-6 self-start space-y-1">
          {guideSections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{section.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Right content area */}
        <div className="flex-1 min-w-0 space-y-4">
          {currentSection && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {(() => {
                      const Icon = currentSection.icon;
                      return <Icon className="h-5 w-5 text-muted-foreground" />;
                    })()}
                    {currentSection.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentSection.content.map((paragraph, i) => (
                    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </CardContent>
              </Card>

              {currentSection.subsections?.map((sub, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-base">{sub.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sub.content.map((paragraph, i) => (
                      <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Settings() {
  return (
    <Card className="flex flex-col gap-3 text-sm text-muted">
      <p>
        Account settings will live here. Authentication isn&apos;t wired up in
        this build yet.
      </p>
      <Button variant="secondary" size="sm" disabled className="self-start">
        Sign out
      </Button>
    </Card>
  );
}

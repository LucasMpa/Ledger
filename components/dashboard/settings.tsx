import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Settings({ email }: { email: string | null }) {
  return (
    <Card className="flex flex-col gap-3 text-sm">
      {email ? (
        <p className="text-muted">
          Signed in as <span className="text-foreground">{email}</span>.
        </p>
      ) : (
        <p className="text-muted">You are not signed in.</p>
      )}

      {email ? (
        <form action="/auth/signout" method="post" className="self-start">
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      ) : (
        <a
          href="/login"
          className="self-start rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Sign in
        </a>
      )}
    </Card>
  );
}

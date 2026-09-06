"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/send-receipt", key: "sendReceipt" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-4">
        <Link
          href="/dashboard"
          className="mr-auto flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <Image
            src="/ledger-logo.png"
            alt=""
            width={24}
            height={24}
            className="rounded-md"
            priority
          />
          Ledger
        </Link>
        {LINKS.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:bg-background hover:text-foreground",
              )}
            >
              {t(link.key)}
            </Link>
          );
        })}
        <LocaleSwitcher />
      </nav>
    </header>
  );
}

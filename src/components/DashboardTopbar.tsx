"use client";

import { Car, Map as MapIcon, Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type DashboardTopbarProps = {
  compact?: boolean;
};

export default function DashboardTopbar({
  compact = false,
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const isRoadmap = pathname === "/roadmap" || pathname.startsWith("/modulo/");
  const isPractice =
    pathname === "/practicar" ||
    pathname.startsWith("/practicar/") ||
    pathname === "/practicas" ||
    pathname.startsWith("/practicas/");
  const isNews = pathname === "/news" || pathname.startsWith("/news/");
  const isCompact = compact;

  const linkClassName =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-muted-foreground no-underline transition-colors hover:border-muted-foreground/35 hover:bg-muted-foreground/10 hover:text-foreground aria-[current=page]:border-muted-foreground/35 aria-[current=page]:bg-muted-foreground/10 aria-[current=page]:text-foreground";

  return (
    <header
      className={cn(
        "mb-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card/90 p-2 text-foreground shadow-brand backdrop-blur-md max-md:grid-cols-[1fr_auto] max-md:gap-2",
        isCompact && "mb-0 gap-2 p-1.5 shadow-lg max-md:flex-row",
      )}
    >
      <Link
        className={cn(
          "inline-flex min-h-11 items-center rounded-lg px-2.5 py-2 no-underline",
          isCompact && "min-h-9 px-1.5 py-1",
        )}
        href="/roadmap"
      >
        <Image
          alt="DriverLab"
          className={cn(
            "block h-auto w-[142px] [.light_&]:hue-rotate-180 [.light_&]:invert",
            isCompact && "w-24",
          )}
          height={626}
          priority
          src="/brand/driver-lab-logo.svg"
          width={1324}
        />
      </Link>
      <nav
        className={cn(
          "inline-flex flex-wrap items-center justify-center gap-1.5 max-md:col-span-full max-md:row-start-2 max-md:grid max-md:grid-cols-3",
          isCompact && "gap-1 max-md:flex",
        )}
        aria-label="Navegación principal"
      >
        <Link
          aria-current={isRoadmap ? "page" : undefined}
          className={cn(
            linkClassName,
            isCompact && "min-h-8 gap-1.5 px-2.5 py-1 text-xs",
          )}
          href="/roadmap"
        >
          <MapIcon aria-hidden="true" size={isCompact ? 15 : 17} />
          Roadmap
        </Link>
        <Link
          aria-current={isPractice ? "page" : undefined}
          className={cn(
            linkClassName,
            isCompact && "min-h-8 gap-1.5 px-2.5 py-1 text-xs",
          )}
          href="/practicar"
        >
          <Car aria-hidden="true" size={isCompact ? 15 : 17} />
          Practicar
        </Link>
        <Link
          aria-current={isNews ? "page" : undefined}
          className={cn(
            linkClassName,
            isCompact && "min-h-8 gap-1.5 px-2.5 py-1 text-xs",
          )}
          href="/news"
        >
          <Newspaper aria-hidden="true" size={isCompact ? 15 : 17} />
          Noticias
        </Link>
      </nav>
      <div className="justify-self-end max-md:col-start-2 max-md:row-start-1">
        <ThemeToggle />
      </div>
    </header>
  );
}

"use client";

import { Car, Map as MapIcon, Newspaper } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const isCompact = compact || isPractice;

  return (
    <header
      className={
        isCompact
          ? "dashboard-topbar dashboard-topbar--compact"
          : "dashboard-topbar"
      }
    >
      <Link className="dashboard-brand" href="/roadmap">
        <Image
          alt="DriverLab"
          className="dashboard-brand__logo"
          height={626}
          priority
          src="/brand/driver-lab-logo.svg"
          width={1324}
        />
      </Link>
      <nav className="dashboard-nav" aria-label="Navegacion principal">
        <Link aria-current={isRoadmap ? "page" : undefined} href="/roadmap">
          <MapIcon aria-hidden="true" size={isCompact ? 15 : 17} />
          Roadmap
        </Link>
        <Link aria-current={isPractice ? "page" : undefined} href="/practicar">
          <Car aria-hidden="true" size={isCompact ? 15 : 17} />
          Practicar
        </Link>
        <Link aria-current={isNews ? "page" : undefined} href="/news">
          <Newspaper aria-hidden="true" size={isCompact ? 15 : 17} />
          Noticias
        </Link>
      </nav>
    </header>
  );
}

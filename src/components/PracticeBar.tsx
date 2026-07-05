"use client";

import { Car, Map as MapIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function PracticeBar() {
  return (
    <header className="practice-bar">
      <Link className="practice-bar__brand" href="/roadmap">
        <Image
          alt="DriverLab"
          className="practice-bar__logo"
          height={626}
          priority
          src="/brand/driver-lab-logo.svg"
          width={1324}
        />
      </Link>

      <nav className="practice-bar__nav" aria-label="Navegación principal">
        <Link href="/roadmap">
          <MapIcon aria-hidden="true" size={16} />
          Roadmap
        </Link>
        <Link aria-current="page" href="/practicar">
          <Car aria-hidden="true" size={16} />
          Practicar
        </Link>
      </nav>
    </header>
  );
}

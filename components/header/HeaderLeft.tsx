import Image from "next/image";

export default function HeaderLeft() {
  return (
    <div className="pointer-events-auto flex basis-1/3 items-center justify-start gap-2">
      <Image
        src="/coldrone-logo.png"
        alt="ColDrone"
        width={600}
        height={250}
        priority
        className="h-12 w-auto object-contain"
      />
    </div>
  );
}

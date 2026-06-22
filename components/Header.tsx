import HeaderLeft from "@/components/header/HeaderLeft";
import HeaderCenter from "@/components/header/HeaderCenter";
import HeaderRight from "@/components/header/HeaderRight";

export default function Header() {
  return (
    <header className="pointer-events-none fixed left-0 top-0 z-30 flex h-16 w-full items-center justify-between px-4 sm:px-6">
      <HeaderLeft />
      <HeaderCenter />
      <HeaderRight />
    </header>
  );
}

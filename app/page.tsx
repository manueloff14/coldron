import Header from "@/components/Header";
import Map from "@/components/Map";
import Stats from "@/components/Stats";
import Timeline from "@/components/Timeline";

export default function Home() {
  return (
    <main className="no-scrollbar h-screen w-screen snap-y snap-mandatory overflow-y-scroll scroll-smooth bg-[#0b0f14]">
      <Header />
      <section
        id="map"
        className="relative min-h-screen w-full snap-start snap-always sm:h-screen"
      >
        <Map />
      </section>
      <section
        id="details"
        className="flex min-h-screen w-full snap-start snap-always items-center border-t border-white/5"
      >
        <Stats />
      </section>
      <section
        id="timeline"
        className="flex min-h-screen w-full snap-start snap-always items-center border-t border-white/5"
      >
        <Timeline />
      </section>
    </main>
  );
}

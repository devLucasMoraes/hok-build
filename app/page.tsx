import AppShell from "./components/app-shell";
import { getHeroes, getItems, getManifest } from "@/lib/data-loader";

export default function Home() {
  const heroes = getHeroes();
  const items = getItems();
  const manifest = getManifest();
  return <AppShell heroes={heroes} items={items} manifest={manifest} initialHeroId="angela" />;
}

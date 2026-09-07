import Builder from "./components/builder";
import { getHero, getItems, getManifest } from "@/lib/data-loader";

export default function Home() {
  const hero = getHero("angela");
  const items = getItems();
  const manifest = getManifest();
  return <Builder hero={hero} items={items} manifest={manifest} />;
}

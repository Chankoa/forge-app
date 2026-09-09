import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/shell/PublicShell";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <PublicShell>
      <main className="public-home">
        <section className="public-home__intro">
          <p className="eyebrow"><Sparkles size={16} /> Forge V1</p>
          <h1>Qu&apos;allez-vous construire aujourd&apos;hui ?</h1>
          <p className="lede">Apprendre, comprendre, construire, transmettre. Forge réunit ces gestes dans le même espace.</p>
          <div className="actions">
            <Button href="/app">Ouvrir Forge <ArrowRight size={17} /></Button>
            <Button href="/app/explore" variant="secondary"><Compass size={17} /> Explorer les parcours</Button>
          </div>
        </section>
        <section className="intent-preview" aria-label="Aperçu de l'intention Forge">
          <p className="eyebrow">Une intention</p>
          <p className="intent-preview__prompt">Je veux comprendre les fondations du design de produit.</p>
          <div className="intent-preview__steps"><span>Comprendre</span><span>Structurer</span><span>Partager</span></div>
          <p className="caption">Prévisualisation locale. Forge IA arrive dans une prochaine étape.</p>
        </section>
      </main>
    </PublicShell>
  );
}

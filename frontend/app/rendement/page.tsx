import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { YieldAssetGrid, YieldMechanismStrip } from "@/components/marketing/yield-assets-showcase";
import { YieldPerformanceHistory } from "@/components/marketing/yield-performance-history";

export const metadata = {
  title: "Rendement du gage · Hentsch Credit",
};

// Page dédiée au mécanisme de rendement, contenu déplacé depuis la colonne droite du
// hero (YieldAssetGrid) et le bandeau YieldMechanismStrip de la page d'accueil (cf.
// app/page.tsx, désormais une simple carte de renvoi).
export default function RendementPage() {
  return (
    <MarketingPageShell
      eyebrow="Notre différence"
      title="Les seuls gages qui remboursent une partie de votre crédit à votre place"
      description="Or, argent et ETH génèrent un rendement réel, réinjecté automatiquement dans votre crédit, jusqu'à 60% remboursé sans y penser."
    >
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
        <YieldAssetGrid />
      </div>
      <YieldMechanismStrip />

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Tous les actifs éligibles</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Huit actifs bénéficient du même mécanisme réel de remboursement automatique par
          plus-value, pas seulement l&apos;or, l&apos;argent et l&apos;ETH mis en avant plus haut.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Actifs</th>
                <th className="px-4 py-3 font-medium">Objectif indicatif additionnel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">Métaux précieux</td>
                <td className="px-4 py-3 text-muted-foreground">XAUT, PAXG (or), KAG (argent)</td>
                <td className="px-4 py-3 text-muted-foreground/80">Aucun</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">Cryptomonnaie native</td>
                <td className="px-4 py-3 text-muted-foreground">ETH</td>
                <td className="px-4 py-3 text-muted-foreground/80">Aucun</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">Métaux industriels &amp; matières premières</td>
                <td className="px-4 py-3 text-muted-foreground">XPT, XPD, XCU, WTI</td>
                <td className="px-4 py-3 text-muted-foreground/80">
                  8 à 14% APY (
                  <a href="/strategie-rwa" className="font-medium text-foreground/80 underline underline-offset-2">
                    détail sur Stratégie RWA
                  </a>
                  )
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-foreground">Stablecoins</td>
                <td className="px-4 py-3 text-muted-foreground">DAI, USDT, USDC, dEURO, SHIB*</td>
                <td className="px-4 py-3 text-muted-foreground/80">Non éligibles (valeur fixe ou trop volatile*)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/80">
          * SHIB n&apos;est pas un stablecoin mais reste exclu du mécanisme : sa volatilité est jugée
          trop importante pour asseoir un remboursement récurrent fiable.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Les métaux industriels et matières premières cumulent donc deux mécanismes distincts :
          le remboursement automatique réel décrit sur cette page (identique à l&apos;or, l&apos;argent
          et l&apos;ETH), et un objectif de rendement indicatif propre à la stratégie de trésorerie
          de la banque sur ces actifs, présenté séparément et jamais garanti.
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Performance sur 12 mois</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les cours réels des actifs générateurs de rendement, sur les 365 derniers jours (le
          maximum disponible via notre fournisseur de données de marché, sans engagement sur leur
          performance future).
        </p>
        <div className="mt-4">
          <YieldPerformanceHistory />
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Un exemple concret</h2>
        <div className="mt-4 space-y-3 rounded-2xl border border-border/80 bg-card p-6 text-sm leading-relaxed text-muted-foreground shadow-sm">
          <p>
            Vous déposez <strong className="font-semibold text-foreground">2 000 $</strong> d&apos;or
            tokenisé (XAUT), au cours de{" "}
            <strong className="font-semibold text-foreground">2 400 $ l&apos;once</strong> : votre
            gage représente environ 0,833 once. Au ratio de 350 %, un crédit de{" "}
            <strong className="font-semibold text-foreground">7 000 $</strong> vous est accordé, et le
            plafond de remboursement automatique par rendement est donc de{" "}
            <strong className="font-semibold text-foreground">4 200 $</strong> (60 % de 7 000 $).
          </p>
          <p>
            Le cours de l&apos;or monte à <strong className="font-semibold text-foreground">2 500 $</strong>{" "}
            l&apos;once : la plus-value constatée (100 $ × 0,833 once ≈ 83 $) est automatiquement
            appliquée à votre crédit utilisé, le jour même où elle est constatée. Ce mécanisme se
            répète à chaque hausse ultérieure du cours, jusqu&apos;à atteindre le plafond de 4 200 $.
          </p>
          <p>
            Si le cours baisse ensuite, rien ne vous est repris : la plus-value déjà appliquée reste
            acquise à votre crédit (un « cliquet » qui n&apos;avance que vers le haut). En revanche,
            aucun nouveau remboursement automatique n&apos;a lieu tant que le cours n&apos;a pas
            dépassé le niveau déjà atteint.
          </p>
          <p>
            Une fois le plafond de 60 % épuisé, le solde de crédit restant (au minimum 40 %, ici{" "}
            <strong className="font-semibold text-foreground">2 800 $</strong>) doit être remboursé
            par un versement explicite de votre part (dépôt ou virement), comme pour n&apos;importe
            quel autre crédit.
          </p>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-foreground">Chronologie sur plusieurs mois</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Le même exemple, prolongé : le cours de l&apos;or poursuit sa hausse sur plusieurs mois,
          jusqu&apos;à atteindre le plafond de 60 %.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/80 text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="px-4 py-2.5 font-medium">Mois</th>
                <th className="px-4 py-2.5 text-right font-medium">Cours de l&apos;or</th>
                <th className="px-4 py-2.5 text-right font-medium">Remboursé ce mois</th>
                <th className="px-4 py-2.5 text-right font-medium">Cumul remboursé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 tabular-nums">
              <tr>
                <td className="px-4 py-2.5">0 (verrouillage)</td>
                <td className="px-4 py-2.5 text-right">2 400 $</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground/60">—</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground/60">0 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">1</td>
                <td className="px-4 py-2.5 text-right">2 500 $</td>
                <td className="px-4 py-2.5 text-right">83 $</td>
                <td className="px-4 py-2.5 text-right">83 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">2</td>
                <td className="px-4 py-2.5 text-right">2 470 $ (baisse)</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground/60">0 $</td>
                <td className="px-4 py-2.5 text-right">83 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">6</td>
                <td className="px-4 py-2.5 text-right">3 200 $</td>
                <td className="px-4 py-2.5 text-right">583 $</td>
                <td className="px-4 py-2.5 text-right">666 $</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5">11</td>
                <td className="px-4 py-2.5 text-right">7 448 $</td>
                <td className="px-4 py-2.5 text-right">3 534 $</td>
                <td className="px-4 py-2.5 text-right font-semibold text-foreground">4 200 $ (plafond atteint)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground/80">
          Au mois 2, le cours baisse : aucun remboursement n&apos;a lieu ce mois-là, mais les 83 $
          déjà appliqués au mois 1 restent acquis (cliquet). Une fois le plafond de 4 200 $ atteint
          au mois 11, plus aucun remboursement automatique n&apos;a lieu sur cette position, même si
          le cours continue de monter.
        </p>

        <h2 className="mt-10 text-xl font-semibold text-foreground">Le risque inverse : la liquidation</h2>
        <div className="mt-4 space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/50 p-6 text-sm leading-relaxed text-muted-foreground shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p>
            Le mécanisme ci-dessus profite d&apos;une hausse du cours. Une baisse est traitée
            séparément, par un mécanisme distinct : la valeur de votre gage est comparée
            quotidiennement à sa <strong className="font-semibold text-foreground">valeur d&apos;entrée</strong>{" "}
            (celle constatée au moment du verrouillage), pas au dernier cours ayant déclenché un
            remboursement.
          </p>
          <p>
            En cas de dépréciation d&apos;au moins <strong className="font-semibold text-foreground">30 %</strong>{" "}
            depuis l&apos;entrée, une alerte apparaît sur votre compte, sans autre effet. À{" "}
            <strong className="font-semibold text-foreground">50 %</strong> de dépréciation, votre
            gage est automatiquement retiré du compte (liquidé) à sa valeur d&apos;entrée. Le crédit
            que vous aviez déjà utilisé n&apos;est <strong className="font-semibold text-foreground">pas effacé</strong>{" "}
            pour autant : il reste intégralement dû, désormais sans garantie derrière lui. Une
            garantie liquidée ne peut pas être restituée, même si le cours se redresse ensuite.
          </p>
          <p>
            Le détail contractuel de ce mécanisme figure dans nos{" "}
            <a href="/conditions-generales" className="font-medium text-foreground underline underline-offset-2">
              conditions générales, section 7
            </a>
            .
          </p>
        </div>

        <h3 className="mt-6 text-sm font-semibold text-foreground">Exemple chiffré</h3>
        <div className="mt-3 space-y-2 rounded-2xl border border-amber-200/70 bg-card p-5 text-sm leading-relaxed text-muted-foreground shadow-sm">
          <p>
            Reprenons le dépôt de <strong className="font-semibold text-foreground">2 000 $</strong> d&apos;or
            à 2 400 $ l&apos;once (7 000 $ de crédit accordé), mais cette fois le cours de l&apos;or
            chute au lieu de monter :
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>à 1 680 $ l&apos;once (-30 %) : une alerte apparaît sur le compte, sans autre effet ;</li>
            <li>
              à 1 200 $ l&apos;once (-50 %) : le gage est liquidé. Les 2 000 $ de gage et les 7 000 $ de
              crédit accordé sont retirés du compte. Si vous aviez déjà utilisé{" "}
              <strong className="font-semibold text-foreground">1 500 $</strong> de ce crédit (carte,
              dépenses internes), ces 1 500 $ restent dus, sans plus aucune garantie derrière eux.
            </li>
          </ul>
        </div>

        <h2 className="mt-10 text-xl font-semibold text-foreground">Questions fréquentes</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Le rendement est-il garanti ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Non. Il dépend entièrement de l&apos;évolution réelle du cours de votre gage. Si le
              cours ne monte jamais au-dessus de votre prix d&apos;entrée, aucun remboursement
              automatique n&apos;a lieu : vous remboursez alors l&apos;intégralité par apport
              personnel, exactement comme pour un stablecoin.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Pourquoi les stablecoins (USDT, USDC, DAI…) n&apos;en génèrent-ils pas ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Un stablecoin reste par construction indexé 1:1 sur le dollar : il n&apos;a, par
              définition, aucune plus-value à réaliser. Le rembourser reste néanmoins tout aussi
              simple, par apport personnel.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              À quelle fréquence le remboursement automatique est-il calculé ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Quotidiennement, sur la base du cours spot en direct de votre actif, sans action de
              votre part, et visible dans votre historique de transactions sous le libellé
              « Remboursement par rendement du gage ».
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Le « cliquet » me protège-t-il si le cours baisse ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Il protège uniquement les remboursements déjà appliqués : ils restent acquis, quoi
              qu&apos;il arrive ensuite. Il ne protège pas contre la liquidation, qui se déclenche
              par rapport à la valeur d&apos;entrée de votre gage, pas par rapport au cliquet (cf.
              « Le risque inverse » ci-dessus).
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Si je dépose plusieurs actifs différents, comment ça se passe ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Chaque demande de crédit s&apos;engage sur un seul actif de gage, fixé au moment de la
              génération de l&apos;adresse de dépôt. Pour déposer un second actif, vous soumettez une
              nouvelle demande : chaque position suit alors sa propre plus-value, son propre plafond
              de 60 %, et son propre risque de liquidation, indépendamment des autres.
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">
              Puis-je voir l&apos;historique de mes remboursements automatiques ?
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Oui, dans l&apos;historique des transactions de votre compte, sous le libellé
              « Remboursement par rendement du gage » (un mouvement distinct d&apos;un remboursement
              manuel, pour rester auditable séparément).
            </p>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

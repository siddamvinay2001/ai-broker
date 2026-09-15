import Image from "next/image";
import { humanizeEnumValue, humanizeSlug } from "@/components/format";
import { CallbackButton } from "@/components/broker/CallbackButton";

type BrokerHeroProps = {
  name: string;
  photo: string;
  bio: string;
  reraBrn: string;
  rating: number;
  yearsExperience: number;
  dealsClosed: number;
  avgDealSize: string;
  languages: string[];
  specializationCommunities: string[];
  specializationTypes: string[];
};

export function BrokerHero(props: BrokerHeroProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-hairline bg-ground-raised sm:h-40 sm:w-40">
        {props.photo && (
          <Image src={props.photo} alt={props.name} fill sizes="160px" className="object-cover" />
        )}
      </div>

      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">{props.name}</h1>
        <p className="mt-1 text-xs tracking-wide text-ink-faint uppercase">
          RERA BRN {props.reraBrn}
        </p>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-muted">{props.bio}</p>

        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Stat label="Rating" value={`${props.rating.toFixed(1)} / 5`} />
          <Stat label="Experience" value={`${props.yearsExperience} yrs`} />
          <Stat label="Deals closed" value={String(props.dealsClosed)} />
          <Stat label="Typical deal" value={props.avgDealSize} />
        </div>

        {props.languages.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-1.5">
            {props.languages.map((lang) => (
              <span
                key={lang}
                className="rounded-full border border-hairline px-2.5 py-1 text-[11px] text-ink-faint"
              >
                {lang}
              </span>
            ))}
          </div>
        )}

        {(props.specializationCommunities.length > 0 || props.specializationTypes.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {props.specializationCommunities.map((slug) => (
              <span
                key={slug}
                className="rounded-full border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11px] text-accent-strong"
              >
                {humanizeSlug(slug)}
              </span>
            ))}
            {props.specializationTypes.map((type) => (
              <span
                key={type}
                className="rounded-full border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11px] text-accent-strong"
              >
                {humanizeEnumValue(type)}
              </span>
            ))}
          </div>
        )}

        <CallbackButton brokerName={props.name} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-ink-faint uppercase">{label}</p>
      <p className="mt-0.5 font-display text-lg text-ink">{value}</p>
    </div>
  );
}

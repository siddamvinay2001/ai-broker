import Image from "next/image";
import Link from "next/link";
import { formatAed, formatSqft, humanizeEnumValue, listingTypeLabel } from "@/components/format";

export type ListingProperty = {
  id: string;
  title: string;
  listingType: string;
  propertyType: string;
  price: number;
  beds: number;
  baths: number;
  sizeSqft: number;
  images: string[];
  communityName: string;
};

type ListingPropertyCardProps = {
  property: ListingProperty;
};

export function ListingPropertyCard({ property }: ListingPropertyCardProps) {
  const priceSuffix = property.listingType === "RENT" ? " / year" : "";

  return (
    <Link
      href={`/property/${property.id}`}
      className="group block overflow-hidden rounded-2xl border border-hairline bg-surface/40 transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ground-raised">
        {property.images[0] && (
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full border border-hairline-strong bg-surface-glass px-2.5 py-1 text-xs text-ink backdrop-blur-md">
          {listingTypeLabel(property.listingType)}
        </span>
      </div>

      <div className="p-5">
        <p className="font-display text-lg text-ink">
          {formatAed(property.price)}
          {priceSuffix && <span className="text-sm text-ink-faint">{priceSuffix}</span>}
        </p>
        <h3 className="mt-1 line-clamp-1 text-sm text-ink-muted">{property.title}</h3>

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
          <span>{humanizeEnumValue(property.propertyType)}</span>
          <span>{property.beds} bed</span>
          <span>{property.baths} bath</span>
          {formatSqft(property.sizeSqft) && <span>{formatSqft(property.sizeSqft)}</span>}
        </div>

        <p className="mt-3 text-xs tracking-wide text-ink-faint uppercase">
          {property.communityName}
        </p>
      </div>
    </Link>
  );
}

import PayPalSmartButton from "@/components/PayPalSmartButton";
import type { VaultItemType } from "@/lib/vaultItems";

type StoreProductPayPalProps = {
  categoryId: string;
  categoryTitle: string;
  productTitle: string;
  priceUsd: number;
  skinRarity?: string;
  productImage?: string;
  onPurchaseComplete?: () => void;
};

const StoreProductPayPal = ({
  categoryId,
  categoryTitle,
  productTitle,
  priceUsd,
  skinRarity,
  productImage,
  onPurchaseComplete,
}: StoreProductPayPalProps) => {
  const sku = `store:${categoryId}:${encodeURIComponent(productTitle)}`;
  const vaultType: VaultItemType =
    categoryId === "biblioteca"
      ? "biblioteca"
      : categoryId === "cursos"
        ? "cursos"
        : categoryId === "tickets"
          ? "ticket"
          : "skin";

  return (
    <PayPalSmartButton
      priceUsd={priceUsd}
      description={`OnniVers — ${categoryTitle} — ${productTitle}`.slice(0, 120)}
      eventId={sku}
      vaultType={vaultType}
      vaultTitle={productTitle}
      vaultThumbnailUrl={productImage}
      onPurchaseComplete={onPurchaseComplete}
      notifySource="store"
      productCategoryId={categoryId}
      productCategoryLabel={categoryTitle}
      productTitle={productTitle}
      skinRarity={skinRarity}
    />
  );
};

export default StoreProductPayPal;

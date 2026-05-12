export type VaultItemType = "biblioteca" | "cursos" | "ticket" | "skin";

export type VaultItem = {
  id: string;
  type: VaultItemType;
  title: string;
  priceUsd?: number;
  thumbnailUrl?: string | null;
  createdAt: string;
};

const VAULT_KEY = "ONNIVERSO_VAULT_ITEMS_V1";

type VaultByUser = Record<string, VaultItem[]>;

function readVault(): VaultByUser {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as VaultByUser;
  } catch {
    return {};
  }
}

function writeVault(next: VaultByUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VAULT_KEY, JSON.stringify(next));
}

export function listVaultItems(userId: string): VaultItem[] {
  const vault = readVault();
  return vault[userId] ?? [];
}

export function hasVaultPurchase(userId: string | undefined, type: VaultItemType, title: string): boolean {
  if (!userId) return false;
  return listVaultItems(userId).some((item) => item.type === type && item.title === title);
}

export function addVaultItem(
  userId: string,
  item: Omit<VaultItem, "id" | "createdAt"> & { id?: string; createdAt?: string },
) {
  const vault = readVault();
  const current = vault[userId] ?? [];
  const nextItem: VaultItem = {
    id: item.id ?? crypto.randomUUID(),
    type: item.type,
    title: item.title,
    priceUsd: item.priceUsd,
    thumbnailUrl: item.thumbnailUrl ?? null,
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
  vault[userId] = [nextItem, ...current].slice(0, 80);
  writeVault(vault);
}

import { useEffect, useState } from "react";

export type OnniAulaKnowledgeEntry = {
  title: string;
  shortText: string;
  fullText: string;
  sourceUrl: string;
  askedAt: number;
};

const EVENT_NAME = "onniverso:onni-aula-knowledge";

let currentEntry: OnniAulaKnowledgeEntry | null = null;

function readCurrentEntry(): OnniAulaKnowledgeEntry | null {
  return currentEntry;
}

export function publishOnniAulaKnowledge(entry: Omit<OnniAulaKnowledgeEntry, "askedAt">) {
  currentEntry = { ...entry, askedAt: Date.now() };
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function useOnniAulaKnowledgeEntry() {
  const [entry, setEntry] = useState<OnniAulaKnowledgeEntry | null>(() => readCurrentEntry());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const listener = () => setEntry(readCurrentEntry());
    window.addEventListener(EVENT_NAME, listener);
    return () => window.removeEventListener(EVENT_NAME, listener);
  }, []);

  return entry;
}

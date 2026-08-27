import type { BlockPosition } from "@/lib/page-blocks";

/**
 * Compatibility placeholder for routes created before the visual template
 * studio replaced the page builder. Native route content remains authoritative,
 * so saved legacy blocks can never hide or duplicate a working page.
 */
export function PageBlocks(_props: { page: string; position?: BlockPosition }) {
  return null;
}

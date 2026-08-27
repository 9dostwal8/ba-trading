import type { ReactNode } from "react";
import { CustomBlock } from "@/components/blocks/CustomBlock";
import { NativeSection } from "@/components/blocks/NativeSection";
import { useI18n } from "@/lib/i18n";
import type { PageModule } from "@/lib/page-documents";
import type { PageBlock } from "@/lib/page-blocks";

const TEMPLATE = {
  default: "",
  minimal: "",
  outlined: "mx-3 my-3 overflow-hidden rounded-[var(--section-radius)] border border-border",
  soft: "mx-3 my-3 overflow-hidden rounded-[var(--section-radius)] bg-secondary/60",
  band: "my-3 border-y border-primary/25 bg-primary/5",
  editorial: "mx-3 my-5 border-s-4 border-primary ps-3",
} as const;

const PADDING = { compact: "py-1", normal: "py-2", spacious: "py-5" } as const;

export function EditableModule({ module, children }: { module: PageModule; children: ReactNode }) {
  const { lang } = useI18n();
  if (!module.enabled) return null;
  const title = module.content.title?.[lang] || module.content.title?.en || module.content.title?.ar;
  return (
    <section
      data-builder-module={module.id}
      className={`${module.style.showMobile ? "" : "hidden lg:block"} ${module.style.showDesktop ? "" : "lg:hidden"} ${TEMPLATE[module.style.template]} ${PADDING[module.style.padding]}`}
    >
      {title ? <h2 className="px-3 pb-2 font-display text-[16px] font-black text-foreground">{title}</h2> : null}
      {children}
    </section>
  );
}

export function PageRenderer({
  modules,
  renderModule,
}: {
  modules: PageModule[];
  renderModule?: (module: PageModule) => ReactNode;
}) {
  return (
    <>
      {modules.map((module) => {
        let content = renderModule?.(module);
        if (content === undefined && module.block) {
          const block: PageBlock = {
            id: module.id,
            page: "document",
            kind: module.block.kind,
            sort_order: 0,
            is_active: module.enabled,
            config: module.block.config,
          };
          content = module.block.kind === "section" ? (
            <NativeSection sectionKey={module.block.config.section ?? "featured"} slot={module.block.config.slot} />
          ) : (
            <CustomBlock block={block} />
          );
        }
        if (content === undefined || content === null) return null;
        return <EditableModule key={module.id} module={module}>{content}</EditableModule>;
      })}
    </>
  );
}
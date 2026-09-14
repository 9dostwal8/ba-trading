import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Grid3X3,
  ChevronDown,
  Sun,
  Moon,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  RotateCcw,
  Sparkles,
  Move,
  LogOut,
  MinusCircle,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type PanelItem = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  color?: string; // Gradient or accent color
  badge?: string | number;
};

export type PanelGroup = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
  badge?: string | number;
  items: PanelItem[];
};

// iOS Screen Data Model: Item is either an App or a Folder
export type AppEntry = {
  type: "app";
  key: string;
};

export type FolderEntry = {
  type: "folder";
  id: string;
  name: string;
  appKeys: string[];
};

export type ScreenItem = AppEntry | FolderEntry;

interface DragState {
  source: "root" | "folder";
  itemIndex?: number;
  item: ScreenItem;
  appKey?: string;
  folderId?: string;
}

interface DragOverState {
  targetIndex: number;
  targetItem: ScreenItem;
  mode: "before" | "after" | "group";
}

const L = {
  newGroup: {
    ar: "مجلد جديد",
    ku: "گرووپی نوێ",
    en: "New Folder",
  },
  ungroup: {
    ar: "تفكيك المجلد",
    ku: "هەڵوەشاندنەوەی گرووپ",
    en: "Ungroup Folder",
  },
  removeFromFolder: {
    ar: "إخراج للشاشة الرئيسية",
    ku: "دەرهێنان بۆ شاشەی سەرەکی",
    en: "Move to main screen",
  },
  resetLayout: {
    ar: "إعادة تعيين الترتيب",
    ku: "گەڕانەوە بۆ ڕیزبەندی بنەڕەت",
    en: "Reset Layout",
  },
  resetSuccess: {
    ar: "تمت إعادة تعيين ترتيب التطبيقات",
    ku: "ڕیزبەندی ئەپەکان گەڕێنرایەوە دۆخی بنەڕەت",
    en: "Layout reset to default",
  },
  folderCreated: {
    ar: "تم إنشاء المجلد",
    ku: "گرووپ دروستکرا",
    en: "Folder created",
  },
  itemAddedToFolder: {
    ar: "تمت الإضافة إلى المجلد",
    ku: "زیادکرا بۆ ناو گرووپ",
    en: "Added to folder",
  },
  renameFolder: {
    ar: "تعديل اسم المجلد",
    ku: "گۆڕینی ناوی گرووپ",
    en: "Rename Folder",
  },
  close: {
    ar: "إغلاق",
    ku: "داخستن",
    en: "Close",
  },
};

export function PanelShell({
  groups,
  active,
  onOpen,
  onClose,
  searchQuery = "",
  onSearchChange,
  userId,
  children,
}: {
  title?: string;
  subtitle?: string;
  kpis?: { label: string; value: string }[];
  showKpis?: boolean;
  groups: PanelGroup[];
  active: string | null;
  onOpen: (key: string) => void;
  onClose: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  userId?: string;
  children?: ReactNode;
}) {
  const { lang } = useI18n();
  const Back = lang === "ar" || lang === "ku" ? ChevronRight : ChevronLeft;

  // Storage key per user
  const storageKey = `admin_dashboard_screen_layout_${userId || "default"}`;

  // Dark/Light theme toggle
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_theme_mode");
      if (saved === "dark" || saved === "light") return saved;
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("admin_theme_mode", "dark");
      const surfaceProps = [
        "--card",
        "--background",
        "--foreground",
        "--card-foreground",
        "--border",
        "--input",
        "--popover",
        "--popover-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted-foreground",
        "--design-surface",
      ];
      for (const prop of surfaceProps) {
        document.documentElement.style.removeProperty(prop);
      }
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("admin_theme_mode", "light");
    }
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Flatten all items across all groups into master app map
  const allItems = useMemo(() => {
    return groups.flatMap((g) =>
      g.items.map((item) => ({
        ...item,
        groupLabel: g.label,
        color: item.color || g.color || "from-teal-500 to-emerald-600",
      }))
    );
  }, [groups]);

  const appMap = useMemo(() => {
    const map = new Map<string, PanelItem & { color: string; groupLabel: string }>();
    allItems.forEach((i) => map.set(i.key, i));
    return map;
  }, [allItems]);

  // Screen Layout State (Per-User)
  const [screenItems, setScreenItems] = useState<ScreenItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as ScreenItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Reconcile: ensure all current app keys exist
            const presentKeys = new Set<string>();
            parsed.forEach((item) => {
              if (item.type === "app") presentKeys.add(item.key);
              if (item.type === "folder") item.appKeys.forEach((k) => presentKeys.add(k));
            });

            // Append any new missing apps from code
            const missing = allItems
              .filter((i) => !presentKeys.has(i.key))
              .map((i): AppEntry => ({ type: "app", key: i.key }));

            return [...parsed, ...missing];
          }
        }
      } catch (e) {
        console.warn("Failed to load custom screen layout:", e);
      }
    }
    // Default initial layout: plain list of all apps
    return allItems.map((i): AppEntry => ({ type: "app", key: i.key }));
  });

  // Save layout changes to localStorage
  const saveLayout = (newLayout: ScreenItem[]) => {
    setScreenItems(newLayout);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLayout));
    } catch (e) {
      console.warn("Failed to save layout:", e);
    }
  };

  // Reset to default layout
  const handleResetLayout = () => {
    const defaultLayout: ScreenItem[] = allItems.map((i) => ({ type: "app", key: i.key }));
    saveLayout(defaultLayout);
    toast.success(L.resetSuccess[lang]);
  };

  // Drag and Drop States
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverState, setDragOverState] = useState<DragOverState | null>(null);

  // Active Open Folder Modal State
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const openFolder = useMemo(() => {
    if (!openFolderId) return null;
    return screenItems.find(
      (item): item is FolderEntry => item.type === "folder" && item.id === openFolderId
    ) ?? null;
  }, [screenItems, openFolderId]);

  // Rename Folder State
  const [isEditingFolderName, setIsEditingFolderName] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");

  useEffect(() => {
    if (openFolder) {
      setFolderNameInput(openFolder.name);
      setIsEditingFolderName(false);
    }
  }, [openFolderId]);

  const handleSaveFolderName = () => {
    if (!openFolder) return;
    const cleanName = folderNameInput.trim() || L.newGroup[lang];
    const updated = screenItems.map((item) => {
      if (item.type === "folder" && item.id === openFolder.id) {
        return { ...item, name: cleanName };
      }
      return item;
    });
    saveLayout(updated);
    setIsEditingFolderName(false);
  };

  // Ungroup whole folder
  const handleUngroupFolder = (folderId: string) => {
    const targetFolder = screenItems.find(
      (item): item is FolderEntry => item.type === "folder" && item.id === folderId
    );
    if (!targetFolder) return;

    const folderIndex = screenItems.findIndex((item) => item.type === "folder" && item.id === folderId);
    const extractedApps: AppEntry[] = targetFolder.appKeys.map((k) => ({ type: "app", key: k }));

    const updated = [...screenItems];
    updated.splice(folderIndex, 1, ...extractedApps);
    saveLayout(updated);
    setOpenFolderId(null);
  };

  // Remove single app from folder to root
  const handleRemoveAppFromFolder = (folderId: string, appKey: string) => {
    const targetFolder = screenItems.find(
      (item): item is FolderEntry => item.type === "folder" && item.id === folderId
    );
    if (!targetFolder) return;

    const remainingKeys = targetFolder.appKeys.filter((k) => k !== appKey);
    let updated: ScreenItem[];

    if (remainingKeys.length === 0) {
      // Folder empty -> remove it and place app at root
      updated = screenItems
        .filter((item) => !(item.type === "folder" && item.id === folderId))
        .concat({ type: "app", key: appKey });
      setOpenFolderId(null);
    } else if (remainingKeys.length === 1) {
      // 1 item left -> convert folder back into regular app tile
      const folderIndex = screenItems.findIndex((item) => item.type === "folder" && item.id === folderId);
      updated = [...screenItems];
      updated.splice(folderIndex, 1, { type: "app", key: remainingKeys[0] }, { type: "app", key: appKey });
      setOpenFolderId(null);
    } else {
      // Update folder with remaining keys, place removed app right next to folder
      const folderIndex = screenItems.findIndex((item) => item.type === "folder" && item.id === folderId);
      updated = screenItems.map((item) => {
        if (item.type === "folder" && item.id === folderId) {
          return { ...item, appKeys: remainingKeys };
        }
        return item;
      });
      updated.splice(folderIndex + 1, 0, { type: "app", key: appKey });
    }

    saveLayout(updated);
    toast.success(L.removeFromFolder[lang]);
  };

  // Drag handlers on Root Grid
  const handleDragStart = (item: ScreenItem, index: number, e: React.DragEvent) => {
    const appKey = item.type === "app" ? item.key : undefined;
    setDragState({
      source: "root",
      itemIndex: index,
      item,
      appKey,
    });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (targetItem: ScreenItem, targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!dragState) return;

    // Don't drag over self
    if (dragState.source === "root" && dragState.itemIndex === targetIndex) {
      setDragOverState(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // Check if dragging directly on the center area of target squircle -> "group" mode!
    const isCenterHover = x > width * 0.22 && x < width * 0.78;

    let mode: "before" | "after" | "group";
    if (isCenterHover && dragState.item.type === "app") {
      mode = "group";
    } else {
      mode = x < width / 2 ? "before" : "after";
    }

    setDragOverState({
      targetIndex,
      targetItem,
      mode,
    });
  };

  const handleDragLeave = () => {
    setDragOverState(null);
  };

  const handleDrop = (targetItem: ScreenItem, targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!dragState) return;

    const { item: sourceItem, itemIndex: sourceIndex, appKey: sourceAppKey } = dragState;

    // Scenario A: Dropping onto another item to create or add to a FOLDER
    if (dragOverState?.mode === "group" && sourceAppKey) {
      // 1. Drop app onto an existing Folder
      if (targetItem.type === "folder") {
        if (!targetItem.appKeys.includes(sourceAppKey)) {
          const updated = screenItems
            .filter((_, idx) => idx !== sourceIndex)
            .map((item) => {
              if (item.type === "folder" && item.id === targetItem.id) {
                return { ...item, appKeys: [...item.appKeys, sourceAppKey] };
              }
              return item;
            });
          saveLayout(updated);
          toast.success(L.itemAddedToFolder[lang]);
        }
      }
      // 2. Drop app onto another App -> CREATE NEW FOLDER
      else if (targetItem.type === "app" && targetItem.key !== sourceAppKey) {
        const newFolder: FolderEntry = {
          type: "folder",
          id: `folder_${Date.now()}`,
          name: L.newGroup[lang],
          appKeys: [targetItem.key, sourceAppKey],
        };

        const updated = screenItems.filter(
          (it, idx) => idx !== sourceIndex && idx !== targetIndex
        );
        const insertAt = targetIndex < (sourceIndex ?? 0) ? targetIndex : Math.max(0, targetIndex - 1);
        updated.splice(insertAt, 0, newFolder);

        saveLayout(updated);
        toast.success(L.folderCreated[lang]);
      }
    }
    // Scenario B: Standard Reorder before or after target item
    else if (sourceIndex !== undefined && sourceIndex !== targetIndex) {
      const updated = [...screenItems];
      const [moved] = updated.splice(sourceIndex, 1);
      const insertAt =
        dragOverState?.mode === "after"
          ? targetIndex > sourceIndex
            ? targetIndex
            : targetIndex + 1
          : targetIndex > sourceIndex
          ? targetIndex - 1
          : targetIndex;

      updated.splice(Math.max(0, insertAt), 0, moved);
      saveLayout(updated);
    }

    setDragState(null);
    setDragOverState(null);
  };

  const handleDragEnd = () => {
    setDragState(null);
    setDragOverState(null);
  };

  // Filter items by search query if any
  const isSearchActive = Boolean(searchQuery.trim());
  const searchResults = useMemo(() => {
    if (!isSearchActive) return [];
    const q = searchQuery.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.hint && item.hint.toLowerCase().includes(q))
    );
  }, [allItems, searchQuery, isSearchActive]);

  const activeItem = allItems.find((i) => i.key === active);

  // -------------------------------------------------------------
  // VIEW 1: ACTIVE MODULE WORKSPACE (Odoo Breadcrumb View)
  // -------------------------------------------------------------
  if (activeItem) {
    const ActiveIcon = activeItem.icon;

    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 pb-16 font-sans transition-colors duration-200">
        {/* Minimal Odoo Top Bar with Back to Apps */}
        <div className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 backdrop-blur shadow-2xs">
          <div className="w-full flex items-center justify-between gap-3">
            
            {/* Left: Odoo Apps Breadcrumb */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={onClose}
                className="group flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 hover:bg-[#007979] hover:text-white hover:border-[#007979] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer"
                title={lang === "ar" ? "العودة للتطبيقات" : lang === "ku" ? "گەڕانەوە بۆ ئەپەکان" : "Back to Apps"}
              >
                <Grid3X3 className="size-4" />
                <span>
                  {lang === "ar" ? "التطبيقات" : lang === "ku" ? "ئەپەکان" : "Apps"}
                </span>
                <Back className="size-3 text-slate-400 group-hover:text-white" />
              </button>

              <span className="text-slate-300 dark:text-slate-700 font-light">/</span>

              {/* Current App with quick switch dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                  <span className={`grid size-6 place-items-center rounded-lg bg-gradient-to-tr ${activeItem.color} text-white shadow-xs`}>
                    <ActiveIcon className="size-3.5" />
                  </span>
                  <span className="truncate max-w-[150px] sm:max-w-[280px]">
                    {activeItem.label}
                  </span>
                  <ChevronDown className="size-3 text-slate-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl max-h-80 overflow-y-auto">
                  {allItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.key}
                        onClick={() => onOpen(item.key)}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer ${
                          item.key === active
                            ? "bg-[#007979] text-white"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <span className={`grid size-6 place-items-center rounded-md bg-gradient-to-tr ${item.color} text-white shrink-0`}>
                          <ItemIcon className="size-3" />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right: Theme Toggle + Close App Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                type="button"
                aria-label="Toggle Theme"
                title={
                  theme === "dark"
                    ? (lang === "ku" ? "دۆخی ڕووناک" : lang === "ar" ? "الوضع الفاتح" : "Light Mode")
                    : (lang === "ku" ? "دۆخی تاریک" : lang === "ar" ? "الوضع الداكن" : "Dark Mode")
                }
                className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-[#007979] dark:hover:text-teal-400 transition-colors active:scale-95 cursor-pointer"
              >
                {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-600" />}
              </button>

              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer"
              >
                <X className="size-4" />
                <span className="hidden xs:inline">
                  {lang === "ar" ? "إغلاق" : lang === "ku" ? "داخستن" : "Close"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Tool Content */}
        <div className="w-full p-3 sm:p-6">
          {children}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: IPHONE-STYLE APP & FOLDER GRID WITH DRAG & DROP
  // -------------------------------------------------------------
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-100/90 via-indigo-50/20 to-slate-100/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col justify-start py-6 sm:py-10 px-4 sm:px-8 font-sans transition-colors duration-200 relative">
      
      {/* Top Helper Toolbar: Reset Layout Button */}
      <div className="w-full flex items-center justify-between mb-6 px-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
            {lang === "ku"
              ? "دەتوانیت ئەپەکان ڕابکێشیت و لەسەر یەک دایانبنییت بۆ دروستکردنی گرووپ"
              : lang === "ar"
              ? "اسحب التطبيقات فوق بعضها لإنشاء مجلدات وترتيب الشاشة"
              : "Drag apps over each other to group into folders or reorder"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleResetLayout}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/80 transition active:scale-95 cursor-pointer"
          title={L.resetLayout[lang]}
        >
          <RotateCcw className="size-3.5" />
          <span>{L.resetLayout[lang]}</span>
        </button>
      </div>

      <div className="w-full">
        {/* If Search is Active -> Show Filtered Search List */}
        {isSearchActive ? (
          searchResults.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-12 text-center max-w-md mx-auto my-6">
              <Search className="mx-auto size-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {lang === "ar"
                  ? "لم يتم العثور على أي تطبيق"
                  : lang === "ku"
                  ? "هیچ ئەپێک نەدۆزرایەوە"
                  : "No apps match your search"}
              </p>
              {onSearchChange && (
                <button
                  onClick={() => onSearchChange("")}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#007979] text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                >
                  {lang === "ar" ? "مسح البحث" : lang === "ku" ? "سڕینەوە" : "Clear search"}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 sm:gap-y-10 gap-x-4 sm:gap-x-6 md:gap-x-8 lg:gap-x-10 place-items-center w-full">
              {searchResults.map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.key}
                    onClick={() => onOpen(app.key)}
                    className="group flex flex-col items-center focus:outline-none transition-transform cursor-pointer"
                  >
                    <div className="relative size-20 sm:size-24 md:size-26 lg:size-28 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/40 group-hover:shadow-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-center transition-all duration-200 group-hover:-translate-y-2 group-hover:scale-105 active:scale-95">
                      <span className={`grid size-11 sm:size-13 md:size-15 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-tr ${app.color} text-white shadow-sm`}>
                        <Icon className="size-6 sm:size-7 md:size-8 stroke-[2.2]" />
                      </span>
                    </div>
                    <span className="mt-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white text-center truncate max-w-[90px] sm:max-w-[115px]">
                      {app.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        ) : (
          /* Main Interactive iOS Screen Grid with Folders */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-8 sm:gap-y-10 gap-x-4 sm:gap-x-6 md:gap-x-8 lg:gap-x-10 place-items-center w-full">
            {screenItems.map((item, index) => {
              const isDragging =
                dragState?.source === "root" && dragState?.itemIndex === index;
              const isDragOver =
                dragOverState?.targetIndex === index;
              const isGroupTarget =
                isDragOver && dragOverState?.mode === "group";

              // -------------------------------------------------------------
              // 1. FOLDER SQUIRCLE TILE (Exact iPhone Style)
              // -------------------------------------------------------------
              if (item.type === "folder") {
                const folderApps = item.appKeys
                  .map((k) => appMap.get(k))
                  .filter((a): a is PanelItem & { color: string; groupLabel: string } => Boolean(a));

                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(item, index, e)}
                    onDragOver={(e) => handleDragOver(item, index, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(item, index, e)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "group flex flex-col items-center focus:outline-none select-none transition-all duration-200 cursor-pointer relative",
                      isDragging && "opacity-40 scale-95",
                      isGroupTarget && "scale-110",
                    )}
                  >
                    {/* iPhone Frosted Glass Squircle with 3x3 Mini Icons */}
                    <div
                      onClick={() => setOpenFolderId(item.id)}
                      className={cn(
                        "relative size-20 sm:size-24 md:size-26 lg:size-28 rounded-2xl sm:rounded-3xl bg-slate-200/70 dark:bg-slate-800/80 backdrop-blur-xl border p-2 sm:p-2.5 shadow-sm dark:shadow-slate-950/40 group-hover:shadow-xl transition-all duration-200 group-hover:-translate-y-2 group-hover:scale-105 active:scale-95 flex items-center justify-center overflow-hidden",
                        isGroupTarget
                          ? "border-[#007979] ring-4 ring-[#007979]/30 bg-teal-50/50 dark:bg-teal-950/50"
                          : "border-slate-300/80 dark:border-slate-700/80 group-hover:border-slate-400 dark:group-hover:border-slate-600"
                      )}
                    >
                      {/* 3x3 Mini App Preview Grid */}
                      <div className="grid grid-cols-3 gap-1 sm:gap-1.5 w-full h-full p-0.5 place-items-center">
                        {folderApps.slice(0, 9).map((app) => {
                          const Icon = app.icon;
                          return (
                            <span
                              key={app.key}
                              className={`grid size-4 sm:size-5 md:size-6 place-items-center rounded-md sm:rounded-lg bg-gradient-to-tr ${app.color} text-white shadow-2xs`}
                            >
                              <Icon className="size-2.5 sm:size-3 md:size-3.5 stroke-[2.2]" />
                            </span>
                          );
                        })}
                      </div>

                      {/* Folder Item Count Badge */}
                      <span className="absolute -top-1 -end-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-slate-700 dark:bg-slate-600 text-white shadow-sm">
                        {folderApps.length}
                      </span>
                    </div>

                    {/* Folder Title Underneath */}
                    <span className="mt-2.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white text-center truncate max-w-[90px] sm:max-w-[115px] leading-tight">
                      {item.name}
                    </span>
                  </div>
                );
              }

              // -------------------------------------------------------------
              // 2. SINGLE APP SQUIRCLE TILE (Odoo Style)
              // -------------------------------------------------------------
              const app = appMap.get(item.key);
              if (!app) return null;
              const Icon = app.icon;

              return (
                <div
                  key={app.key}
                  draggable
                  onDragStart={(e) => handleDragStart(item, index, e)}
                  onDragOver={(e) => handleDragOver(item, index, e)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(item, index, e)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "group flex flex-col items-center focus:outline-none select-none transition-all duration-200 cursor-pointer relative",
                    isDragging && "opacity-40 scale-95",
                    isGroupTarget && "scale-110",
                  )}
                >
                  {/* Squircle Tile */}
                  <div
                    onClick={() => onOpen(app.key)}
                    className={cn(
                      "relative size-20 sm:size-24 md:size-26 lg:size-28 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/40 group-hover:shadow-xl border flex items-center justify-center transition-all duration-200 group-hover:-translate-y-2 group-hover:scale-105 active:scale-95",
                      isGroupTarget
                        ? "border-[#007979] ring-4 ring-[#007979]/30 bg-teal-50 dark:bg-teal-950/50"
                        : "border-slate-200/80 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700"
                    )}
                  >
                    {/* Centered Graphic Icon */}
                    <span
                      className={`grid size-11 sm:size-13 md:size-15 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-tr ${app.color} text-white shadow-sm transition-transform duration-200 group-hover:scale-110`}
                    >
                      <Icon className="size-6 sm:size-7 md:size-8 stroke-[2.2]" />
                    </span>

                    {/* Badge if available */}
                    {app.badge && (
                      <span className="absolute -top-1.5 -end-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-sm animate-pulse">
                        {app.badge}
                      </span>
                    )}
                  </div>

                  {/* App Title Underneath */}
                  <span className="mt-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white text-center truncate max-w-[90px] sm:max-w-[115px] transition-colors leading-tight">
                    {app.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          3. IPHONE FOLDER OPEN MODAL OVERLAY (Exact iOS Design)
      ------------------------------------------------------------- */}
      {openFolder && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setOpenFolderId(null)}
        >
          <div
            className="w-full max-w-[360px] sm:max-w-[420px] rounded-[36px] bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/30 dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Editable Folder Name */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/80">
              {isEditingFolderName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={folderNameInput}
                    onChange={(e) => setFolderNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveFolderName();
                      if (e.key === "Escape") setIsEditingFolderName(false);
                    }}
                    autoFocus
                    className="flex-1 bg-white dark:bg-slate-800 border border-[#007979] rounded-xl px-3 py-1.5 text-sm font-black text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveFolderName}
                    className="size-8 rounded-xl bg-[#007979] text-white flex items-center justify-center shrink-0 shadow-xs"
                  >
                    <Check className="size-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingFolderName(true)}
                  className="flex items-center gap-2 group cursor-pointer"
                  title={L.renameFolder[lang]}
                >
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    {openFolder.name}
                  </h2>
                  <Pencil className="size-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              <button
                type="button"
                onClick={() => setOpenFolderId(null)}
                className="size-8 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center transition active:scale-95 shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Folder Apps Grid (3x3) */}
            <div className="grid grid-cols-3 gap-y-6 gap-x-4 place-items-center py-2 max-h-[360px] overflow-y-auto no-scrollbar">
              {openFolder.appKeys.map((appKey) => {
                const app = appMap.get(appKey);
                if (!app) return null;
                const Icon = app.icon;

                return (
                  <div key={app.key} className="group relative flex flex-col items-center">
                    {/* Launch App Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenFolderId(null);
                        onOpen(app.key);
                      }}
                      className="size-18 sm:size-20 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center transition-all duration-150 group-hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <span className={`grid size-11 sm:size-12 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-tr ${app.color} text-white shadow-xs`}>
                        <Icon className="size-6 sm:size-7 stroke-[2.2]" />
                      </span>
                    </button>

                    {/* App Title */}
                    <span className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200 text-center truncate max-w-[85px] leading-tight">
                      {app.label}
                    </span>

                    {/* Remove from folder badge button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAppFromFolder(openFolder.id, app.key);
                      }}
                      title={L.removeFromFolder[lang]}
                      className="absolute -top-1 -end-1 size-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-90"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Folder Footer Actions */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleUngroupFolder(openFolder.id)}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <MinusCircle className="size-3.5" />
                <span>{L.ungroup[lang]}</span>
              </button>

              <span className="text-[10px] font-semibold text-slate-400">
                {openFolder.appKeys.length} apps
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

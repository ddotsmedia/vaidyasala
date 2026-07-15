/** Design system (§4–5): shadcn/ui-style primitives + Vaidyasala compositions. */

export { cn } from "./lib/cn";

// Tier 1 — primitives
export { Button, buttonVariants, type ButtonProps } from "./primitives/button";
export { Input, type InputProps } from "./primitives/input";
export { Badge, badgeVariants, type BadgeProps } from "./primitives/badge";
export { Skeleton } from "./primitives/skeleton";
export { Avatar, AvatarImage, AvatarFallback } from "./primitives/avatar";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./primitives/tabs";
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./primitives/tooltip";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./primitives/dialog";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetTitle,
  type SheetContentProps,
} from "./primitives/sheet";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./primitives/dropdown-menu";
export { ScrollArea } from "./primitives/scroll-area";
export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./primitives/command";
export { Toaster, toast } from "./primitives/toast";

// Tier 2 — platform components
export {
  formatDuration,
  type TopicRef,
  type VideoCardData,
  type VideoCardSize,
  type SearchGroup,
  type SearchGroupItem,
} from "./components/types";
export { TopicChip, type TopicChipProps } from "./components/topic-chip";
export { VideoCard, type VideoCardProps } from "./components/video-card";
export {
  SubscribeCTA,
  type SubscribeCTAProps,
  type SubscribeVariant,
} from "./components/subscribe-cta";
export { RelatedRail, type RelatedRailProps } from "./components/related-rail";
export {
  NewsletterInline,
  type NewsletterInlineProps,
  type NewsletterState,
} from "./components/newsletter-inline";
export { ShareSheet, type ShareSheetProps } from "./components/share-sheet";
export {
  SearchOmnibox,
  type SearchOmniboxProps,
  type ScriptHint,
} from "./components/search-omnibox";

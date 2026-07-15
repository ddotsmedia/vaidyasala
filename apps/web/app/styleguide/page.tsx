"use client";

import * as React from "react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  NewsletterInline,
  RelatedRail,
  SearchOmnibox,
  ShareSheet,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  SubscribeCTA,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TopicChip,
  VideoCard,
  type NewsletterState,
  type SearchGroup,
  type VideoCardData,
} from "@vaidyasala/ui";

const topic = { slug: "prameham", nameMl: "പ്രമേഹം", nameEn: "Diabetes" };
const demoVideo: VideoCardData = {
  slug: "demo",
  titleMl: "പ്രമേഹത്തിന്റെ ലക്ഷണങ്ങളും ചികിത്സയും",
  titleEn: "Diabetes symptoms",
  thumbnailUrl: "https://picsum.photos/seed/vaidyasala/480/270",
  durationSec: 612,
  topic,
  progress: 0.4,
};
const rail: VideoCardData[] = Array.from({ length: 6 }, (_, i) => ({
  ...demoVideo,
  slug: `demo-${i}`,
  progress: undefined,
}));
const searchGroups: SearchGroup[] = [
  {
    heading: "Videos",
    items: [
      { id: "v1", label: "പ്രമേഹം ചികിത്സ", href: "/watch/demo", sublabel: "10:12" },
      { id: "v2", label: "തൈറോയ്ഡ് പ്രശ്നങ്ങൾ", href: "/watch/demo2", sublabel: "8:00" },
    ],
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border py-8">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  const [nl, setNl] = React.useState<NewsletterState>("idle");
  const [omni, setOmni] = React.useState(false);
  const [q, setQ] = React.useState("");

  return (
    <TooltipProvider>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Vaidyasala Styleguide</h1>
        <p className="mt-1 text-sm text-text-dim">Every component, every state — the visual test (§4).</p>

        <Section title="Buttons">
          <Button variant="default">Default</Button>
          <Button variant="brand">Brand</Button>
          <Button variant="cta">Subscribe</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="brand" size="sm">Small</Button>
          <Button variant="brand" size="lg">Large</Button>
          <Button variant="brand" disabled>Disabled</Button>
        </Section>

        <Section title="Badges & chips">
          <Badge>default</Badge>
          <Badge variant="brand">brand</Badge>
          <Badge variant="warm">warm</Badge>
          <Badge variant="cta">cta</Badge>
          <Badge variant="outline">outline</Badge>
          <TopicChip topic={topic} />
          <TopicChip topic={topic} active />
          <TopicChip.Skeleton />
        </Section>

        <Section title="Input & Avatar">
          <Input placeholder="Type here…" className="max-w-xs" />
          <Input placeholder="Disabled" disabled className="max-w-xs" />
          <Avatar>
            <AvatarFallback>VS</AvatarFallback>
          </Avatar>
        </Section>

        <Section title="Skeleton">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="size-16 rounded-full" />
        </Section>

        <Section title="Tabs / Tooltip / Dialog / Sheet / Dropdown">
          <Tabs defaultValue="a" className="w-full max-w-md">
            <TabsList>
              <TabsTrigger value="a">Malayalam</TabsTrigger>
              <TabsTrigger value="b">English</TabsTrigger>
            </TabsList>
            <TabsContent value="a">
              <p lang="ml" className="font-ml text-sm">ട്രാൻസ്ക്രിപ്റ്റ് മലയാളത്തിൽ.</p>
            </TabsContent>
            <TabsContent value="b">
              <p className="text-sm">Transcript in English.</p>
            </TabsContent>
          </Tabs>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog title</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-text-dim">Dialog body content.</p>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle>Sheet title</SheetTitle>
              <p className="mt-3 text-sm text-text-dim">Slide-over content.</p>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Section>

        <Section title="Command (inline)">
          <Command className="w-full max-w-md border border-border">
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup heading="Videos">
                <CommandItem>പ്രമേഹം ചികിത്സ</CommandItem>
                <CommandItem>തൈറോയ്ഡ് പ്രശ്നങ്ങൾ</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </Section>

        <Section title="VideoCard — sizes, progress, skeleton">
          <VideoCard video={demoVideo} size="sm" />
          <VideoCard video={demoVideo} size="md" />
          <VideoCard video={{ ...demoVideo, progress: undefined }} size="md" />
          <VideoCard.Skeleton size="md" />
        </Section>

        <Section title="SubscribeCTA — all variants + skeleton">
          <SubscribeCTA channelUrl="#" subscriberCount={125000} variant="inline" />
          <SubscribeCTA channelUrl="#" subscriberCount={125000} variant="banner" className="w-full max-w-sm" />
          <SubscribeCTA channelUrl="#" subscriberCount={125000} variant="overlay" className="max-w-xs" />
          <SubscribeCTA.Skeleton />
        </Section>

        <Section title="RelatedRail — data, empty, skeleton">
          <RelatedRail title="Watch next" videos={rail} className="w-full" />
          <RelatedRail title="Empty rail" videos={[]} className="w-full" />
          <RelatedRail.Skeleton />
        </Section>

        <Section title="NewsletterInline — all states">
          <div className="flex w-full max-w-sm flex-col gap-3">
            <NewsletterInline state={nl} onSubmit={() => setNl("success")} />
            <div className="flex flex-wrap gap-2">
              {(["idle", "submitting", "success", "error"] as NewsletterState[]).map((s) => (
                <Button key={s} size="sm" variant="ghost" onClick={() => setNl(s)}>
                  {s}
                </Button>
              ))}
            </div>
            <NewsletterInline.Skeleton />
          </div>
        </Section>

        <Section title="ShareSheet & SearchOmnibox">
          <ShareSheet url="https://vaidyasala.live/watch/demo" title="പ്രമേഹം ചികിത്സ" />
          <Button variant="outline" onClick={() => setOmni(true)}>
            Open ⌘K search
          </Button>
          <SearchOmnibox
            open={omni}
            onOpenChange={setOmni}
            query={q}
            onQueryChange={setQ}
            groups={q ? searchGroups : []}
            scriptHint="malayalam"
          />
        </Section>
      </main>
    </TooltipProvider>
  );
}

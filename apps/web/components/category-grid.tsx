import Link from "next/link";
import {
  Activity,
  Apple,
  Baby,
  Bone,
  Brain,
  Droplet,
  Heart,
  Leaf,
  Moon,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { TopicCard } from "@/lib/feeds";

/**
 * Icon per topic. Matched on the slug/English name because Topic has no icon
 * column — adding one would mean an editor has to pick an icon for every topic
 * before the grid looks right. Anything unmatched falls back to a stethoscope,
 * so a new topic still renders sensibly on the day it is created.
 */
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/diabet|prameham|sugar/i, Droplet],
  [/heart|cardio|hridaya/i, Heart],
  [/thyroid|hormone/i, Activity],
  [/brain|mental|stress|neuro/i, Brain],
  [/bone|joint|arthrit|ortho/i, Bone],
  [/food|diet|nutrit|aahaar/i, Apple],
  [/sleep|insomnia|urakkam/i, Moon],
  [/child|baby|kuttikal|pediatric/i, Baby],
  [/ayurved|herbal|aarogya|lifestyle/i, Leaf],
];

function iconFor(topic: TopicCard): LucideIcon {
  const haystack = `${topic.slug} ${topic.nameEn}`;
  return ICON_RULES.find(([re]) => re.test(haystack))?.[1] ?? Stethoscope;
}

/**
 * Health-topic cards (§1.1/§1.3). Two columns on mobile per the mobile-first
 * spec, widening to four on desktop.
 *
 * Empty topics are dropped by default — on a discovery surface like the home
 * page they are a dead end. The /topics index passes `showEmpty` because it is
 * the complete listing and a topic missing from it would look like a bug.
 */
export function CategoryGrid({
  topics,
  limit = 8,
  showEmpty = false,
}: {
  topics: TopicCard[];
  limit?: number;
  showEmpty?: boolean;
}) {
  const shown = (showEmpty ? topics : topics.filter((t) => t.videoCount > 0)).slice(0, limit);
  if (shown.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {shown.map((t) => {
        const Icon = iconFor(t);
        return (
          <li key={t.slug}>
            <Link
              href={`/topics/${t.slug}`}
              className="border-border bg-surface hover:bg-surface-2 focus-visible:outline-focus flex h-full min-h-24 flex-col gap-2 rounded-xl border p-4 transition-colors focus-visible:outline-2"
            >
              <span className="text-brand bg-brand/10 grid size-9 place-items-center rounded-lg">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="font-ml text-sm font-medium leading-[1.7]" lang="ml">
                {t.nameMl}
              </span>
              {t.descriptionMl ? (
                <span
                  className="font-ml text-text-dim line-clamp-2 text-xs leading-[1.7]"
                  lang="ml"
                >
                  {t.descriptionMl}
                </span>
              ) : null}
              <span className="text-text-dim mt-auto text-xs tabular-nums">
                {t.videoCount} {t.videoCount === 1 ? "video" : "videos"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

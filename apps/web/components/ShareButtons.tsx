"use client";

import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  LinkedinIcon,
} from "react-share";

interface ShareButtonsProps {
  url: string;
  title: string;
  text?: string;
}

export function ShareButtons({ url, title, text }: ShareButtonsProps) {
  const shareText = text || title;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FacebookShareButton url={url} hashtag={`#${title.split(" ")[0]}`}>
        <FacebookIcon size={32} round />
      </FacebookShareButton>
      <TwitterShareButton url={url} title={shareText}>
        <TwitterIcon size={32} round />
      </TwitterShareButton>
      <WhatsappShareButton url={url} title={shareText}>
        <WhatsappIcon size={32} round />
      </WhatsappShareButton>
      <LinkedinShareButton url={url} title={shareText} summary={text || ""}>
        <LinkedinIcon size={32} round />
      </LinkedinShareButton>
    </div>
  );
}

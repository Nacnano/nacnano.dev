import {
  Facebook,
  Github,
  Linkedin,
  Mail,
  Mastodon,
  Twitter,
  Youtube,
} from "./icons";

const components = {
  mail: Mail,
  github: Github,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
  mastodon: Mastodon,
};

// Screen readers announce the service, not the raw URL.
const labels: Record<keyof typeof components, string> = {
  mail: "Email",
  github: "GitHub",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  twitter: "X",
  mastodon: "Mastodon",
};

type SocialIconProps = {
  kind: keyof typeof components;
  href: string | undefined;
};

const SocialIcon = ({ kind, href }: SocialIconProps) => {
  if (
    !href ||
    (kind === "mail" &&
      !/^mailto:\w+([.-]?\w+)@\w+([.-]?\w+)(.\w{2,3})+$/.test(href))
  )
    return null;

  const SocialSvg = components[kind];

  return (
    <a
      className="-m-2 flex h-11 w-11 items-center justify-center rounded text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      <span className="sr-only">{labels[kind]}</span>
      {/* Static classes only: a template-literal size would be invisible to
          Tailwind's scanner. */}
      <SocialSvg className="h-5 w-5 fill-current" />
    </a>
  );
};

export default SocialIcon;

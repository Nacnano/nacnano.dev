import siteMetadata from "@/data/siteMetadata";
import SocialIcon from "@/components/social-icons";
import CustomLink from "@/components/Link";

const Footer = () => (
  <footer className="mt-20 border-t border-zinc-200 py-8 dark:border-zinc-800">
    <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        © {new Date().getFullYear()} {siteMetadata.author} ·{" "}
        <CustomLink
          href={siteMetadata.siteRepo}
          className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 rounded underline decoration-zinc-300 underline-offset-4 transition-colors dark:decoration-zinc-700"
        >
          Source
        </CustomLink>{" "}
        ·{" "}
        <CustomLink
          href="/activity"
          className="hover:text-accent-600 hover:decoration-accent-600 dark:hover:text-accent-300 dark:hover:decoration-accent-300 rounded underline decoration-zinc-300 underline-offset-4 transition-colors dark:decoration-zinc-700"
        >
          Activity
        </CustomLink>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-end">
        <SocialIcon kind="github" href={siteMetadata.github} />
        <SocialIcon kind="linkedin" href={siteMetadata.linkedin} />
        <SocialIcon kind="instagram" href={siteMetadata.instagram} />
        <SocialIcon kind="facebook" href={siteMetadata.facebook} />
        <SocialIcon kind="youtube" href={siteMetadata.youtube} />
        <SocialIcon kind="line" href={siteMetadata.line} />
        <SocialIcon kind="discord" href={siteMetadata.discord} />
        <SocialIcon kind="myanimelist" href={siteMetadata.myanimelist} />
        <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} />
      </div>
    </div>
  </footer>
);

export default Footer;

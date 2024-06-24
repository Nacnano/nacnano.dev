import siteMetadata from "@/data/siteMetadata";
import Link from "@/components/Link";
import SocialIcon from "@/components/social-icons";
import CustomLink from "@/components/Link";

const Footer = () => {
  return (
    <footer>
      <div className="flex flex-col mt-16 items-center">
        <div className="mb-3 flex space-x-4">
          <SocialIcon
            kind="mail"
            href={`mailto:${siteMetadata.email}`}
            size={6}
          />
          <SocialIcon kind="github" href={siteMetadata.github} size={6} />
          <SocialIcon kind="facebook" href={siteMetadata.facebook} size={6} />
          <SocialIcon kind="youtube" href={siteMetadata.youtube} size={6} />
          <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size={6} />
          <SocialIcon kind="twitter" href={siteMetadata.twitter} size={6} />
        </div>
        <div className="mb-10 flex md:space-x-2 text-sm align-middle text-gray-500 dark:text-gray-400">
          {/* <div>{siteMetadata.author}</div> */}
          {/* <div>{` • `}</div> */}
          <CustomLink href="/">{siteMetadata.title}</CustomLink>
          {/* <div>{` • `}</div> */}
          <div>{`© ${new Date().getFullYear()}`}</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

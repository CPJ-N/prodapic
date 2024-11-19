import TwitterSVG from "../../../public/twitter.svg";
import GithubSVG from "../../../public/Github.svg";
import Image from "next/image";

const Footer = () => (
  <div className="flex flex-col items-center justify-between bg-gray-100 px-4 py-4 md:flex-row">
    <div className="mb-2 flex-grow pl-0 text-center md:mb-0 md:pl-0 lg:pl-48">
      <span className="text-sm text-gray-600">
        Powered by{" "}
        <a href="https://dub.sh/together-ai" className="text-[#0078D7] hover:text-[#0078D7]/90 underline">
          Together.ai
        </a>{" "}
        &{" "}
        <a href="https://dub.sh/flux-playground" className="text-[#0078D7] hover:text-[#0078D7]/90 underline">
          Flux
        </a>
      </span>
    </div>
    <div className="mb-2 flex space-x-3 md:mb-0">
      <a
        href="https://github.com/CPJ-N/propic"
        className="flex items-center rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Image src={GithubSVG} alt="Twitter" className="mr-1 h-5 w-5" />
        Github
      </a>
      <a
        href="https://x.com/dillikahoon"
        className="flex items-center rounded border border-gray-300 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Image src={TwitterSVG} alt="github" className="mr-1 h-4 w-4" />
        Twitter
      </a>
    </div>
  </div>
);

export default Footer;

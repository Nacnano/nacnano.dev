import CustomLink from "@/components/Link";
import { usePathname } from "next/navigation";

interface Props {
  currentPage;
  totalPages;
}

export default function Pagination({ currentPage, totalPages }: Props) {
  const pathName = usePathname();
  const basePath = pathName.split("/")[1];
  const prevPage = currentPage - 1 > 0;
  const nextPage = currentPage + 1 <= totalPages;
  return (
    <>
      <div className="space-y-2 pb-8 pt-6 md:space-y-5">
        <nav className="flex justify-between">
          {!prevPage && (
            <button
              className="cursor-auto disabled:opacity-50"
              disabled={!prevPage}
            >
              Previous
            </button>
          )}
          {prevPage && (
            <CustomLink
              href={
                currentPage - 1 === 1
                  ? `/${basePath}/`
                  : `/${basePath}/page/${currentPage - 1}`
              }
              rel="prev"
            >
              Previous
            </CustomLink>
          )}
          <span>
            {currentPage} of {totalPages}
          </span>
          {!nextPage && (
            <button
              className="cursor-auto disabled:opacity-50"
              disabled={!nextPage}
            >
              Next
            </button>
          )}
          {nextPage && (
            <CustomLink
              href={`/${basePath}/page/${currentPage + 1}`}
              rel="next"
            >
              Next
            </CustomLink>
          )}
        </nav>
      </div>
    </>
  );
}

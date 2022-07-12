import * as React from "react";
import { RefObject } from "react";
import { PostInfo, RenderedPostInfo } from "uu-types";

interface useHeadingIntersectionObserverProp {
  tocListRef: React.RefObject<HTMLOListElement>;
  linkRefs: RefObject<HTMLLIElement>[];
  headingsToDisplay: RenderedPostInfo["headingsWithId"];
}

export const useHeadingIntersectionObserver = ({
  tocListRef,
  linkRefs,
  headingsToDisplay,
}: useHeadingIntersectionObserverProp) => {
  const [previousSection, setPreviousSelection] = React.useState("");

  React.useEffect(() => {
    // this assumes the <TableOfContents> is placed in a <BlogPostLayout>, which provides the scrolling container
    const tocListContainer = tocListRef.current?.parentElement?.parentElement;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const handleObserver: IntersectionObserverCallback = (entries) => {
      const highlightFirstActive = () => {
        if (!tocListRef.current) return;
        let firstVisibleLink = tocListRef.current.querySelector(
          ".toc-is-visible"
        ) as HTMLLIElement;

        linkRefs.forEach((linkRef) => {
          linkRef.current!.classList.remove("toc-is-active");
        });

        if (
          firstVisibleLink &&
          !firstVisibleLink.classList.contains("toc-is-active")
        ) {
          firstVisibleLink.classList.add("toc-is-active");

          // if the element is beyond the visible area of the container...
          if (
            // the user hasn't requested reduced motion...
            !prefersReducedMotion.matches &&
            tocListContainer &&
            // the link is below the lowest point of the container...
            (tocListContainer.scrollTop + tocListContainer.offsetHeight <
              firstVisibleLink.offsetTop + firstVisibleLink.offsetHeight ||
              // the link is above the highest point of the container...
              tocListContainer.scrollTop > firstVisibleLink.offsetTop)
          ) {
            // ...then scroll to center the link in the container
            tocListContainer?.scrollTo({
              top: Math.max(
                0,
                firstVisibleLink.offsetTop +
                  firstVisibleLink.offsetHeight -
                  tocListContainer.offsetHeight / 2
              ),
              behavior: "smooth",
            });
          }
        }

        if (!firstVisibleLink && previousSection) {
          tocListRef
            .current!.querySelector(`a[href="#${previousSection}"]`)!
            .parentElement!.classList.add("toc-is-active");
        }
      };

      entries.forEach((entry) => {
        let href = `#${entry.target.getAttribute("id")}`,
          link = linkRefs.find(
            (l) => l.current!.firstElementChild!.getAttribute("href") === href
          );

        if (!link || !link.current) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 1) {
          link!.current!.classList.add("toc-is-visible");
          const newPreviousSection = entry.target.getAttribute("id")!;
          setPreviousSelection(newPreviousSection);
        } else {
          link!.current!.classList.remove("toc-is-visible");
        }
      });

      highlightFirstActive();
    };

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "0px",
      threshold: 1,
    });

    const headingsEls = headingsToDisplay!.map((headingToDisplay) => {
      return document.getElementById(headingToDisplay.slug);
    });

    headingsEls
      .filter((a) => a)
      .forEach((heading) => {
        observer.observe(heading!);
      });

    return () => observer.disconnect();
  }, [headingsToDisplay, previousSection, linkRefs, tocListRef]);
};

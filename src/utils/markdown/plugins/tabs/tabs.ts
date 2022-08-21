import { Root } from "hast";
import replaceAllBetween from "unist-util-replace-all-between";
import { Parent, Node } from "unist";
import { Plugin } from "unified";
import { getHeaderNodeId, slugs } from "rehype-slug-custom-id";

interface ElementNode extends Parent {
  tagName: string;
  properties: any;
}

const isNodeHeading = (n: ElementNode) =>
  n.type === "element" && /h[1-6]/.exec(n.tagName);

const findLargestHeading = (nodes: ElementNode[]) => {
  let largestSize = Infinity;
  for (let node of nodes) {
    if (!isNodeHeading(node)) continue;
    const size = parseInt(node.tagName.substr(1), 10);
    largestSize = Math.min(largestSize, size);
  }
  return largestSize;
};

const isNodeLargestHeading = (n: ElementNode, largestSize: number) =>
  isNodeHeading(n) && parseInt(n.tagName.substr(1), 10) === largestSize;

export interface RehypeTabsProps {
  injectSubheaderProps?: boolean;
  tabSlugifyProps?: Parameters<typeof getHeaderNodeId>[1];
}

/**
 * Plugin to add Docsify's tab support.
 * @see https://jhildenbiddle.github.io/docsify-tabs/
 *
 * Given that syntax, output the following:
 * ```
 * <div class="tabs">
 *  <ul role="tablist">
 *    <li role="tab">Header Contents</li>
 *  </ul>
 *  <div role="tabpanel">Body contents</div>
 * </div>
 * ```
 *
 * To align with React Tabs package:
 * @see https://github.com/reactjs/react-tabs
 */
export const rehypeTabs: Plugin<[RehypeTabsProps | never], Root> = ({
  injectSubheaderProps = false,
  tabSlugifyProps = {},
}) => {
  return (tree) => {
    const replaceTabNodes = (nodes: Node[]) => {
      let sectionStarted = false;

      const largestSize = findLargestHeading(nodes as ElementNode[]);

      const tabsContainer = {
        type: "element",
        tagName: "div",
        properties: {
          class: "tabs"
        },
        children: [
          {
            type: "element",
            tagName: "ul",
            properties: {
              role: 'tablist',
              class: "tabs__tab-list"
            },
            children: [] as ElementNode[],
          },
        ],
      };

      for (const localNode of nodes as ElementNode[]) {
        if (!sectionStarted && !isNodeLargestHeading(localNode, largestSize)) {
          continue;
        }
        sectionStarted = true;

        if (isNodeLargestHeading(localNode, largestSize)) {
          // Make sure that all tabs labeled "thing" aren't also labeled "thing2"
          slugs.reset();
          const { id: headerSlug } = getHeaderNodeId(
            localNode,
            tabSlugifyProps
          );

          // - 1 because the tabs are part of the header
          const idx = tabsContainer.children.length - 1;

          const header = {
            type: "element",
            tagName: "li",
            children: localNode.children,
            properties: {
              role: 'tab',
              class: "tabs__tab",
              "data-tabname": headerSlug,
              "aria-selected": idx === 0 ? "true" : 'false',
              "aria-controls": "",
              "id": "",
              tabIndex: idx === 0 ? "0" : "-1"
            },
          };

          const contents = {
            type: "element",
            tagName: "div",
            children: [],
            properties: {
              id: "",
              role: "tabpanel",
              class: "tabs__tab-panel",
              tabindex: 0,
              "aria-labelledby": "",
              ...(idx === 0 ? {} : {hidden: "true"})
            },
          };

          tabsContainer.children[0].children.push(header);

          tabsContainer.children.push(contents);
          continue;
        }

        if (isNodeHeading(localNode) && injectSubheaderProps) {
          // This is `tagName: tab`
          const lastTab =
            tabsContainer.children[0].children[
              tabsContainer.children[0].children.length - 1
            ];

          // Store the related tab ID in the attributes of the header
          localNode.properties["data-tabname"] =
            // Get the last tab's `data-tabname` property
            lastTab.properties["data-tabname"];

          // Add header ID to array
          lastTab.properties["data-headers"] = JSON.stringify(
            JSON.parse(lastTab.properties["data-headers"] ?? "[]").concat(
              localNode.properties.id
            )
          );
        }

        // Push into last `tab-panel`
        tabsContainer.children[tabsContainer.children.length - 1].children.push(
          localNode
        );
      }

      return [tabsContainer];
    };

    replaceAllBetween(
      tree,
      { type: "raw", value: "<!-- tabs:start -->" } as never,
      { type: "raw", value: "<!-- tabs:end -->" } as never,
      replaceTabNodes
    );
    replaceAllBetween(
      tree,
      { type: "comment", value: " tabs:start " } as never,
      { type: "comment", value: " tabs:end " } as never,
      replaceTabNodes
    );
    return tree;
  };
};

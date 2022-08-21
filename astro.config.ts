import { defineConfig, AstroUserConfig } from 'astro/config';

import remarkUnwrapImages from "remark-unwrap-images";
import remarkGfm from "remark-gfm";
import rehypeImageSize from "rehype-img-size";
import remarkEmbedder, { RemarkEmbedderOptions } from "@remark-embedder/core";
import oembedTransformer from "@remark-embedder/transformer-oembed";
// import * as TwitchTransformer from "gatsby-remark-embedder/dist/transformers/Twitch.js";
import rehypeSlug from "rehype-slug-custom-id";
import { parent } from "./src/constants/site-config";
import { rehypeHeaderText } from "./src/utils/markdown/plugins/add-header-text";
import remarkTwoslash from "remark-shiki-twoslash";
import { UserConfigSettings } from "shiki-twoslash";
import { rehypeTabs } from "./src/utils/markdown/plugins/tabs";

// TODO: Create types
import behead from "remark-behead";
import rehypeRaw from "rehype-raw";

import { visit } from "unist-util-visit";
import { EMBED_SIZE } from "./src/utils/markdown/constants";
import { isRelativePath } from "./src/utils/url-paths";
import {fromHtml} from 'hast-util-from-html'

import AutoImport from 'astro-auto-import';
import image from '@astrojs/image';

function escapeHTML(s) { 
	if (!s) return s;
   return s.replace(/&/g, '&amp;')
		   .replace(/"/g, '&quot;')
		   .replace(/</g, '&lt;')
		   .replace(/>/g, '&gt;');
}

export default defineConfig({
	integrations: [
		image(),
		AutoImport({
			imports: [{
				'@astrojs/image/components': ['Image'],
			}],
		}),
	],
	markdown: {
		shikiConfig: {
			theme: "css-variables"
		},
		remarkPlugins: [
			remarkGfm,
			// Remove complaining about "div cannot be in p element"
			remarkUnwrapImages,
			/* start remark plugins here */
			[behead, { after: 0, depth: 1 }],
			// // TODO: Enable
			// [
			// 	remarkEmbedder as any,
			// 	{
			// 	  transformers: [oembedTransformer, [TwitchTransformer, { parent }]],
			// 	} as RemarkEmbedderOptions,
			//   ],
		],
		rehypePlugins: [
			   // Do not add the tabs before the slug. We rely on some of the heading
			   // logic in order to do some of the subheading logic
			   [
				 rehypeSlug,
				 {
				   maintainCase: true,
				   removeAccents: true,
				   enableCustomId: true,
				 },
			   ],
			   [
				 rehypeTabs,
				 {
				   injectSubheaderProps: true,
				   tabSlugifyProps: {
					 enableCustomId: true,
				   },
				 },
			   ],
			   /**
				* Insert custom HTML generation code here
				*/
			   (() => tree => {
				 visit(tree, (node: any) => {
					if (node.tagName === 'img') {
						node.tagName = 'Image'
						// TODO: Remove this
						node.properties.alt = "Test"
					}

				   if (node.tagName === 'iframe') {
					 node.properties.width ??= EMBED_SIZE.w;
					 node.properties.height ??= EMBED_SIZE.h;
					 node.properties.loading ??= 'lazy';
				   }
				   
				   if (node.tagName === 'video') {
					 node.properties.muted ??= true;
					 node.properties.autoPlay ??= true;
					 node.properties.controls ??= true;
					 node.properties.loop ??= true;
					 node.properties.width ??= '100%';
					 node.properties.height ??= 'auto';
				   }
		 
				   if (node.tagName === 'a') {
					 const href = node.properties.href;
					 const isInternalLink = isRelativePath(href || "");
					 if (!isInternalLink) {
					   node.properties.target = "_blank";
					   node.properties.rel = "nofollow noopener noreferrer";
					 }
				   }
		 
				   if (node.tagName === 'table' && !node.properties['has-changed']) {
					 const children = [...node.children];
					 const properties = {...node.properties, "has-changed": true};
					 node.tagName = 'div';
					 node.properties = {
					   class: "table-container"
					 };
					 node.children = [{
					   tagName: 'table',
					   type: "element",
					   children,
					   properties
					 }];
				   }
		 
				   if (
					 node.tagName === 'h1' ||
					 node.tagName === 'h2' ||
					 node.tagName === 'h3' ||
					 node.tagName === 'h4' ||
					 node.tagName === 'h5' ||
					 node.tagName === 'h6'
				   ) {
					 const id = node.properties.id;
					 const headerText = node.properties["data-header-text"]
					 node.properties.style = (node.properties.style||"") + "position: relative;";
		 
					 const headerLinkHTML = `
					 <a
					   href="#${id}"
					   aria-label="Permalink for &quot;${escapeHTML(headerText)}&quot;"
					   class="anchor before"
					 >
					   <svg
						 width="20"
						 height="20"
						 viewBox="0 0 36 36"
						 fill="none"
						 xmlns="http://www.w3.org/2000/svg"
					   >
						 <path
						   d="M8.10021 27.8995C6.14759 25.9469 6.14759 22.7811 8.10021 20.8284L12.6964 16.2322C14.4538 14.4749 17.303 14.4749 19.0604 16.2322L20.121 17.2929C20.7068 17.8787 21.6566 17.8787 22.2423 17.2929C22.8281 16.7071 22.8281 15.7574 22.2423 15.1716L21.1817 14.1109C18.2528 11.182 13.504 11.182 10.5751 14.1109L5.97889 18.7071C2.85469 21.8313 2.85469 26.8966 5.97889 30.0208C9.10308 33.145 14.1684 33.145 17.2926 30.0208L18.3533 28.9602C18.939 28.3744 18.939 27.4246 18.3533 26.8388C17.7675 26.2531 16.8177 26.2531 16.2319 26.8388L15.1713 27.8995C13.2187 29.8521 10.0528 29.8521 8.10021 27.8995Z"
						   fill="#153E67"
						 />
						 <path
						   d="M27.8992 8.10051C29.8518 10.0531 29.8518 13.219 27.8992 15.1716L23.303 19.7678C21.5456 21.5251 18.6964 21.5251 16.939 19.7678L15.8784 18.7071C15.2926 18.1213 14.3428 18.1213 13.7571 18.7071C13.1713 19.2929 13.1713 20.2426 13.7571 20.8284L14.8177 21.8891C17.7467 24.818 22.4954 24.818 25.4243 21.8891L30.0205 17.2929C33.1447 14.1687 33.1447 9.10339 30.0205 5.97919C26.8963 2.855 21.831 2.855 18.7068 5.97919L17.6461 7.03985C17.0604 7.62564 17.0604 8.57539 17.6461 9.16117C18.2319 9.74696 19.1817 9.74696 19.7675 9.16117L20.8281 8.10051C22.7808 6.14789 25.9466 6.14789 27.8992 8.10051Z"
						   fill="#153E67"
						 />
					   </svg>
					 </a>
					 `;
		 
					 const hastHeader = fromHtml(headerLinkHTML, {fragment: true})
					 node.children = [hastHeader, ...node.children];
				   }
				 })
			   })
		]
	} as AstroUserConfig['markdown'] as never
});

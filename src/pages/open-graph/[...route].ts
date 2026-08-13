import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";

const entries = await getCollection("docs");

// Content-layer IDs are extension-less slugs; the root index page has an empty ID.
const pages = Object.fromEntries(entries.map(({ id, data }) => [id || "index", { data }]));

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,

  getImageOptions: async (_, { data }: (typeof pages)[string]) => {
    return {
      title: wrapText(data.title, 18),
      description: wrapText(data.description ?? "", 30),
      border: { width: 32, side: "inline-start" as const },
      padding: 60,
      logo: {
        path: "./src/pages/open-graph/_images/docs-logo.png",
        size: [300],
      },
      bgImage: {
        path: "./src/pages/open-graph/_images/background-ltr.png",
      },
      font: {
        title: {
          size: 72,
          lineHeight: 1.1,
          families: [
            "Obviously",
            "Inter",
            "Noto Sans",
            "Noto Sans Arabic",
            "Noto Sans SC",
            "Noto Sans TC",
            "Noto Sans JP",
            "Noto Sans KR",
          ],
          weight: "Medium" as const,
          color: [255, 255, 255] as [number, number, number],
        },
        description: {
          size: 42,
          lineHeight: 1.1,
          families: [
            "Inter",
            "Noto Sans",
            "Noto Sans Arabic",
            "Noto Sans SC",
            "Noto Sans TC",
            "Noto Sans JP",
            "Noto Sans KR",
          ],
          weight: "Normal" as const,
          color: [191, 193, 201] as [number, number, number],
        },
      },
      fonts: [
        "./src/pages/open-graph/_fonts/inter/inter-400-normal.ttf",
        "./src/pages/open-graph/_fonts/inter/inter-500-normal.ttf",

        "./src/pages/open-graph/_fonts/noto-sans/noto-400-normal.ttf",
        "./src/pages/open-graph/_fonts/noto-sans/noto-500-normal.ttf",

        "./src/pages/open-graph/_fonts/noto-sans/chinese-simplified-400-normal.otf",
        "./src/pages/open-graph/_fonts/noto-sans/chinese-simplified-500-normal.ttf",

        "./src/pages/open-graph/_fonts/noto-sans/chinese-traditional-400-normal.otf",
        "./src/pages/open-graph/_fonts/noto-sans/chinese-traditional-500-normal.ttf",

        "./src/pages/open-graph/_fonts/noto-sans/japanese-400-normal.ttf",
        "./src/pages/open-graph/_fonts/noto-sans/japanese-500-normal.ttf",

        "./src/pages/open-graph/_fonts/noto-sans/arabic-400-normal.ttf",
        "./src/pages/open-graph/_fonts/noto-sans/arabic-500-normal.ttf",

        "./src/pages/open-graph/_fonts/noto-sans/korean-400-normal.otf",
        "./src/pages/open-graph/_fonts/noto-sans/korean-500-normal.ttf",

        "./src/pages/open-graph/_fonts/obviously/obviously-500-normal.otf",
      ],
    };
  },
});

function wrapText(text: string, maxWidth: number): string {
  const words = text.split(" ");
  let currentLine = "";
  let formattedText = "";

  for (const word of words) {
    if ((currentLine + word).length > maxWidth) {
      formattedText += currentLine.trim() + "\n";
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }

  return formattedText + currentLine.trim();
}

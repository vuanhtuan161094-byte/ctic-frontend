import type { Preview } from "@storybook/react-vite";
import { UiRuntime } from "../app/components/UiRuntime";
import "../src/fonts";
import "../app/components/design-system/tokens.css";

document.documentElement.lang = "vi";

const preview: Preview = {
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
    options: { storySort: { order: ["Foundations", "Components"] } },
  },
  initialGlobals: { a11y: { manual: false } },
  decorators: [
    (Story) => (
      <UiRuntime>
        <main
          data-cmp-story
          style={{
            fontFamily: "var(--cmp-font-family)",
            fontSize: "var(--cmp-font-size-md)",
            lineHeight: "var(--cmp-line-height-normal)",
            color: "var(--cmp-text-primary)",
            background: "var(--cmp-surface-raised)",
          }}
        >
          <Story />
        </main>
      </UiRuntime>
    ),
  ],
};

export default preview;

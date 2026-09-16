import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  async viteFinal(config) {
    // Never load installation-specific .env branding/API values in the demo.
    // The application's own Vite config/commands remain untouched.
    return { ...config, envDir: false };
  },
};

export default config;

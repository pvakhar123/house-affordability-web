import { PostHog } from "posthog-node";

let instance: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!instance) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

    instance = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return instance;
}

export async function flushPostHog(): Promise<void> {
  if (instance) {
    await instance.flush();
  }
}

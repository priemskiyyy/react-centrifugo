import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

const post = async (
  request: APIRequestContext,
  endpoint: string,
  data: object,
) => {
  const response = await request.post(`/test-api/${endpoint}`, { data });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
};
const open = async (page: Page, query = "") => {
  const user = randomUUID();
  await page.goto(`/?user=${user}${query}`);
  return user;
};
const subscribed = async (page: Page) => {
  await expect(page.getByTestId("connection")).toHaveText("connected");
  await expect(page.getByTestId("channel")).toHaveText("subscribed");
};
const inspect = async (page: Page) => {
  await page.getByRole("button", { name: "Inspect resources" }).click();
  return JSON.parse(await page.getByTestId("diagnostics").innerText());
};

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("shares an authenticated subscription and releases it after the last consumer", async ({
  page,
  request,
}) => {
  const user = await open(page);
  await subscribed(page);
  expect(await inspect(page)).toMatchObject({
    sockets: 1,
    clients: 1,
    subscriptions: 1,
    publicationListeners: 1,
  });
  await post(request, "publish", {
    channel: `private:${user}`,
    data: { text: "hello" },
  });
  await expect(page.getByTestId("first")).toHaveText('["hello"]');
  await expect(page.getByTestId("second")).toHaveText('["hello"]');
  await page.getByLabel("First consumer").uncheck();
  await post(request, "publish", {
    channel: `private:${user}`,
    data: { text: "second" },
  });
  await expect(page.getByTestId("second")).toHaveText('["hello","second"]');
  await page.getByLabel("Second consumer").uncheck();
  await expect(page.getByTestId("channel")).toHaveText("detached");
  expect(await inspect(page)).toMatchObject({
    subscriptions: 0,
    publicationListeners: 0,
  });
  await expect
    .poll(async () =>
      Object.keys(
        (await post(request, "presence", { channel: `private:${user}` }))
          .presence,
      ),
    )
    .toEqual([]);
  await page.getByLabel("Session enabled").uncheck();
  await expect
    .poll(() => inspect(page))
    .toMatchObject({ sockets: 0, clients: 0 });
});

test("account replacement removes old subscriptions and delivers only the new account's messages", async ({
  page,
  request,
}) => {
  const previous = await open(page);
  await subscribed(page);
  const next = randomUUID();
  await page.getByLabel("User", { exact: true }).fill(next);
  await subscribed(page);
  await expect
    .poll(async () =>
      Object.keys(
        (await post(request, "presence", { channel: `private:${previous}` }))
          .presence,
      ),
    )
    .toEqual([]);
  await post(request, "publish", {
    channel: `private:${previous}`,
    data: { text: "obsolete" },
  });
  await post(request, "publish", {
    channel: `private:${next}`,
    data: { text: "current" },
  });
  await expect(page.getByTestId("first")).toHaveText('["current"]');
  await expect
    .poll(() => inspect(page))
    .toMatchObject({ sockets: 1, clients: 1, subscriptions: 1 });
});

test("refreshes expiring connection and subscription tokens on the existing connection", async ({
  page,
  request,
}) => {
  const user = await open(page, "&refresh");
  await subscribed(page);
  await expect
    .poll(async () => post(request, "requests", { user }))
    .toMatchObject({ connection: 2, subscription: 2 });
  expect(await inspect(page)).toMatchObject({
    sockets: 1,
    clients: 1,
    subscriptions: 1,
  });
  await post(request, "publish", {
    channel: `private:${user}`,
    data: { text: "after refresh" },
  });
  await expect(page.getByTestId("first")).toHaveText('["after refresh"]');
});

test("surfaces invalid connection credentials without opening a subscription", async ({
  page,
}) => {
  await open(page, "&invalid");
  await expect(page.getByTestId("error")).toContainText("invalid token");
  await expect(page.getByTestId("connection")).toHaveText("disconnected");
  await expect
    .poll(() => inspect(page))
    .toMatchObject({ sockets: 0, clients: 0 });
});

test("replays missed publications once after reconnecting", async ({
  page,
  request,
}) => {
  const user = await open(page);
  await subscribed(page);
  await post(request, "publish", {
    channel: `private:${user}`,
    data: { text: "before" },
  });
  await expect(page.getByTestId("first")).toHaveText('["before"]');
  await post(request, "disconnect-and-publish", {
    user,
    channel: `private:${user}`,
    messages: ["missed one", "missed two"],
  });
  await expect(page.getByTestId("recoveries")).toContainText(
    '"wasRecovering":true,"recovered":true',
  );
  await expect(page.getByTestId("first")).toHaveText(
    '["before","missed one","missed two"]',
  );
  expect(await inspect(page)).toMatchObject({
    sockets: 1,
    clients: 1,
    subscriptions: 1,
  });
});

test("reports failed recovery when the history window cannot cover the gap", async ({
  page,
  request,
}) => {
  const user = await open(page);
  await subscribed(page);
  await post(request, "publish", {
    channel: `private:${user}`,
    data: { text: "before" },
  });
  await expect(page.getByTestId("first")).toHaveText('["before"]');
  await post(request, "disconnect-and-publish", {
    user,
    channel: `private:${user}`,
    messages: Array.from({ length: 12 }, (_, index) => `missed ${index}`),
  });
  await expect(page.getByTestId("recoveries")).toContainText(
    '"wasRecovering":true,"recovered":false',
  );
  await subscribed(page);
});

test("repeated consumer, channel, and provider lifecycles return resources to baseline", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await open(page);
  for (const iteration of Array.from({ length: 20 }, (_, index) => index)) {
    await subscribed(page);
    expect(await inspect(page)).toMatchObject({
      sockets: 1,
      clients: 1,
      subscriptions: 1,
      publicationListeners: 1,
    });
    await page.getByLabel("First consumer").uncheck();
    await page.getByLabel("Second consumer").uncheck();
    await expect(page.getByTestId("channel")).toHaveText("detached");
    const detached = await inspect(page);
    expect(detached.subscriptions).toBe(0);
    expect(
      detached.releasedSubscriptionListeners.every(
        (count: number) => count === 0,
      ),
    ).toBe(true);
    await page.getByLabel("Provider mounted").uncheck();
    await expect.poll(async () => (await inspect(page)).sockets).toBe(0);
    await page
      .getByLabel("User", { exact: true })
      .fill(`cycle-${iteration}-${randomUUID()}`);
    await page.getByLabel("Provider mounted").check();
  }
  await page.getByLabel("Provider mounted").uncheck();
  await expect
    .poll(() => inspect(page))
    .toMatchObject({
      sockets: 0,
      clients: 0,
      subscriptions: 0,
      publicationListeners: 0,
    });
  const released = await inspect(page);
  expect(
    released.releasedClientListeners.every((count: number) => count === 0),
  ).toBe(true);
});

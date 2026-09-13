import type { Centrifuge, SubscriptionOptions } from "centrifuge";

export type CentrifugeConfiguration = {
  session: {
    id: string;
    enabled?: boolean;
  };
  transport: ConstructorParameters<typeof Centrifuge>[0];
  options?: ConstructorParameters<typeof Centrifuge>[1];
  getSubscriptionOptions?: (channel: string) => SubscriptionOptions;
};

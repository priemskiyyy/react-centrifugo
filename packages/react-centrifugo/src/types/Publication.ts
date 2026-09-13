import type { PublicationContext } from "centrifuge";

export type Publication = Omit<PublicationContext, "data"> & {
  data: unknown;
};

export type PublicationHandler<TData> = (
  data: TData,
  publication: Publication,
) => void | Promise<unknown>;

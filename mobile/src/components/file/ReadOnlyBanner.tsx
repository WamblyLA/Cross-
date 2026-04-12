import { InlineNotice } from "../common/InlineNotice";

type ReadOnlyBannerProps = {
  text: string;
};

export function ReadOnlyBanner({ text }: ReadOnlyBannerProps) {
  return <InlineNotice text={text} tone="info" />;
}

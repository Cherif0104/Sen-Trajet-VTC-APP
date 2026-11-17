import Link from "next/link";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>;

export function ButtonLink({ className, variant, size, href, prefetch, replace, scroll, ...props }: Props) {
  const classes = cn(buttonVariants({ variant, size }), className);
  // Les routes API (PDF, fichiers, exports) ne doivent pas être préchargées par le routeur.
  if (typeof href === "string" && href.startsWith("/api/")) {
    const anchorProps = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return <a href={href} className={classes} {...anchorProps} />;
  }
  return <Link href={href} prefetch={prefetch} replace={replace} scroll={scroll} className={classes} {...props} />;
}

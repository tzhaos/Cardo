import { useEffect, useState } from 'react';
import { ThemeIcon } from '../../kit/icon';

/**
 * Favicon with globe fallback when missing or load-error.
 * Shared by BookmarkItem, search results, and collection item icons.
 */
export function FaviconImage({
  src,
  size = 13,
  className = 'cardo-website-icon',
}: {
  src?: string | null;
  /** ThemeIcon size when falling back to globe. */
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return <ThemeIcon name="globe" size={size} />;
  }

  return <img className={className} src={src} alt="" onError={() => setBroken(true)} />;
}

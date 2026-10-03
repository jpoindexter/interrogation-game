import Image, { type ImageProps } from 'next/image';
import type { Ref } from 'react';
import dimensions from './asset-dimensions.json';

type AssetImageProps = Omit<ImageProps, 'src' | 'alt'> & { src: string; alt: string; ref?: Ref<HTMLImageElement> };
const assetDimensions: Record<string, number[]> = dimensions;

/** Intrinsic artwork dimensions prevent layout shifts; CSS retains the authored display size. */
export default function AssetImage({ src, alt, width, height, ...props }: AssetImageProps) {
  const [intrinsicWidth, intrinsicHeight] = assetDimensions[src] ?? [256, 256];
  return <Image src={src} alt={alt} width={width ?? intrinsicWidth} height={height ?? intrinsicHeight} {...props} />;
}

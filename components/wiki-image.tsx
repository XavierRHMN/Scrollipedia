'use client';
import { useState, type ComponentProps } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

type WikiImageProps = ComponentProps<typeof Image> & { src: string; fallbackSrc?: string };
// Try the source thumbnail after an optimizer failure, then the original file
// if Wikimedia's thumbnail service is unavailable.
export function WikiImage(props: WikiImageProps) {
  return <SourceImage key={props.src} {...props}/>;
}
function SourceImage({ src, fallbackSrc, alt, ...props }: WikiImageProps) {
  const [direct, setDirect] = useState(false), [failed, setFailed] = useState(false);
  const [original, setOriginal] = useState(false);
  if (failed) return <span className="image-unavailable" role="status"><ImageOff size={20}/><span>Image unavailable</span></span>;
  const vector = /\.svg(?:\?|$)/i.test(src);
  return <Image {...props} src={original ? fallbackSrc! : src} alt={alt} unoptimized={original || direct || vector || props.unoptimized} onError={() => {
    if (!original && !direct && !vector && !props.unoptimized) setDirect(true);
    else if (!original && fallbackSrc && fallbackSrc !== src) setOriginal(true);
    else setFailed(true);
  }}/>;
}

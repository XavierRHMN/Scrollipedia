'use client';
import { useState, type ComponentProps } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

// Optimization may fail independently of Wikimedia. Retry the source once,
// then show a useful state instead of leaving the browser's broken image box.
export function WikiImage(props: ComponentProps<typeof Image> & { src: string }) {
  return <SourceImage key={props.src} {...props}/>;
}
function SourceImage({ src, alt, ...props }: ComponentProps<typeof Image> & { src: string }) {
  const [direct, setDirect] = useState(false), [failed, setFailed] = useState(false);
  if (failed) return <span className="image-unavailable" role="status"><ImageOff size={20}/><span>Image unavailable</span></span>;
  const vector = /\.svg(?:\?|$)/i.test(src);
  return <Image {...props} src={src} alt={alt} unoptimized={direct || vector || props.unoptimized} onError={() => { if (!direct && !vector && !props.unoptimized) setDirect(true); else setFailed(true); }}/>;
}

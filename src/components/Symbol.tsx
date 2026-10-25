type Props = { kind?: 'heart' | 'star' | 'ribbon'; className?: string };

export function Symbol({ kind = 'star', className = '' }: Props) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    {kind === 'heart' ? <path d="M32 51S9 37 9 23c0-12 16-16 23-4 7-12 23-8 23 4 0 14-23 28-23 28Z" />
      : kind === 'ribbon' ? <><path d="M32 29C10 34 9 10 21 13c7 2 11 16 11 16Zm0 0c22 5 23-19 11-16-7 2-11 16-11 16Z"/><path d="M30 30 18 52l-1-11-9 2 22-13Zm4 0 12 22 1-11 9 2-22-13Z"/></>
      : <path d="m32 7 6 18 19 7-19 6-6 19-6-19-19-6 19-7 6-18Z" />}
  </svg>;
}

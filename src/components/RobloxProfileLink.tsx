'use client';

import type { AnchorHTMLAttributes } from 'react';

interface RobloxProfileLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  playerName: string;
}

export function RobloxProfileLink({ playerName, children, ...props }: RobloxProfileLinkProps) {
  return (
    <a
      href={`https://www.roblox.com/users/profile?username=${encodeURIComponent(playerName)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.stopPropagation();
        props.onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

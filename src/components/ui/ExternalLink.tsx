import React from 'react';
import { isRunningInDiscord, discordSdk } from '../../lib/discord';

interface ExternalLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    children: React.ReactNode;
}

export const ExternalLink: React.FC<ExternalLinkProps> = ({ href, children, ...props }) => {
    const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isRunningInDiscord() && discordSdk && href.startsWith('http')) {
            e.preventDefault();
            discordSdk.commands.openExternalLink({ url: href });
        }
    };

    return (
        <a
            {...props}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
                handleLinkClick(e);
                if (props.onClick) props.onClick(e);
            }}
        >
            {children}
        </a>
    );
};

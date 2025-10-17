export type SiteConfig = typeof siteConfig;

export const siteConfig = {
    name: 'MyVote',
    description: "The Computer Science Club's voting system for committee elections.",
    navItems: [
        {
            label: 'Home',
            href: '/',
        },
        {
            label: 'Voting',
            href: '/voting',
        },
        {
            label: 'Candidates',
            href: '/candidates',
        },
        {
            label: 'Positions',
            href: '/positions',
        },
        {
            label: 'Admin',
            href: '/admin',
        },
    ],
    navMenuItems: [
        {
            label: 'Voting',
            href: '/voting',
        },
        {
            label: 'Candidates',
            href: '/candidates',
        },
        {
            label: 'Positions',
            href: '/positions',
        },
        {
            label: 'Admin',
            href: '/admin',
        },
        {
            label: 'Logout',
            href: '/logout',
        },
    ],
    links: {
        github: 'https://github.com/compsci-adl/myvote',
        website: 'https://csclub.org.au',
        discord: 'https://discord.gg/UjvVxHA',
        email: 'mailto:dev@csclub.org.au',
    },
};

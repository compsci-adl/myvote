'use client';

import { Divider, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import { useState } from 'react';
import {
    FaDiscord,
    FaEnvelope,
    FaFacebook,
    FaGithub,
    FaInstagram,
    FaLinkedin,
    FaTiktok,
    FaYoutube,
} from 'react-icons/fa';

const LINKS = [
    { icon: FaEnvelope, link: 'mailto:dev@csclub.org.au' },
    { icon: FaGithub, link: 'https://github.com/compsci-adl' },
    { icon: FaInstagram, link: 'https://www.instagram.com/csclub.adl/' },
    { icon: FaTiktok, link: 'https://www.tiktok.com/@csclub.adl/' },
    { icon: FaFacebook, link: 'https://www.facebook.com/compsci.adl/' },
    { icon: FaDiscord, link: 'https://discord.gg/UjvVxHA' },
    { icon: FaLinkedin, link: 'https://www.linkedin.com/company/compsci-adl/' },
    { icon: FaYoutube, link: 'https://www.youtube.com/@csclub-adl/' },
];

const FOOTER_SECTIONS = [
    {
        title: 'About',
        content:
            "MyVote is the Computer Science Club's voting system designed specifically for committee elections. It provides a secure, user-friendly platform that allows club members to cast their votes easily and transparently, helping ensure fair and efficient election processes.",
    },
    {
        title: 'Disclaimer',
        content:
            'MyVote is a platform created for the Computer Science Club elections. While we strive for accuracy and reliability, please be aware that election data is managed by the CS Club and may be subject to updates or changes to ensure validity.',
    },
    {
        title: 'Privacy',
        content:
            'MyVote collects anonymous analytics data to improve user experience and system performance. Personal voting data is securely handled and not shared with third parties. We are committed to protecting your privacy and maintaining confidentiality throughout the election process.',
    },
];

interface FooterModalProps {
    title: string;
    content: string;
    isOpen: boolean;
    onClose: () => void;
}

const FooterModal = ({ title, content, isOpen, onClose }: FooterModalProps) => (
    <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>
                <p className="mb-4">{content}</p>
            </ModalBody>
        </ModalContent>
    </Modal>
);

export const Footer = () => {
    const [openModal, setOpenModal] = useState<string | null>(null);

    return (
        <footer className="space-y-4 text-apple-gray-700">
            <Divider className="mb-6" />
            <div className="grid grid-cols-2 items-center gap-2 mobile:grid-cols-1 mobile:justify-items-center mobile:gap-4">
                <div className="flex items-center gap-2">
                    <img src="/favicon.svg" alt="Logo" className="w-10" />
                    <h1 className="ml-1 text-xl font-bold text-black">MyVote</h1>
                </div>

                <div className="mt-0 flex gap-6 justify-self-end mobile:justify-self-auto">
                    {FOOTER_SECTIONS.map((section, i) => (
                        <h3
                            key={i}
                            className="cursor-pointer text-sm font-semibold uppercase tracking-wider transition-colors"
                            onClick={() => setOpenModal(section.title)}
                        >
                            {section.title}
                        </h3>
                    ))}
                </div>

                <div className="flex items-center text-sm">
                    <span className="mr-1">&copy; {new Date().getFullYear()}</span>
                    <a href="https://csclub.org.au/" target="_blank" className="underline">
                        The University of Adelaide Computer Science Club
                    </a>
                </div>

                <div className="flex gap-5 justify-self-end text-2xl mobile:justify-self-auto">
                    {LINKS.map(({ icon: Icon, link }, i) => (
                        <a href={link} key={i} className="text-default-500" target="_blank">
                            <Icon />
                        </a>
                    ))}
                </div>
            </div>

            {FOOTER_SECTIONS.map((section) => (
                <FooterModal
                    key={section.title}
                    title={section.title}
                    content={section.content}
                    isOpen={openModal === section.title}
                    onClose={() => setOpenModal(null)}
                />
            ))}
        </footer>
    );
};

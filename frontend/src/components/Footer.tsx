import { Divider } from '@heroui/react';
import {
	FaDiscord,
	FaEnvelope,
	FaFacebook,
	FaGithub,
	FaInstagram,
	FaLinkedin,
} from 'react-icons/fa';

const LINKS = [
	{ icon: FaEnvelope, link: 'mailto:dev@csclub.org.au' },
	{ icon: FaGithub, link: 'https://github.com/compsci-adl/' }, // TODO: Add link
	{ icon: FaInstagram, link: 'https://www.instagram.com/csclub.adl/' },
	{ icon: FaFacebook, link: 'https://www.facebook.com/compsci.adl/' },
	{ icon: FaDiscord, link: 'https://discord.gg/UjvVxHA' },
	{ icon: FaLinkedin, link: 'https://www.linkedin.com/company/compsci-adl/' },
];

// const FOOTER_SECTIONS = [
// 	{
// 		title: 'About',
// 		content:
// 			'MyTimetable, created by the CS Club Open Source Team, is a drag-and-drop timetable planner designed for University of Adelaide students. It allows students to easily organise, customise, and visualise their class timetables, helping them avoid clashes and optimise their weekly schedules.',
// 	},
// 	{
// 		title: 'Disclaimer',
// 		content:
// 			'MyTimetable is NOT an official University of Adelaide website. While we strive to provide accurate and up-to-date information, please be aware that the data may not always reflect the latest changes or updates.',
// 	},
// 	{
// 		title: 'Privacy',
// 		content:
// 			'MyTimetable collects anonymous analytics data to help improve user experience and enhance the functionality of the website. We may share collective data with relevant third parties to provide insights into user engagement and improve our services. We are committed to protecting your privacy and will not share any personally identifiable information.',
// 	},
// ];

export const Footer = () => {
	return (
		<footer className="mx-6 text-apple-gray-700 md:mx-12 lg:mx-24">
			<Divider className="mb-4" />
			<div className="grid grid-cols-2 items-center gap-2 mobile:grid-cols-1 mobile:justify-items-center mobile:gap-4">
				<div className="flex items-center gap-2">
					<img src="/favicon.svg" alt="Logo" className="w-10" />
					<h1 className="ml-1 text-xl font-bold text-foreground">MyVote</h1>
				</div>

				<div className="mt-0 flex gap-6 justify-self-end mobile:justify-self-auto">
					<h3 className="cursor-pointer text-sm font-semibold uppercase tracking-wider transition-colors hover:text-primary">
						About
					</h3>
					{/* {FOOTER_SECTIONS.map((section, i) => (
						<h3
							key={i}
							className="cursor-pointer text-sm font-semibold uppercase tracking-wider transition-colors hover:text-primary"
							onClick={() => setOpenModal(section.title)}
						>
							{section.title}
						</h3>
					))} */}
				</div>

				<div className="flex items-center text-sm">
					<span className="mr-1">&copy; {new Date().getFullYear()}</span>
					<a
						href="https://csclub.org.au/"
						target="_blank"
						className="underline"
					>
						The University of Adelaide Computer Science Club
					</a>
				</div>

				<div className="flex gap-5 justify-self-end text-2xl mobile:justify-self-auto">
					{LINKS.map(({ icon: Icon, link }, i) => (
						<a
							href={link}
							key={i}
							className="transition-colors duration-300 hover:text-primary"
							target="_blank"
						>
							<Icon />
						</a>
					))}
				</div>
			</div>
		</footer>
	);
};

import { Code } from '@heroui/code';
import { Link } from '@heroui/link';
import { Snippet } from '@heroui/snippet';
import { button as buttonStyles } from '@heroui/theme';

import { GithubIcon } from '@/components/icons';
import { subtitle, title } from '@/components/primitives';
import { siteConfig } from '@/config/site';

export default function Home() {
    return (
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
            <div className="inline-block max-w-xl justify-center text-center">
                <span className={title()}>Make&nbsp;</span>
                <span className={title({ color: 'violet' })}>beautiful&nbsp;</span>
                <br />
                <span className={title()}>websites regardless of your design experience.</span>
                <div className={subtitle({ class: 'mt-4' })}>
                    Beautiful, fast and modern React UI library.
                </div>
            </div>

            <div className="flex gap-3">
                <Link
                    isExternal
                    className={buttonStyles({
                        color: 'primary',
                        radius: 'full',
                        variant: 'shadow',
                    })}
                    href={siteConfig.links.docs}
                >
                    Documentation
                </Link>
                <Link
                    isExternal
                    className={buttonStyles({ variant: 'bordered', radius: 'full' })}
                    href={siteConfig.links.github}
                >
                    <GithubIcon size={20} />
                    GitHub
                </Link>
            </div>

            <div className="mt-8">
                <Snippet hideCopyButton hideSymbol variant="bordered">
                    <span>
                        Get started by editing <Code color="primary">app/page.tsx</Code>
                    </span>
                </Snippet>
            </div>
        </section>
    );
}

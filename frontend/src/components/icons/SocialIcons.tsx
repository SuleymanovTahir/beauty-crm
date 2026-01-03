import { Instagram, MessageCircle, Send, Music } from 'lucide-react';
import { cn } from '../../lib/utils';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    colorful?: boolean;
    className?: string;
}

export const InstagramIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <Instagram
        size={typeof size === 'string' ? undefined : size}
        className={cn(
            colorful ? "text-[#E1306C]" : "currentColor",
            className
        )}
        {...props}
    />
);

export const WhatsAppIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <MessageCircle
        size={typeof size === 'string' ? undefined : size}
        className={cn(
            colorful ? "text-[#25D366]" : "currentColor",
            className
        )}
        {...props}
    />
);

export const TelegramIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <Send
        size={typeof size === 'string' ? undefined : size}
        className={cn(
            colorful ? "text-[#0088cc]" : "currentColor",
            className
        )}
        {...props}
    />
);

export const TikTokIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <Music
        size={typeof size === 'string' ? undefined : size}
        className={cn(
            colorful ? "text-black dark:text-white" : "currentColor",
            className
        )}
        {...props}
    />
);

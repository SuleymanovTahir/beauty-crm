import { cn } from '../../lib/utils';

interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
    colorful?: boolean;
    className?: string;
}

export const InstagramIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn(className, "transition-transform duration-300")}
        {...props}
    >
        {colorful && (
            <defs>
                <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
            </defs>
        )}
        <path
            fill={colorful ? "url(#instagram-gradient)" : "currentColor"}
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
        />
    </svg>
);

export const WhatsAppIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn(className, "transition-transform duration-300")}
        {...props}
    >
        {colorful && (
            <defs>
                <linearGradient id="whatsapp-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#25D366" />
                    <stop offset="100%" stopColor="#128C7E" />
                </linearGradient>
            </defs>
        )}
        <path
            fill={colorful ? "url(#whatsapp-gradient)" : "currentColor"}
            d="M.057 24l1.687-6.163A11.867 11.867 0 010 12.145C0 5.437 5.448 0 12.145 0c3.25 0 6.305 1.266 8.604 3.56a12.088 12.088 0 013.56 8.585c0 6.711-5.448 12.154-12.145 12.154a11.972 11.972 0 01-5.688-1.446L.057 24zm6.651-4.043l.407.241a9.927 9.927 0 005.111 1.419c5.567 0 10.098-4.526 10.103-10.1a9.97 9.97 0 00-2.957-7.141A9.946 9.946 0 0012.215 1.433c-5.567 0-10.103 4.531-10.103 10.103a9.96 9.96 0 001.536 5.309l.265.421-1.11 4.053 4.254-1.118zM17.65 14.5c-.301-.151-1.78-.879-2.057-.978-.276-.1-.477-.151-.678.151-.201.3-.778.978-.953 1.179-.176.2-.351.226-.653.076-.301-.151-1.274-.469-2.425-1.496-.896-.799-1.5-1.786-1.676-2.087-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.151-.176.201-.301.301-.502.1-.2.05-.376-.025-.527-.075-.151-.678-1.631-.929-2.234-.244-.588-.492-.508-.678-.517-.176-.01-.376-.01-.577-.01s-.527.075-.803.376c-.276.3-1.054 1.029-1.054 2.509s1.079 2.909 1.229 3.11c.151.2 2.124 3.243 5.145 4.545.719.31 1.279.494 1.716.633.722.23 1.38.197 1.898.121.579-.085 1.78-.727 2.031-1.43.25-.703.25-1.305.176-1.43s-.276-.226-.577-.377z"
        />
    </svg>
);

export const TelegramIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn(className, "transition-transform duration-300")}
        {...props}
    >
        {colorful && (
            <defs>
                <linearGradient id="telegram-gradient" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#2AABEE" />
                    <stop offset="100%" stopColor="#229ED9" />
                </linearGradient>
            </defs>
        )}
        <path
            fill={colorful ? "url(#telegram-gradient)" : "currentColor"}
            d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.526.26l.163-2.924 5.344-4.825c.232-.206-.05-.32-.358-.115L8.383 14.13l-2.84-.888c-.618-.193-.628-.618.128-.913l11.104-4.28c.514-.186.963.123.719.172z"
        />
    </svg>
);

export const TikTokIcon = ({ size = 24, colorful = false, className, ...props }: IconProps) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn(className, "transition-transform duration-300")}
        {...props}
    >
        {colorful && (
            <defs>
                <filter id="tiktok-shadow">
                    <feOffset dx="-1" dy="-1" in="SourceGraphic" result="shadow1" />
                    <feFlood floodColor="#25F4EE" result="color1" />
                    <feComposite in="color1" in2="shadow1" operator="in" result="shadow1" />
                    <feOffset dx="1" dy="1" in="SourceGraphic" result="shadow2" />
                    <feFlood floodColor="#FE2C55" result="color2" />
                    <feComposite in="color2" in2="shadow2" operator="in" result="shadow2" />
                    <feMerge>
                        <feMergeNode in="shadow1" />
                        <feMergeNode in="shadow2" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        )}
        <path
            fill={colorful ? "black" : "currentColor"}
            filter={colorful ? "url(#tiktok-shadow)" : undefined}
            d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.5a4.85 4.85 0 01-1.04-.1z"
        />
    </svg>
);

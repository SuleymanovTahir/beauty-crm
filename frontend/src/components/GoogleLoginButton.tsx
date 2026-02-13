import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
    DEFAULT_PLATFORM_GATES,
    getRoleHomePathByGates,
    normalizePlatformGates,
} from '../utils/platformRouting';

declare global {
    interface Window {
        google: any;
    }
}

interface GoogleLoginButtonProps {
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    className?: string;
}

export default function GoogleLoginButton({ text = "signin_with", className }: GoogleLoginButtonProps) {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [isGoogleLoaded, setIsGoogleLoaded] = React.useState(false);
    const [clientIdError, setClientIdError] = React.useState(false);

    useEffect(() => {
        const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        // Check if ID is missing or is the default placeholder 
        if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "YOUR_GOOGLE_CLIENT_ID_HERE") {
            setClientIdError(true);
            return;
        }

        const checkGoogle = setInterval(() => {
            if (window.google) {
                clearInterval(checkGoogle);
                setIsGoogleLoaded(true);
                initializeGoogle();
            }
        }, 100);

        // Timeout backup
        const timeout = setTimeout(() => {
            clearInterval(checkGoogle);
            if (!window.google) {
                console.error("Google script failed to load within 5 seconds");
            }
        }, 5000);

        return () => {
            clearInterval(checkGoogle);
            clearTimeout(timeout);
        };
    }, []);

    const initializeGoogle = () => {
        const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

        try {
            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
            });

            const parent = document.getElementById("googleSignInContainer");
            const width = parent ? parent.offsetWidth : undefined;

            window.google.accounts.id.renderButton(
                document.getElementById("googleSignInDiv"),
                {
                    theme: "outline",
                    size: "large",
                    text: text,
                    width: width,
                    logo_alignment: "left"
                }
            );
        } catch (e) {
            console.error("Error initializing Google Sign-In:", e);
        }
    };

    const handleCredentialResponse = async (response: any) => {
        try {
            const res = await api.googleLogin(response.credential);

            if (res.success && res.user) {
                login(res.user);
                toast.success(`Welcome back, ${res.user.full_name || res.user.username}!`);
                let gates = DEFAULT_PLATFORM_GATES;
                try {
                    const gateResponse = await api.getPlatformGates();
                    gates = normalizePlatformGates(gateResponse);
                } catch (gateError) {
                    console.error("Platform gate loading error:", gateError);
                }
                navigate(getRoleHomePathByGates(res.user.role, gates.site_enabled, gates.crm_enabled));
            } else {
                if (res.error_type === "not_approved") {
                    toast.error(res.message);
                } else {
                    toast.error(res.error || "Login failed");
                }
            }
        } catch (err: any) {
            console.error("Google login error:", err);
            if (err.error_type === "not_approved") {
                toast.error(err.message || "Account not approved");
            } else {
                toast.error(err.message || "Login failed");
            }
        }
    };

    if (clientIdError) {
        return (
            <div className={`w-full p-4 border-2 border-dashed border-red-300 rounded-lg bg-red-50 text-center ${className}`}>
                <p className="text-red-700 font-medium text-sm mb-2">Требуется настройка Google входа</p>
                <p className="text-red-600 text-xs text-wrap break-words">
                    Пожалуйста, добавьте <code className="bg-red-100 p-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> в ваш файл frontend/.env. Получите ID в Google Cloud Console.
                </p>
            </div>
        );
    }

    return (
        <div id="googleSignInContainer" className={`w-full ${className}`}>
            {!isGoogleLoaded && (
                <div className="w-full h-[40px] bg-gray-100 animate-pulse rounded border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                    Загрузка Google входа...
                </div>
            )}
            <div id="googleSignInDiv" className={`w-full flex justify-center h-[40px] [&>iframe]:!w-full [&>iframe]:!h-full ${!isGoogleLoaded ? 'hidden' : ''}`}></div>
        </div>
    );
}

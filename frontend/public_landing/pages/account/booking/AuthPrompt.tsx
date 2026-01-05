import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ArrowRight, User, Calendar, Info } from 'lucide-react';

interface AuthPromptProps {
    onGuestContinue: () => void;
    onAuthSuccess: (userData: any) => void;
}

export function AuthPrompt({ onGuestContinue, onAuthSuccess }: AuthPromptProps) {
    const { t } = useTranslation(['booking', 'common']);
    const [mode, setMode] = useState<'initial' | 'email'>('initial');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');
    const [birthday, setBirthday] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailContinue = () => {
        if (!email.includes('@')) return;
        setMode('email');
    };

    const handleGoogleLogin = () => {
        // Mock Google login
        window.location.href = '/api/auth/google'; // Hypothetical
    };

    const handleRegister = async () => {
        setLoading(true);
        // Here we would call an API to register/login with email + additional info
        // For now, let's mock it
        setTimeout(() => {
            setLoading(false);
            onAuthSuccess({ email, name, gender, birthday });
        }, 1000);
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
            <AnimatePresence mode="wait">
                {mode === 'initial' ? (
                    <motion.div
                        key="initial"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                                {t('auth.welcome', 'Welcome')}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {t('auth.subtitle', 'Sign in to save your booking history and earn loyalty points')}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleGoogleLogin}
                                className="w-full h-12 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold flex items-center justify-center gap-3 rounded-xl transition-all"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18">
                                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                                    <path fill="#FBBC05" d="M3.964 10.705c-.181-.54-.285-1.116-.285-1.705s.104-1.165.285-1.705V4.963H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.037l3.007-2.332z" />
                                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.443 2.027.957 4.963L3.964 7.295C4.672 5.163 6.656 3.58 9 3.58z" />
                                </svg>
                                {t('auth.continue_google', 'Continue with Google')}
                            </Button>

                            <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-3 text-gray-400 font-bold tracking-widest">{t('auth.or', 'OR')}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        type="email"
                                        placeholder={t('auth.email_placeholder', 'Enter your email')}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 h-12 bg-gray-50 border-gray-100 focus:bg-white transition-all rounded-xl"
                                    />
                                </div>
                                <Button
                                    onClick={handleEmailContinue}
                                    disabled={!email.includes('@')}
                                    className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-xl transition-all"
                                >
                                    {t('auth.continue_email', 'Continue with Email')}
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4 text-center">
                            <button
                                onClick={onGuestContinue}
                                className="text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                            >
                                {t('auth.guest_continue', 'Continue as Guest')}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="email"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => setMode('initial')} className="text-gray-400 hover:text-gray-900">
                                <ArrowRight className="w-5 h-5 rotate-180" />
                            </button>
                            <h3 className="text-xl font-bold text-gray-900">{t('auth.complete_profile', 'Complete Profile')}</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
                                    {t('auth.full_name', 'Full Name')}
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder={t('auth.name_placeholder', 'Your Name')}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10 h-11 bg-gray-50 border-gray-100 focus:bg-white transition-all rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
                                        {t('auth.gender', 'Gender')}
                                    </label>
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 transition-all"
                                    >
                                        <option value="">{t('auth.select', 'Select')}</option>
                                        <option value="female">{t('auth.female', 'Female')}</option>
                                        <option value="male">{t('auth.male', 'Male')}</option>
                                        <option value="other">{t('auth.other', 'Other')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
                                        {t('auth.birthday', 'Birthday')}
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="date"
                                            value={birthday}
                                            onChange={(e) => setBirthday(e.target.value)}
                                            className="pl-10 h-11 bg-gray-50 border-gray-100 focus:bg-white transition-all rounded-xl text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] text-blue-600 leading-normal">
                                    {t('auth.info_note', 'We use this information to provide personalized offers and special birthday gifts.')}
                                </p>
                            </div>

                            <Button
                                onClick={handleRegister}
                                disabled={loading || !name}
                                className="w-full h-12 bg-gray-900 text-white hover:bg-gray-800 font-bold rounded-xl transition-all mt-4 shadow-lg"
                            >
                                {loading ? t('loading', 'Wait...') : t('auth.create_account', 'Create Account')}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <p className="mt-8 text-[10px] text-center text-gray-400 leading-relaxed px-4">
                By continuing, you acknowledge you have read and agree to our
                <span className="text-gray-900 font-bold ml-1">Terms of Service</span> and
                <span className="text-gray-900 font-bold ml-1">Privacy Policy</span>.
            </p>
        </div>
    );
}

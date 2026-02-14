import { useState, useEffect } from 'react';
import { Save, Users, Activity, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@site/components/ui/card';
import { Button } from '@site/components/ui/button';
import { Input } from '@site/components/ui/input';
import { Label } from '@site/components/ui/label';
import { Switch } from '@site/components/ui/switch';
import { toast } from 'sonner';
import { buildApiUrl } from '@site/api/client';

interface FeatureConfig {
    enabled: boolean;
    start_date?: string;
    end_date?: string;
    whitelist?: number[];
}

interface AllFeaturesConfig {
    [key: string]: FeatureConfig;
}

const FEATURE_KEYS = [
    { key: 'loyalty_program', label: 'features.loyalty_program', icon: GiftIcon },
    { key: 'referral_program', label: 'features.referral_program', icon: UsersIcon },
    { key: 'challenges', label: 'features.challenges', icon: TrophyIcon }
];

// Icons
function GiftIcon({ className }: { className?: string }) {
    return <Activity className={className} />;
}
function UsersIcon({ className }: { className?: string }) {
    return <Users className={className} />;
}
function TrophyIcon({ className }: { className?: string }) {
    return <Trophy className={className} />;
}

export default function FeatureManagement() {
    const { t } = useTranslation(['adminpanel/featuremanagement', 'common']);
    const [config, setConfig] = useState<AllFeaturesConfig>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const response = await fetch(buildApiUrl('/api/admin/features'), { credentials: 'include' });
            const data = await response.json();
            // Ensure we have defaults for all keys
            const defaults: AllFeaturesConfig = {};
            FEATURE_KEYS.forEach(f => {
                defaults[f.key] = { enabled: false };
            });
            setConfig({ ...defaults, ...data });
        } catch (error) {
            console.error('Error loading features:', error);
            toast.error(t('toasts.failed_load', 'Failed to load feature configuration'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch(buildApiUrl('/api/admin/features'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(config),
            });

            if (response.ok) {
                toast.success(t('toasts.saved', 'Configuration saved successfully'));
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast.error(t('toasts.failed_save', 'Failed to save configuration'));
        }
    };

    const updateFeature = (key: string, updates: Partial<FeatureConfig>) => {
        setConfig(prev => ({
            ...prev,
            [key]: { ...prev[key], ...updates }
        }));
    };

    const updateWhitelist = (key: string, value: string) => {
        // Parse comma separated IDs
        const ids = value.split(',')
            .map(s => s.trim())
            .filter(s => /^\d+$/.test(s))
            .map(s => parseInt(s));

        updateFeature(key, { whitelist: ids });
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{t('title', 'Feature Management')}</h1>
                    <p className="text-gray-500 mt-1">{t('subtitle', 'Manage availability of key platform features')}</p>
                </div>
                <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    {t('buttons.save', 'Save Changes')}
                </Button>
            </div>

            <div className="grid gap-6">
                {FEATURE_KEYS.map(({ key, label, icon: Icon }) => {
                    const feature = config[key] || { enabled: false };
                    const isEnabled = feature.enabled;

                    return (
                        <Card key={key} className={isEnabled ? '' : 'bg-gray-50 border-gray-200'}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-pink-100 text-pink-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-semibold">{t(label)}</CardTitle>
                                        <CardDescription>{isEnabled ? t('status.active', 'Active') : t('status.disabled', 'Disabled')}</CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor={`switch-${key}`} className="text-sm font-medium">
                                        {isEnabled ? t('status.enabled', 'Enabled') : t('status.disabled_switch', 'Disabled')}
                                    </Label>
                                    <Switch
                                        id={`switch-${key}`}
                                        checked={isEnabled}
                                        onCheckedChange={(checked) => updateFeature(key, { enabled: checked })}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {isEnabled && (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex flex-col space-y-2">
                                                <Label>{t('scheduling.label', 'Scheduling (Optional)')}</Label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-xs text-gray-500 mb-1 block">{t('scheduling.start_date', 'Start Date')}</span>
                                                        <Input
                                                            type="date"
                                                            value={feature.start_date || ''}
                                                            onChange={(e) => updateFeature(key, { start_date: e.target.value || undefined })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-500 mb-1 block">{t('scheduling.end_date', 'End Date')}</span>
                                                        <Input
                                                            type="date"
                                                            value={feature.end_date || ''}
                                                            onChange={(e) => updateFeature(key, { end_date: e.target.value || undefined })}
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500">{t('scheduling.hint', 'Leave empty for indefinite availability.')}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t('whitelist.label', 'Whitelist (Optional)')}</Label>
                                            <Input
                                                placeholder={t('whitelist.placeholder', 'e.g. 1, 5, 12')}
                                                value={feature.whitelist?.join(', ') || ''}
                                                onChange={(e) => updateWhitelist(key, e.target.value)}
                                            />
                                            <p className="text-xs text-gray-500">
                                                {t('whitelist.hint', 'Comma-separated User IDs. If set, only these users can access this feature. Leave empty to allow all eligible users.')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {!isEnabled && (
                                    <div className="text-sm text-gray-500 italic">
                                        {t('status.globally_disabled', 'Feature is currently disabled globally.')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

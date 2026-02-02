// /frontend/src/pages/admin/PublicContent.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Layout, Star, HelpCircle, Image as ImageIcon, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import tab components
import ReviewsTab from '../../components/admin/publicContent/ReviewsTab';
import FAQTab from '../../components/admin/publicContent/FAQTab';
import GalleryTab from '../../components/admin/publicContent/GalleryTab';
import BannersTab from '../../components/admin/publicContent/BannersTab';

export default function PublicContent() {
    const { t } = useTranslation('admin/publiccontent');
    const { tab } = useParams<{ tab: string }>();
    const navigate = useNavigate();

    // Синхронизация с URL: если таб в URL есть, используем его, иначе 'reviews'
    const activeTab = tab || 'reviews';

    const handleTabChange = (value: string) => {
        navigate(`/crm/public-content/${value}`);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Layout className="w-6 h-6" />
                    {t('title')}
                </h1>
                <p className="text-gray-600 mt-1">
                    {t('description')}
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="mb-6">
                    <TabsTrigger value="reviews" className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        {t('tabs.reviews')}
                    </TabsTrigger>
                    <TabsTrigger value="faq" className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        {t('tabs.faq')}
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {t('tabs.gallery')}
                    </TabsTrigger>
                    <TabsTrigger value="banners" className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        {t('tabs.banners')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="reviews">
                    <ReviewsTab />
                </TabsContent>

                <TabsContent value="faq">
                    <FAQTab />
                </TabsContent>

                <TabsContent value="gallery">
                    <GalleryTab />
                </TabsContent>

                <TabsContent value="banners">
                    <BannersTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// /frontend/src/pages/admin/PublicContent.tsx
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Layout, Star, HelpCircle, Image as ImageIcon, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Import tab components
import ReviewsTab from '../../components/admin/publicContent/ReviewsTab';
import FAQTab from '../../components/admin/publicContent/FAQTab';
import GalleryTab from '../../components/admin/publicContent/GalleryTab';
import BannersTab from '../../components/admin/publicContent/BannersTab';

export default function PublicContent() {
    const { t } = useTranslation('admin/PublicContent');
    const [activeTab, setActiveTab] = useState('reviews');

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Layout className="w-6 h-6" />
                    {t('title', 'Публичный контент')}
                </h1>
                <p className="text-gray-600 mt-1">
                    {t('description', 'Управление отзывами, FAQ, галереей и баннерами')}
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                    <TabsTrigger value="reviews" className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        {t('tabs.reviews', 'Отзывы')}
                    </TabsTrigger>
                    <TabsTrigger value="faq" className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        {t('tabs.faq', 'FAQ')}
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {t('tabs.gallery', 'Галерея')}
                    </TabsTrigger>
                    <TabsTrigger value="banners" className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        {t('tabs.banners', 'Баннеры')}
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

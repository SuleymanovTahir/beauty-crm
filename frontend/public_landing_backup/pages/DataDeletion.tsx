import React from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const DataDeletion: React.FC = () => {
    const { t } = useTranslation('public_landing');

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <Header />
            <main className="flex-grow pt-32 pb-16 px-4 md:px-8 max-w-4xl mx-auto w-full">
                <h1 className="text-3xl md:text-4xl font-bold mb-8 text-primary">
                    {t('dataDeletion.title', 'Instruction for Data Deletion')}
                </h1>

                <div className="prose prose-lg text-foreground/80">
                    <p className="mb-6">
                        {t('dataDeletion.description', 'If you want to delete your data from our system, please follow these steps:')}
                    </p>

                    <ol className="list-decimal pl-6 space-y-4 mb-8">
                        <li>
                            <strong>{t('dataDeletion.step1.title', 'Send a request')}</strong>:
                            {t('dataDeletion.step1.text', ' Send an email to our support team with the subject "Data Deletion Request".')}
                        </li>
                        <li>
                            <strong>{t('dataDeletion.step2.title', 'Verification')}</strong>:
                            {t('dataDeletion.step2.text', ' Our team will verify your identity to ensure the security of your data.')}
                        </li>
                        <li>
                            <strong>{t('dataDeletion.step3.title', 'Deletion')}</strong>:
                            {t('dataDeletion.step3.text', ' Once verified, we will permanently delete your account and all associated data within 30 days.')}
                        </li>
                    </ol>

                    <div className="bg-muted/30 p-6 rounded-lg border border-border">
                        <h3 className="text-xl font-semibold mb-2">{t('dataDeletion.contact', 'Contact Us')}</h3>
                        <p>Email: <a href="mailto:support@beauty-crm.com" className="text-primary hover:underline">support@beauty-crm.com</a></p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default DataDeletion;

// /frontend/public_landing/pages/DataDeletion.tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DataDeletion() {
    const { t, i18n } = useTranslation(['common', 'public_landing']);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('common:back')}
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-4xl font-bold mb-8 text-[var(--heading)]">
                    {t('data_deletion_title', { defaultValue: 'Удаление данных' })}
                </h1>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
                    <section>
                        <h2 className="text-2xl font-semibold text-[var(--heading)] mb-4">
                            {t('data_deletion_intro_title', { defaultValue: 'Запрос на удаление данных' })}
                        </h2>
                        <p className="text-foreground/80">
                            {t('data_deletion_intro_text', {
                                defaultValue: 'Мы уважаем ваше право на конфиденциальность. Если вы хотите удалить свои данные из нашей системы, пожалуйста, свяжитесь с нами одним из следующих способов:'
                            })}
                        </p>
                    </section>

                    <section className="bg-muted/30 rounded-lg p-6 border border-border">
                        <h3 className="text-xl font-semibold text-[var(--heading)] mb-4">
                            {t('contact_methods', { defaultValue: 'Способы связи' })}
                        </h3>
                        <ul className="space-y-3 text-foreground/80">
                            <li>
                                <strong>{t('email', { defaultValue: 'Email' })}:</strong>{' '}
                                <a href="mailto:mladiamontuae@gmail.com" className="text-primary hover:underline">
                                    mladiamontuae@gmail.com
                                </a>
                            </li>
                            <li>
                                <strong>{t('phone', { defaultValue: 'Телефон' })}:</strong>{' '}
                                <a href="tel:+971526961100" className="text-primary hover:underline">
                                    +971 52 696 1100
                                </a>
                            </li>
                            <li>
                                <strong>{t('instagram', { defaultValue: 'Instagram' })}:</strong>{' '}
                                <a
                                    href="https://www.instagram.com/mlediamant/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                >
                                    @mlediamant
                                </a>
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold text-[var(--heading)] mb-4">
                            {t('data_deletion_process_title', { defaultValue: 'Процесс удаления данных' })}
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-foreground/80">
                            <li>{t('data_deletion_step_1', { defaultValue: 'Отправьте нам запрос на удаление данных' })}</li>
                            <li>{t('data_deletion_step_2', { defaultValue: 'Подтвердите свою личность' })}</li>
                            <li>{t('data_deletion_step_3', { defaultValue: 'Мы обработаем ваш запрос в течение 30 дней' })}</li>
                            <li>{t('data_deletion_step_4', { defaultValue: 'Вы получите подтверждение об удалении данных' })}</li>
                        </ol>
                    </section>

                    <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6 border border-yellow-200 dark:border-yellow-800">
                        <h3 className="text-xl font-semibold text-[var(--heading)] mb-4">
                            {t('important_note', { defaultValue: 'Важное примечание' })}
                        </h3>
                        <p className="text-foreground/80">
                            {t('data_deletion_note', {
                                defaultValue: 'После удаления ваших данных мы не сможем восстановить вашу историю записей, предпочтения и другую информацию. Пожалуйста, убедитесь, что вы действительно хотите удалить все данные перед отправкой запроса.'
                            })}
                        </p>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/40 mt-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-muted-foreground">
                    <p>© 2024 M.Le Diamant Beauty Lounge. {t('all_rights_reserved', { defaultValue: 'Все права защищены.' })}</p>
                </div>
            </footer>
        </div>
    );
}

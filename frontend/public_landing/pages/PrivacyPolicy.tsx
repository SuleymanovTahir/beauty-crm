//new/pages/PrivacyPolicy.tsx
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useTranslation } from "react-i18next";
import '../styles/css/index.css';

export function PrivacyPolicy() {
    const { t } = useTranslation(['public_landing', 'common']);

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

            <Header />

            <main className="pt-24 pb-24 px-6 lg:px-12">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl lg:text-5xl font-bold text-[var(--heading)] mb-4">
                            {t('privacyTitle', { defaultValue: 'ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ' })}
                        </h1>
                        <p className="text-muted-foreground">{t('lastUpdated', { defaultValue: 'Последнее обновление' })}: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="bg-card rounded-3xl p-8 lg:p-12 space-y-8 border border-border shadow-sm">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. {t('privacySection1Title', { defaultValue: 'Общие положения' })}</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                {t('privacySection1Text1', { defaultValue: 'M Le Diamant ("Мы", "Наш", "Салон") уважает вашу конфиденциальность и обязуется защищать ваши персональные данные. Эта политика конфиденциальности объясняет, как мы собираем, используем и защищаем вашу информацию при посещении нашего веб-сайта и использовании наших услуг.' })}
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('privacySection1Text2', { defaultValue: 'Используя наши услуги, вы соглашаетесь с условиями данной политики конфиденциальности.' })}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. {t('privacySection2Title', { defaultValue: 'Информация, которую мы собираем' })}</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                {t('privacySection2Text', { defaultValue: 'Мы можем собирать следующие типы информации:' })}
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                                <li>{t('privacySection2List1', { defaultValue: 'Личная информация: имя, адрес электронной почты, номер телефона' })}</li>
                                <li>{t('privacySection2List2', { defaultValue: 'Информация о бронировании: дата и время визита, выбранные услуги' })}</li>
                                <li>{t('privacySection2List3', { defaultValue: 'Данные об использовании: информация о том, как вы взаимодействуете с нашим сайтом' })}</li>
                                <li>{t('privacySection2List4', { defaultValue: 'Технические данные: IP-адрес, тип браузера, операционная система' })}</li>
                                <li>{t('privacySection2List5', { defaultValue: 'Медицинская информация: аллергии, противопоказания (только с вашего согласия)' })}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. {t('privacySection3Title', { defaultValue: 'Как мы используем вашу информацию' })}</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                {t('privacySection3Text', { defaultValue: 'Мы используем собранную информацию для следующих целей:' })}
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                                <li>{t('privacySection3List1', { defaultValue: 'Обработка и подтверждение бронирований' })}</li>
                                <li>{t('privacySection3List2', { defaultValue: 'Предоставление запрошенных услуг' })}</li>
                                <li>{t('privacySection3List3', { defaultValue: 'Связь с вами по поводу ваших визитов и услуг' })}</li>
                                <li>{t('privacySection3List4', { defaultValue: 'Улучшение качества наших услуг' })}</li>
                                <li>{t('privacySection3List5', { defaultValue: 'Отправка маркетинговых сообщений (только с вашего согласия)' })}</li>
                                <li>{t('privacySection3List6', { defaultValue: 'Соблюдение законодательных требований' })}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. {t('privacySection4Title', { defaultValue: 'Защита данных' })}</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                {t('privacySection4Text', { defaultValue: 'Мы применяем соответствующие технические и организационные меры для защиты ваших персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения. Эти меры включают:' })}
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                                <li>{t('privacySection4List1', { defaultValue: 'Шифрование передаваемых данных' })}</li>
                                <li>{t('privacySection4List2', { defaultValue: 'Безопасное хранение данных' })}</li>
                                <li>{t('privacySection4List3', { defaultValue: 'Ограниченный доступ к персональным данным' })}</li>
                                <li>{t('privacySection4List4', { defaultValue: 'Регулярные проверки безопасности' })}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. {t('privacySection5Title', { defaultValue: 'Передача данных третьим лицам' })}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('privacySection5Text', { defaultValue: 'Мы не продаем и не передаем ваши персональные данные третьим лицам, за исключением случаев, когда это необходимо для предоставления наших услуг (например, партнерам по платежным операциям) или требуется законодательством ОАЭ.' })}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. {t('privacySection6Title', { defaultValue: 'Ваши права' })}</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                {t('privacySection6Text', { defaultValue: 'Вы имеете следующие права в отношении ваших персональных данных:' })}
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                                <li>{t('privacySection6List1', { defaultValue: 'Право на доступ к вашим данным' })}</li>
                                <li>{t('privacySection6List2', { defaultValue: 'Право на исправление неточных данных' })}</li>
                                <li>{t('privacySection6List3', { defaultValue: 'Право на удаление ваших данных' })}</li>
                                <li>{t('privacySection6List4', { defaultValue: 'Право на ограничение обработки' })}</li>
                                <li>{t('privacySection6List5', { defaultValue: 'Право на возражение против обработки' })}</li>
                                <li>{t('privacySection6List6', { defaultValue: 'Право на отзыв согласия' })}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. {t('privacySection7Title', { defaultValue: 'Cookies' })}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('privacySection7Text', { defaultValue: 'Наш веб-сайт использует cookies для улучшения вашего опыта использования. Вы можете управлять настройками cookies через ваш браузер.' })}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. {t('privacySection8Title', { defaultValue: 'Изменения в политике' })}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('privacySection8Text', { defaultValue: 'Мы можем периодически обновлять эту политику конфиденциальности. Обновленная версия будет размещена на этой странице с указанием даты последнего обновления.' })}
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

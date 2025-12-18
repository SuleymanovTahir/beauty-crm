//new/pages/TermsOfUse.tsx
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import '../../styles/theme.css';
import '../../styles/index.css';

export function TermsOfUse() {
    const { t, i18n } = useTranslation(['public_landing', 'common']);
    const [services, setServices] = useState<any[]>([]);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
                const res = await fetch(`${API_URL}/api/public/services?language=${i18n.language}`);
                if (res.ok) {
                    const data = await res.json();
                    setServices(data.slice(0, 10)); // Limit to first 10
                }
            } catch (error) {
                console.error("Failed to fetch services", error);
            }
        };
        fetchServices();
    }, [i18n.language]);

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
                            {t('termsTitle', { defaultValue: 'УСЛОВИЯ ИСПОЛЬЗОВАНИЯ' })}
                        </h1>
                        <p className="text-muted-foreground">{t('lastUpdated', { defaultValue: 'Последнее обновление' })}: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="bg-card rounded-3xl p-8 lg:p-12 space-y-8 border border-border shadow-sm">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. {t('termsSection1Title', { defaultValue: 'Принятие условий' })}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('termsSection1Text', { defaultValue: 'Добро пожаловать на веб-сайт M Le Diamant Beauty Lounge. Используя наш веб-сайт и услуги, вы соглашаетесь соблюдать и быть связанными настоящими Условиями использования. Если вы не согласны с любой частью этих условий, пожалуйста, не используйте наш веб-сайт.' })}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. {t('termsSection2Title', { defaultValue: 'Описание услуг' })}</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                {t('termsSection2Text', { defaultValue: 'M Le Diamant предоставляет услуги салона красоты премиум-класса, включая, но не ограничиваясь:' })}
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                                {services.length > 0 ? (
                                    services.map((service) => (
                                        <li key={service.id}>{service.name_ru || service.name}</li>
                                    ))
                                ) : (
                                    <>
                                        <li>{t('serviceManicure', { defaultValue: 'Маникюр и педикюр' })}</li>
                                        <li>{t('serviceHaircut', { defaultValue: 'Стрижки и укладки волос' })}</li>
                                        <li>{t('serviceColoring', { defaultValue: 'Окрашивание и процедуры для волос' })}</li>
                                        <li>{t('serviceMakeup', { defaultValue: 'Макияж и оформление бровей' })}</li>
                                        <li>{t('serviceSpa', { defaultValue: 'SPA-процедуры и массаж' })}</li>
                                        <li>{t('serviceCosmetology', { defaultValue: 'Косметологические услуги' })}</li>
                                    </>
                                )}
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. {t('termsSection3Title', { defaultValue: 'Бронирование и оплата' })}</h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    <strong className="text-foreground">3.1 {t('booking', { defaultValue: 'Бронирование' })}:</strong> {t('termsSection3Text1', { defaultValue: 'Вы можете забронировать услуги через наш веб-сайт, по телефону или лично в салоне. Все бронирования подлежат подтверждению.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">3.2 {t('deposit', { defaultValue: 'Депозит' })}:</strong> {t('termsSection3Text2', { defaultValue: 'Для некоторых услуг может потребоваться внесение депозита при бронировании.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">3.3 {t('payment', { defaultValue: 'Оплата' })}:</strong> {t('termsSection3Text3', { defaultValue: 'Оплата производится после оказания услуг. Мы принимаем наличные и кредитные карты.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">3.4 {t('prices', { defaultValue: 'Цены' })}:</strong> {t('termsSection3Text4', { defaultValue: 'Все цены указаны в дирхамах ОАЭ (AED). Мы оставляем за собой право изменять цены без предварительного уведомления.' })}
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. {t('termsSection4Title', { defaultValue: 'Отмена и изменение бронирования' })}</h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    <strong className="text-foreground">4.1 {t('cancellation', { defaultValue: 'Отмена клиентом' })}:</strong> {t('termsSection4Text1', { defaultValue: 'Вы можете отменить или изменить бронирование не менее чем за 24 часа до назначенного времени без штрафных санкций.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">4.2 {t('lateCancellation', { defaultValue: 'Поздняя отмена' })}:</strong> {t('termsSection4Text2', { defaultValue: 'При отмене менее чем за 24 часа или неявке на визит, депозит (если был внесен) не возвращается.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">4.3 {t('lateness', { defaultValue: 'Опоздание' })}:</strong> {t('termsSection4Text3', { defaultValue: 'При опоздании более чем на 15 минут мы оставляем за собой право отменить бронирование или сократить время процедуры.' })}
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. {t('termsSection5Title', { defaultValue: 'Поведение клиента' })}</h2>
                            <p className="text-muted-foreground leading-relaxed mb-4">
                                {t('termsSection5Text', { defaultValue: 'Клиенты обязаны:' })}
                            </p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                                <li>{t('termsSection5List1', { defaultValue: 'Соблюдать правила салона и вежливо общаться с персоналом' })}</li>
                                <li>{t('termsSection5List2', { defaultValue: 'Предоставлять точную информацию о состоянии здоровья и аллергиях' })}</li>
                                <li>{t('termsSection5List3', { defaultValue: 'Сообщать о любых противопоказаниях к процедурам' })}</li>
                                <li>{t('termsSection5List4', { defaultValue: 'Бережно относиться к имуществу салона' })}</li>
                                <li>{t('termsSection5List5', { defaultValue: 'Приходить на процедуры в трезвом состоянии' })}</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. {t('termsSection6Title', { defaultValue: 'Ограничение ответственности' })}</h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    <strong className="text-foreground">6.1 {t('medicalInfo', { defaultValue: 'Медицинская информация' })}:</strong> {t('termsSection6Text1', { defaultValue: 'Наши услуги не являются медицинскими. При наличии медицинских показаний проконсультируйтесь с врачом.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">6.2 {t('allergies', { defaultValue: 'Аллергические реакции' })}:</strong> {t('termsSection6Text2', { defaultValue: 'Клиент несет ответственность за предоставление информации о любых аллергиях. Мы не несем ответственности за реакции, о которых не были проинформированы.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">6.3 {t('results', { defaultValue: 'Результаты' })}:</strong> {t('termsSection6Text3', { defaultValue: 'Результаты процедур могут варьироваться в зависимости от индивидуальных особенностей. Мы не гарантируем конкретные результаты.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">6.4 {t('valuables', { defaultValue: 'Ценности' })}:</strong> {t('termsSection6Text4', { defaultValue: 'Мы не несем ответственности за потерю или повреждение личных вещей клиента.' })}
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. {t('termsSection7Title', { defaultValue: 'Подарочные сертификаты' })}</h2>
                            <div className="space-y-4 text-muted-foreground leading-relaxed">
                                <p>
                                    <strong className="text-foreground">7.1 {t('validity', { defaultValue: 'Действительность' })}:</strong> {t('termsSection7Text1', { defaultValue: 'Подарочные сертификаты действительны в течение 12 месяцев с даты покупки.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">7.2 {t('refund', { defaultValue: 'Возврат' })}:</strong> {t('termsSection7Text2', { defaultValue: 'Подарочные сертификаты не подлежат возврату и обмену на денежные средства.' })}
                                </p>
                                <p>
                                    <strong className="text-foreground">7.3 {t('transfer', { defaultValue: 'Передача' })}:</strong> {t('termsSection7Text3', { defaultValue: 'Подарочные сертификаты могут быть переданы другому лицу.' })}
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. {t('termsSection8Title', { defaultValue: 'Интеллектуальная собственность' })}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('termsSection8Text', { defaultValue: 'Все материалы на этом веб-сайте, включая текст, графику, логотипы, изображения и программное обеспечение, являются собственностью M Le Diamant и защищены законами об авторском праве и товарных знаках ОАЭ.' })}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4 text-foreground">9. {t('termsSection9Title', { defaultValue: 'Изменения в условиях' })}</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                {t('termsSection9Text', { defaultValue: 'M Le Diamant оставляет за собой право изменять эти Условия использования в любое время. Изменения вступают в силу с момента их публикации на веб-сайте.' })}
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

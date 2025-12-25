// /frontend/public_landing/pages/public_landing__PrivacyPolicy.tsx
import { Header } from "../components/Header";
import "../styles/public_landing_globals.css";
import "../public_landing.css";
import { Footer } from "../components/Footer";
// import logoImage from "../assets/main_banner.webp";
import { useState, useEffect } from "react";
import { apiClient } from "../../src/api/client";
import { useTranslation } from "react-i18next";

export function PrivacyPolicy() {
  const { t } = useTranslation(['public_landing', 'common']);
  const [salonInfo, setSalonInfo] = useState<any>({});

  useEffect(() => {
    apiClient.getSalonInfo()
      .then(setSalonInfo)
      .catch(err => console.error('Error loading salon info:', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f3f0]">
      <Header salonInfo={salonInfo} />

      <main className="pt-32 pb-24 px-6 lg:px-12">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            {/* <img src={logoImage} alt="M Le Diamant" className="h-20 mx-auto mb-8" /> */}
            <h1 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-4">
              {t('privacyTitle') || "ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ"}
            </h1>
            <p className="text-[#6b6b6b]">{t('lastUpdated') || "Последнее обновление"}: 26.11.2025</p>
          </div>

          <div className="bg-white rounded-3xl p-8 lg:p-12 space-y-8">
            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">1. {t('privacySection1Title') || "Общие положения"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('privacySection1Text1') || "M Le Diamant Beauty Lounge (\"Мы\", \"Наш\", \"Салон\") уважает вашу конфиденциальность и обязуется защищать ваши персональные данные. Эта политика конфиденциальности объясняет, как мы собираем, используем и защищаем вашу информацию при посещении нашего веб-сайта и использовании наших услуг."}
              </p>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('privacySection1Text2') || "Используя наши услуги, вы соглашаетесь с условиями данной политики конфиденциальности."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">2. {t('privacySection2Title') || "Информация, которую мы собираем"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('privacySection2Text') || "Мы можем собирать следующие типы информации:"}
              </p>
              <ul className="list-disc list-inside text-[#6b6b6b] space-y-2 ml-4">
                <li>{t('privacySection2List1') || "Личная информация: имя, адрес электронной почты, номер телефона"}</li>
                <li>{t('privacySection2List2') || "Информация о бронировании: дата и время визита, выбранные услуги"}</li>
                <li>{t('privacySection2List3') || "Данные об использовании: информация о том, как вы взаимодействуете с нашим сайтом"}</li>
                <li>{t('privacySection2List4') || "Технические данные: IP-адрес, тип браузера, операционная система"}</li>
                <li>{t('privacySection2List5') || "Медицинская информация: аллергии, противопоказания (только с вашего согласия)"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">3. {t('privacySection3Title') || "Как мы используем вашу информацию"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('privacySection3Text') || "Мы используем собранную информацию для следующих целей:"}
              </p>
              <ul className="list-disc list-inside text-[#6b6b6b] space-y-2 ml-4">
                <li>{t('privacySection3List1') || "Обработка и подтверждение бронирований"}</li>
                <li>{t('privacySection3List2') || "Предоставление запрошенных услуг"}</li>
                <li>{t('privacySection3List3') || "Связь с вами по поводу ваших визитов и услуг"}</li>
                <li>{t('privacySection3List4') || "Улучшение качества наших услуг"}</li>
                <li>{t('privacySection3List5') || "Отправка маркетинговых сообщений (только с вашего согласия)"}</li>
                <li>{t('privacySection3List6') || "Соблюдение законодательных требований"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">4. {t('privacySection4Title') || "Защита данных"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('privacySection4Text') || "Мы применяем соответствующие технические и организационные меры для защиты ваших персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения. Эти меры включают:"}
              </p>
              <ul className="list-disc list-inside text-[#6b6b6b] space-y-2 ml-4">
                <li>{t('privacySection4List1') || "Шифрование передаваемых данных"}</li>
                <li>{t('privacySection4List2') || "Безопасное хранение данных"}</li>
                <li>{t('privacySection4List3') || "Ограниченный доступ к персональным данным"}</li>
                <li>{t('privacySection4List4') || "Регулярные проверки безопасности"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">5. {t('privacySection5Title') || "Передача данных третьим лицам"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('privacySection5Text') || "Мы не продаем и не передаем ваши персональные данные третьим лицам, за исключением случаев, когда это необходимо для предоставления наших услуг (например, партнерам по платежным операциям) или требуется законодательством ОАЭ."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">6. {t('privacySection6Title') || "Ваши права"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('privacySection6Text') || "Вы имеете следующие права в отношении ваших персональных данных:"}
              </p>
              <ul className="list-disc list-inside text-[#6b6b6b] space-y-2 ml-4">
                <li>{t('privacySection6List1') || "Право на доступ к вашим данным"}</li>
                <li>{t('privacySection6List2') || "Право на исправление неточных данных"}</li>
                <li>{t('privacySection6List3') || "Право на удаление ваших данных"}</li>
                <li>{t('privacySection6List4') || "Право на ограничение обработки"}</li>
                <li>{t('privacySection6List5') || "Право на возражение против обработки"}</li>
                <li>{t('privacySection6List6') || "Право на отзыв согласия"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">7. {t('privacySection7Title') || "Cookies"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('privacySection7Text') || "Наш веб-сайт использует cookies для улучшения вашего опыта использования. Вы можете управлять настройками cookies через ваш браузер."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">8. {t('privacySection8Title') || "Изменения в политике"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('privacySection8Text') || "Мы можем периодически обновлять эту политику конфиденциальности. Обновленная версия будет размещена на этой странице с указанием даты последнего обновления."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">9. {t('contactInfo') || "Контактная информация"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('privacyContactText') || "Если у вас есть вопросы о нашей политике конфиденциальности или вы хотите воспользоваться своими правами, пожалуйста, свяжитесь с нами:"}
              </p>
              <div className="bg-[#f5f3f0] rounded-2xl p-6">
                <p className="text-[#2d2d2d] mb-2">{salonInfo?.name || 'M Le Diamant Beauty Lounge'}</p>
                <p className="text-[#6b6b6b]">{salonInfo?.address || 'Business Bay, Dubai Marina, Internet City, DIFC'}</p>
                <p className="text-[#6b6b6b]">{salonInfo?.city || 'Dubai'}, {salonInfo?.country || 'UAE'}</p>
                <p className="text-[#6b6b6b] mt-4">{t('phone') || "Телефон"}: <a href={`tel:${salonInfo?.phone || '+971542478604'} `} className="text-[#b8a574] hover:underline">{salonInfo?.phone || '+971 54 247 8604'}</a></p>
                <p className="text-[#6b6b6b]">Email: <a href={`mailto:${salonInfo?.email || 'privacy@mlediamant.ae'} `} className="text-[#b8a574] hover:underline">{salonInfo?.email || 'privacy@mlediamant.ae'}</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer salonInfo={salonInfo} />
    </div>
  );
}

// /frontend/public_landing/pages/public_landing__TermsOfUse.tsx
import { Header } from "../components/Header";
import "../styles/public_landing_globals.css";
import "../public_landing.css";
import { Footer } from "../components/Footer";
import logoImage from "../../public_landing/assets/c35944ec2655ccc8750b237ba9f12712e579cbcc.png";
import { useState, useEffect } from "react";
import { apiClient } from "../../src/api/client";
import { useLanguage } from "../LanguageContext";

export function TermsOfUse() {
  const { t } = useLanguage();
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
            <img src={logoImage} alt="M Le Diamant" className="h-20 mx-auto mb-8" />
            <h1 className="text-4xl lg:text-5xl text-[#2d2d2d] mb-4">
              {t('termsTitle') || "УСЛОВИЯ ИСПОЛЬЗОВАНИЯ"}
            </h1>
            <p className="text-[#6b6b6b]">{t('lastUpdated') || "Последнее обновление"}: 26.11.2025</p>
          </div>

          <div className="bg-white rounded-3xl p-8 lg:p-12 space-y-8">
            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">1. {t('termsSection1Title') || "Принятие условий"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('termsSection1Text') || "Добро пожаловать на веб-сайт M Le Diamant Beauty Lounge. Используя наш веб-сайт и услуги, вы соглашаетесь соблюдать и быть связанными настоящими Условиями использования. Если вы не согласны с любой частью этих условий, пожалуйста, не используйте наш веб-сайт."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">2. {t('termsSection2Title') || "Описание услуг"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('termsSection2Text') || "M Le Diamant предоставляет услуги салона красоты премиум-класса, включая, но не ограничиваясь:"}
              </p>
              <ul className="list-disc list-inside text-[#6b6b6b] space-y-2 ml-4">
                <li>{t('serviceManicure') || "Маникюр и педикюр"}</li>
                <li>{t('serviceHaircut') || "Стрижки и укладки волос"}</li>
                <li>{t('serviceColoring') || "Окрашивание и процедуры для волос"}</li>
                <li>{t('serviceMakeup') || "Макияж и оформление бровей"}</li>
                <li>{t('serviceSpa') || "SPA-процедуры и массаж"}</li>
                <li>{t('serviceCosmetology') || "Косметологические услуги"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">3. {t('termsSection3Title') || "Бронирование и оплата"}</h2>
              <div className="space-y-4 text-[#6b6b6b] leading-relaxed">
                <p>
                  <strong className="text-[#2d2d2d]">3.1 {t('booking') || "Бронирование"}:</strong> {t('termsSection3Text1') || "Вы можете забронировать услуги через наш веб-сайт, по телефону или лично в салоне. Все бронирования подлежат подтверждению."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">3.2 {t('deposit') || "Депозит"}:</strong> {t('termsSection3Text2') || "Для некоторых услуг может потребоваться внесение депозита при бронировании."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">3.3 {t('payment') || "Оплата"}:</strong> {t('termsSection3Text3') || "Оплата производится после оказания услуг. Мы принимаем наличные и кредитные карты."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">3.4 {t('prices') || "Цены"}:</strong> {t('termsSection3Text4') || "Все цены указаны в дирхамах ОАЭ (AED). Мы оставляем за собой право изменять цены без предварительного уведомления."}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">4. {t('termsSection4Title') || "Отмена и изменение бронирования"}</h2>
              <div className="space-y-4 text-[#6b6b6b] leading-relaxed">
                <p>
                  <strong className="text-[#2d2d2d]">4.1 {t('cancellation') || "Отмена клиентом"}:</strong> {t('termsSection4Text1') || "Вы можете отменить или изменить бронирование не менее чем за 24 часа до назначенного времени без штрафных санкций."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">4.2 {t('lateCancellation') || "Поздняя отмена"}:</strong> {t('termsSection4Text2') || "При отмене менее чем за 24 часа или неявке на визит, депозит (если был внесен) не возвращается."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">4.3 {t('lateness') || "Опоздание"}:</strong> {t('termsSection4Text3') || "При опоздании более чем на 15 минут мы оставляем за собой право отменить бронирование или сократить время процедуры."}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">5. {t('termsSection5Title') || "Поведение клиента"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('termsSection5Text') || "Клиенты обязаны:"}
              </p>
              <ul className="list-disc list-inside text-[#6b6b6b] space-y-2 ml-4">
                <li>{t('termsSection5List1') || "Соблюдать правила салона и вежливо общаться с персоналом"}</li>
                <li>{t('termsSection5List2') || "Предоставлять точную информацию о состоянии здоровья и аллергиях"}</li>
                <li>{t('termsSection5List3') || "Сообщать о любых противопоказаниях к процедурам"}</li>
                <li>{t('termsSection5List4') || "Бережно относиться к имуществу салона"}</li>
                <li>{t('termsSection5List5') || "Приходить на процедуры в трезвом состоянии"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">6. {t('termsSection6Title') || "Ограничение ответственности"}</h2>
              <div className="space-y-4 text-[#6b6b6b] leading-relaxed">
                <p>
                  <strong className="text-[#2d2d2d]">6.1 {t('medicalInfo') || "Медицинская информация"}:</strong> {t('termsSection6Text1') || "Наши услуги не являются медицинскими. При наличии медицинских показаний проконсультируйтесь с врачом."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">6.2 {t('allergies') || "Аллергические реакции"}:</strong> {t('termsSection6Text2') || "Клиент несет ответственность за предоставление информации о любых аллергиях. Мы не несем ответственности за реакции, о которых не были проинформированы."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">6.3 {t('results') || "Результаты"}:</strong> {t('termsSection6Text3') || "Результаты процедур могут варьироваться в зависимости от индивидуальных особенностей. Мы не гарантируем конкретные результаты."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">6.4 {t('valuables') || "Ценности"}:</strong> {t('termsSection6Text4') || "Мы не несем ответственности за потерю или повреждение личных вещей клиента."}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">7. {t('termsSection7Title') || "Подарочные сертификаты"}</h2>
              <div className="space-y-4 text-[#6b6b6b] leading-relaxed">
                <p>
                  <strong className="text-[#2d2d2d]">7.1 {t('validity') || "Действительность"}:</strong> {t('termsSection7Text1') || "Подарочные сертификаты действительны в течение 12 месяцев с даты покупки."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">7.2 {t('refund') || "Возврат"}:</strong> {t('termsSection7Text2') || "Подарочные сертификаты не подлежат возврату и обмену на денежные средства."}
                </p>
                <p>
                  <strong className="text-[#2d2d2d]">7.3 {t('transfer') || "Передача"}:</strong> {t('termsSection7Text3') || "Подарочные сертификаты могут быть переданы другому лицу."}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">8. {t('termsSection8Title') || "Интеллектуальная собственность"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('termsSection8Text') || "Все материалы на этом веб-сайте, включая текст, графику, логотипы, изображения и программное обеспечение, являются собственностью M Le Diamant и защищены законами об авторском праве и товарных знаках ОАЭ."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">9. {t('termsSection9Title') || "Изменения в условиях"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('termsSection9Text') || "M Le Diamant оставляет за собой право изменять эти Условия использования в любое время. Изменения вступают в силу с момента их публикации на веб-сайте."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">10. {t('termsSection10Title') || "Применимое право"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed">
                {t('termsSection10Text') || "Настоящие Условия использования регулируются и толкуются в соответствии с законодательством Объединенных Арабских Эмиратов."}
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-[#2d2d2d] mb-4">11. {t('contactInfo') || "Контактная информация"}</h2>
              <p className="text-[#6b6b6b] leading-relaxed mb-4">
                {t('termsContactText') || "Если у вас есть вопросы об этих Условиях использования, пожалуйста, свяжитесь с нами:"}
              </p>
              <div className="bg-[#f5f3f0] rounded-2xl p-6">
                <p className="text-[#2d2d2d] mb-2">{salonInfo?.name || 'M Le Diamant Beauty Lounge'}</p>
                <p className="text-[#6b6b6b]">{salonInfo?.address || 'Business Bay, Dubai Marina, Internet City, DIFC'}</p>
                <p className="text-[#6b6b6b]">{salonInfo?.city || 'Dubai'}, {salonInfo?.country || 'UAE'}</p>
                <p className="text-[#6b6b6b] mt-4">{t('phone') || "Телефон"}: <a href={`tel:${salonInfo?.phone || '+971542478604'}`} className="text-[#b8a574] hover:underline">{salonInfo?.phone || '+971 54 247 8604'}</a></p>
                <p className="text-[#6b6b6b]">Email: <a href={`mailto:${salonInfo?.email || 'info@mlediamant.ae'}`} className="text-[#b8a574] hover:underline">{salonInfo?.email || 'info@mlediamant.ae'}</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer salonInfo={salonInfo} />
    </div>
  );
}

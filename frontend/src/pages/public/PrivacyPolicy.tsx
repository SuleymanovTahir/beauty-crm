import React from 'react';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-4xl text-gray-900">Политика конфиденциальности</h1>
          </div>

          <div className="prose prose-purple max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl text-gray-900 mb-4">1. Введение</h2>
              <p>
                Luxury Beauty Salon серьезно относится к защите вашей конфиденциальности. Данная Политика
                конфиденциальности описывает, какую информацию мы собираем, как мы ее используем и защищаем.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">2. Собираемая информация</h2>
              <p>Мы можем собирать следующую информацию:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Имя и контактную информацию (телефон, email)</li>
                <li>История посещений и оказанных услуг</li>
                <li>Предпочтения в услугах и процедурах</li>
                <li>Информацию о медицинских противопоказаниях (с вашего согласия)</li>
                <li>Фотографии результатов работы (только с вашего письменного согласия)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">3. Использование информации</h2>
              <p>Мы используем собранную информацию для:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Организации и подтверждения ваших записей</li>
                <li>Предоставления качественных услуг с учетом ваших особенностей</li>
                <li>Отправки напоминаний о записях</li>
                <li>Информирования о новых услугах и специальных предложениях (с вашего согласия)</li>
                <li>Улучшения качества наших услуг</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">4. Защита данных</h2>
              <p>
                Мы принимаем все необходимые меры для защиты ваших персональных данных от несанкционированного
                доступа, изменения, раскрытия или уничтожения.
              </p>
              <p className="mt-3">
                Доступ к вашим данным имеют только уполномоченные сотрудники, которые обязаны соблюдать
                конфиденциальность.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">5. Передача данных третьим лицам</h2>
              <p>
                Мы не продаем, не обмениваем и не передаем вашу личную информацию третьим лицам без вашего
                явного согласия, за исключением случаев, предусмотренных законодательством.
              </p>
              <p className="mt-3">
                Мы можем передавать обезличенную статистическую информацию нашим партнерам для улучшения
                качества услуг.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">6. Cookies и технологии отслеживания</h2>
              <p>
                Наш веб-сайт может использовать файлы cookie для улучшения пользовательского опыта.
                Вы можете отключить cookies в настройках вашего браузера.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">7. Ваши права</h2>
              <p>Вы имеете право:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Запросить доступ к вашим персональным данным</li>
                <li>Запросить исправление неточных данных</li>
                <li>Запросить удаление ваших данных</li>
                <li>Отозвать согласие на обработку данных в любое время</li>
                <li>Отказаться от получения рекламных рассылок</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">8. Хранение данных</h2>
              <p>
                Мы храним ваши персональные данные только в течение времени, необходимого для целей,
                указанных в данной Политике, или в соответствии с требованиями законодательства.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">9. Изменения в Политике</h2>
              <p>
                Мы оставляем за собой право обновлять данную Политику конфиденциальности. Обновления
                будут опубликованы на этой странице с указанием даты последнего изменения.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">10. Контакты</h2>
              <p>
                По вопросам, касающимся данной Политики конфиденциальности, вы можете связаться с нами:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Телефон: +971 50 123 4567</li>
                <li>Email: privacy@luxurybeauty.ae</li>
                <li>Адрес: Dubai, UAE</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>Дата последнего обновления: 19 октября 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}
